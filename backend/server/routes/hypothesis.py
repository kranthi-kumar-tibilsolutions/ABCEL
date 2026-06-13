import json
import math
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from lib.stats import one_sample_z_test, mean, std_dev
from lib.llm   import call_llm_json

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"
_SAMPLE  = _DATA / "sample"


def _read(f: str) -> list:
    for base in (_DATA, _SAMPLE):
        try:
            return json.loads((base / f).read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


# Map LLM-extracted variable names → flat field names in responses.json (DATA_REALITY_UPDATE §8)
VARIABLE_MAP = {
    "engagement":             "engagement",
    "leadership":             "leadership",
    "performance culture":    "performance_culture",
    "development":            "development_and_career",
    "development and career": "development_and_career",
    "manager effectiveness":  "manager_effectiveness",
    "onboarding":             "onboarding",
    "overall":                "overall",
}


# ── Request models ────────────────────────────────────────────────────────────

class TestRequest(BaseModel):
    hypothesis_text: str
    filters:         dict  = {}
    alpha:           float = 0.05


# ── POST /api/hypothesis/test ─────────────────────────────────────────────────

@router.post("/test")
async def run_test(req: TestRequest):
    try:
        units     = _read("responses.json")
        questions = _read("questions.json")

        # ── Step 1: LLM parses hypothesis → structured test parameters ──
        q_list = ", ".join(
            f"{q.get('id')}: {q.get('short_label', q.get('id'))}"
            for q in questions
        )
        parse_prompt = f"""You are a statistical analysis engine for HR survey data.
Parse this hypothesis into structured test parameters.

Available survey fields: {q_list}
Available demographic fields: business, generation, gender, job_level, tenure, country, is_manager, abglp

Hypothesis: "{req.hypothesis_text}"

Return ONLY a JSON object — no explanation, no markdown:
{{
  "h0": "<null hypothesis text>",
  "h1": "<alternative hypothesis text>",
  "test_type": "one_sample_z",
  "variable": "<field name to measure>",
  "group_filter": {{ "dimension": "<field>", "operator": "eq|gte|lte", "value": "<val>" }},
  "hypothesized_mean": <number or null>,
  "threshold": <number or null>,
  "direction": "greater" | "less" | "two_tailed",
  "parseable": true,
  "parse_error": null
}}"""

        try:
            params = await call_llm_json([{"role": "user", "content": parse_prompt}], 400)
        except Exception as e:
            return {
                "success":    False,
                "error":      f"LLM parse failed: {e}",
                "suggestion": 'Try: "Employees who rate Career Growth high have higher Engagement scores than average."',
            }

        if not params.get("parseable"):
            return {
                "success":    False,
                "error":      params.get("parse_error") or "Could not parse hypothesis",
                "suggestion": 'Try: "Employees who rate X high have higher Y scores than those who rate it low."',
            }

        # ── Step 2: Run z-test on real data ──
        test_group = list(units)

        # Apply LLM-extracted group filter
        gf = params.get("group_filter")
        if gf:
            dim  = gf.get("dimension")
            op   = gf.get("operator")
            fval = gf.get("value")
            def _gf_match(u, _dim=dim, _op=op, _fval=fval) -> bool:
                val = u.get(_dim)
                if _op == "eq":  return str(val) == str(_fval)
                if _op == "gte":
                    try: return float(val) >= float(_fval)
                    except: return False
                if _op == "lte":
                    try: return float(val) <= float(_fval)
                    except: return False
                return True
            test_group = [u for u in test_group if _gf_match(u)]

        # Apply demographic filters from request body
        f = req.filters
        if f.get("business")   and f["business"]   != "All": test_group = [u for u in test_group if u.get("business")   == f["business"]]
        if f.get("generation") and f["generation"] != "All": test_group = [u for u in test_group if u.get("generation") == f["generation"]]
        if f.get("gender")     and f["gender"]     != "All": test_group = [u for u in test_group if u.get("gender")     == f["gender"]]
        if f.get("job_level")  and f["job_level"]  != "All": test_group = [u for u in test_group if u.get("job_level")  == f["job_level"]]
        if f.get("tenure")     and f["tenure"]     != "All": test_group = [u for u in test_group if u.get("tenure")     == f["tenure"]]

        # Map variable name → real field key (DATA_REALITY_UPDATE §8)
        raw_key   = (params.get("variable") or "").lower().strip()
        score_key = VARIABLE_MAP.get(raw_key) or raw_key.replace(" ", "_")

        # Score access: nested scores first, then flat field, then overall (20.5)
        scores = [
            v for u in test_group
            if (v := (
                (u.get("scores") or {}).get(params.get("variable")) or
                u.get(score_key) or
                u.get("overall") or
                0
            )) > 0
        ]

        sample_mean = mean(scores)
        sample_std  = std_dev(scores)
        n           = len(scores)
        pop_mean    = params.get("hypothesized_mean") or params.get("threshold") or 3.5

        if n < 30:
            return {
                "success": False,
                "error":   f"Sample too small (n={n}). Need at least 30 responses to run a valid z-test.",
            }

        z_result = one_sample_z_test(sample_mean, pop_mean, sample_std, n)

        # verdict: validated / rejected / inconclusive
        significant = z_result["significant"]
        direction   = params.get("direction")
        verdict_bool = (
            (z_result["z"] < 0 if direction == "less" else z_result["z"] > 0)
            if significant else False
        )
        verdict = "validated" if verdict_bool else ("rejected" if significant else "inconclusive")

        p_value = z_result["p_two_tailed"] if direction == "two_tailed" else z_result["p_one_tailed"]
        critical_z = 1.645 if req.alpha == 0.05 else 2.326

        result = {
            "verdict":      verdict,
            "z":            z_result["z"],
            "p_value":      p_value,
            "critical_z":   critical_z,
            "alpha":        req.alpha,
            "decision":     z_result["decision"],
            "sample_mean":  round(sample_mean, 2),
            "pop_mean":     pop_mean,
            "std_dev":      round(sample_std, 2),
            "n":            n,
            "h0":           params.get("h0"),
            "h1":           params.get("h1"),
            "test_type":    f"One-tailed Z-Test ({'Less than' if direction == 'less' else 'Greater than'})",
            "curve_data": {
                "z_stat":     z_result["z"],
                "critical_z": critical_z,
                "p_value":    p_value,
            },
            "working": {
                "formula":    "Z = (X̄ − μ₀) / (σ / √n)",
                "x_bar":      round(sample_mean, 2),
                "mu_0":       pop_mean,
                "sigma":      round(sample_std, 2),
                "sqrt_n":     round(math.sqrt(n), 3),
                "se":         round(sample_std / math.sqrt(n), 3),
                "numerator":  round(sample_mean - pop_mean, 2),
                "z_computed": z_result["z"],
            },
        }

        # ── Step 3: LLM plain English interpretation ──
        try:
            interp_prompt = f"""You are an HR analytics expert. Write a 1-sentence plain English interpretation of this z-test result for an HR director.

p(z) = {result['p_value']}, alpha = {req.alpha}, verdict = {verdict}, z = {result['z']}
Hypothesis: "{req.hypothesis_text}"

Return ONLY a JSON object: {{ "interpretation": "<one sentence>" }}"""

            interp_data = await call_llm_json([{"role": "user", "content": interp_prompt}], 150)
            result["interpretation"] = interp_data.get("interpretation") or ""
        except Exception:
            if verdict == "validated":
                pfx = "The data supports"
            elif verdict == "rejected":
                pfx = "The data does not support"
            else:
                pfx = "The evidence is inconclusive for"
            result["interpretation"] = f"{pfx} the hypothesis (z = {result['z']}, p = {result['p_value']})."

        # ── Step 4: Save to hypothesis history — timestamp ID (18.11) ──
        history_path = _DATA / "hypotheses.json"
        history: list = []
        try:
            history = json.loads(history_path.read_text(encoding="utf-8"))
        except Exception:
            pass

        now = datetime.now()
        history.insert(0, {
            "id":              f"H-{int(time.time() * 1000)}",
            "hypothesis":      req.hypothesis_text,
            "result":          result["verdict"],
            "z":               result["z"],
            "p_value":         result["p_value"],
            "alpha":           req.alpha,
            "filters_applied": req.filters,
            "date_tested":     f"{now.strftime('%b')} {now.day}, {now.year}",
            "params":          params,
        })
        history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")

        return {"success": True, "result": result}

    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/hypothesis/templates ─────────────────────────────────────────────

@router.get("/templates")
async def get_templates():
    return {
        "templates": [
            {"id": "T-001", "text": "Employees who rate Career Growth Opportunities high (score >= 4) have higher Engagement scores than the group average."},
            {"id": "T-002", "text": "People Managers (is_manager = Yes) have higher trust in Leadership than individual contributors."},
            {"id": "T-003", "text": "Gen Z employees have higher Onboarding scores than the company average."},
            {"id": "T-004", "text": "New Joiners (0-2 years tenure) have lower Performance Culture scores than employees with 5+ years."},
            {"id": "T-005", "text": "Female employees rate Manager Effectiveness higher than the group average."},
        ]
    }


# ── GET /api/hypothesis/history ───────────────────────────────────────────────

@router.get("/history")
async def get_history(
    limit:  int = Query(20),
    offset: int = Query(0),
):
    try:
        history: list = []
        try:
            history = json.loads((_DATA / "hypotheses.json").read_text(encoding="utf-8"))
        except Exception:
            pass
        return {"total": len(history), "items": history[offset: offset + limit]}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/hypothesis/history/{id} ─────────────────────────────────────────

@router.get("/history/{item_id}")
async def get_history_item(item_id: str):
    try:
        history: list = []
        try:
            history = json.loads((_DATA / "hypotheses.json").read_text(encoding="utf-8"))
        except Exception:
            pass
        item = next((h for h in history if h.get("id") == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Hypothesis not found")
        return item
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── DELETE /api/hypothesis/history/{id} ──────────────────────────────────────

@router.delete("/history/{item_id}")
async def delete_history_item(item_id: str):
    try:
        history_path = _DATA / "hypotheses.json"
        history: list = []
        try:
            history = json.loads(history_path.read_text(encoding="utf-8"))
        except Exception:
            pass
        history = [h for h in history if h.get("id") != item_id]
        history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")
        return {"success": True}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
