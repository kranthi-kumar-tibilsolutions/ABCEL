import json
import math
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from lib.stats import (
    pearson_r, pearson_p_value, correlation_strength,
    one_sample_z_test, two_sample_z_test,
    mean, std_dev,
)
from lib.llm   import call_llm_json
from lib.cache import load_responses

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"
_SAMPLE  = _DATA / "sample"


# ── Data helpers ──────────────────────────────────────────────────────────────

def _read(f: str) -> list:
    for base in (_DATA, _SAMPLE):
        try:
            return json.loads((base / f).read_text(encoding="utf-8"))
        except Exception:
            pass
    return []

def _read_dict(f: str) -> dict:
    for base in (_DATA, _SAMPLE):
        try:
            return json.loads((base / f).read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


# ── Constants ─────────────────────────────────────────────────────────────────

THEME_FIELDS = [
    "engagement", "leadership", "performance_culture",
    "development_and_career", "manager_effectiveness", "onboarding", "overall",
]
THEME_LABELS = {
    "engagement":              "Engagement",
    "leadership":              "Leadership",
    "performance_culture":     "Performance Culture",
    "development_and_career":  "Career Development",
    "manager_effectiveness":   "Manager Effectiveness",
    "onboarding":              "Onboarding",
    "overall":                 "Overall",
}
THEME_KEYWORDS = {
    "engagement":             ["engagement", "engaged"],
    "leadership":             ["leadership", "leader", "trust in leadership"],
    "performance_culture":    ["performance culture", "performance"],
    "development_and_career": ["career development", "career growth", "development", "career"],
    "manager_effectiveness":  ["manager effectiveness", "manager", "management effectiveness"],
    "onboarding":             ["onboarding", "new hire"],
    "overall":                ["overall score", "overall engagement", "overall"],
}

DEMOGRAPHIC_FIELDS = {
    "generation":  ["Gen Z", "Gen Y", "Gen X", "Baby Boomer"],
    "gender":      ["Male", "Female"],
    "is_manager":  ["Yes", "No"],
    "job_level":   ["Staff", "Junior Management", "Middle Management", "Senior Management", "Top Management"],
    "tenure":      ["0-2", "2-5", "5-10", "10-15", "15-20", "20-25", ">25 (Equal or more than 25)"],
    "abglp":       ["Yes", "No"],
    "country":     [],
    "business":    [],
    "age_group":   [],
}


# ── Statistical helpers ───────────────────────────────────────────────────────

def _bu_theme_means(responses: list, field: str) -> dict:
    """Per-business-unit average for a theme score field."""
    bu_data: dict = defaultdict(list)
    for r in responses:
        bu = r.get("business")
        v  = r.get(field)
        if bu and v and float(v) > 0:
            bu_data[bu].append(float(v))
    return {bu: round(mean(vs), 4) for bu, vs in bu_data.items() if vs}


def _infer_theme_from_text(text: str) -> Optional[dict]:
    """
    Backstop for when the LLM fails to populate outcome/x_var/y_var:
    scan the raw hypothesis text for a known theme keyword and build the
    same {source, field, label, confidence} shape the LLM would return.
    """
    lowered = text.lower()
    for field, keywords in THEME_KEYWORDS.items():
        for kw in sorted(keywords, key=len, reverse=True):
            if kw in lowered:
                return {
                    "source": "theme", "field": field, "question_id": None,
                    "label": THEME_LABELS.get(field, field), "confidence": 0.5,
                }
    return None


def _scores_for_var(var: dict, responses: list, q_bu: dict) -> dict:
    """
    Return {bu_name: avg_score} for a variable mapping.
    Handles both theme-level and question-level variables at BU granularity.
    """
    source = var.get("source", "theme")
    if source == "question":
        qid = var.get("question_id")
        if qid:
            return q_bu.get(qid, {})
    field = var.get("field", "")
    if field in THEME_FIELDS:
        return _bu_theme_means(responses, field)
    return {}


def _filter_responses(responses: list, field: str, value: str) -> list:
    return [r for r in responses if str(r.get(field, "")).strip() == str(value).strip()]


def _get_scores(responses: list, field: str) -> list:
    """Extract numeric scores for a theme field from a response list."""
    out = []
    for r in responses:
        v = r.get(field)
        try:
            f = float(v)
            if f > 0:
                out.append(f)
        except (TypeError, ValueError):
            pass
    return out


# ── Test runners ──────────────────────────────────────────────────────────────

def _run_pearson(parsed: dict, responses: list, q_bu: dict) -> dict:
    x_var = parsed.get("x_var") or {}
    y_var = parsed.get("y_var") or {}

    x_scores = _scores_for_var(x_var, responses, q_bu)
    y_scores = _scores_for_var(y_var, responses, q_bu)

    common = sorted(set(x_scores) & set(y_scores))
    xs = [x_scores[bu] for bu in common]
    ys = [y_scores[bu] for bu in common]
    n  = len(xs)

    if n < 3:
        return {"error": f"Insufficient shared data points for correlation (n={n}, need ≥ 3)."}

    r = pearson_r(xs, ys)
    p = pearson_p_value(r, n)
    sig = p < 0.05

    if sig:
        verdict = "validated" if (r > 0 and parsed.get("direction") != "less") or \
                                  (r < 0 and parsed.get("direction") == "less") else "rejected"
    else:
        verdict = "inconclusive"

    return {
        "test_type":   "pearson_correlation",
        "r":           r,
        "p_value":     p,
        "n":           n,
        "significant": sig,
        "strength":    correlation_strength(r),
        "direction_found": "positive" if r > 0 else "negative",
        "verdict":     verdict,
        "interpretation": "",          # filled by LLM
        "bu_pairs": [
            {"bu": bu, "x": round(xs[i], 3), "y": round(ys[i], 3)}
            for i, bu in enumerate(common)
        ],
        "working": {
            "formula": "r = Σ[(xᵢ−x̄)(yᵢ−ȳ)] / √[Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)²]",
            "n": n,
            "x_mean": round(mean(xs), 3),
            "y_mean": round(mean(ys), 3),
        },
    }


def _run_two_sample_z(parsed: dict, responses: list, hypothesis_text: str = "") -> dict:
    ga      = parsed.get("group_a") or {}
    gb      = parsed.get("group_b") or {}
    # The LLM sometimes puts the outcome mapping under "y_var" or "x_var"
    # (the relationship-test fields) instead of "outcome", or omits it
    # entirely — fall back to whichever is populated, then to a keyword
    # match against the original hypothesis text as a last resort.
    outcome = (
        parsed.get("outcome") or parsed.get("y_var") or parsed.get("x_var")
        or _infer_theme_from_text(hypothesis_text) or {}
    )

    a_field, a_val = ga.get("field"), ga.get("value")
    b_field, b_val = gb.get("field"), gb.get("value")
    out_field = outcome.get("field")

    if not (a_field and out_field):
        return {"error": "Missing group or outcome mapping."}

    rows_a = _filter_responses(responses, a_field, a_val)
    if b_val:
        rows_b = _filter_responses(responses, b_field or a_field, b_val)
    else:
        rows_b = [r for r in responses if str(r.get(a_field, "")).strip() != str(a_val).strip()]

    scores_a = _get_scores(rows_a, out_field)
    scores_b = _get_scores(rows_b, out_field)

    if len(scores_a) < 30 or len(scores_b) < 30:
        return {
            "error": (
                f"Sample too small — Group A: n={len(scores_a)}, "
                f"Group B: n={len(scores_b)}. Need ≥ 30 in each group."
            )
        }

    m_a, m_b = mean(scores_a), mean(scores_b)
    s_a, s_b = std_dev(scores_a), std_dev(scores_b)
    n_a, n_b = len(scores_a), len(scores_b)

    z_res = two_sample_z_test(m_a, m_b, s_a, s_b, n_a, n_b)
    z     = z_res["z"]
    p_two = z_res["p"]
    direction = parsed.get("direction", "two_tailed")
    p     = round(p_two / 2, 4) if direction != "two_tailed" else p_two
    sig   = p < 0.05

    if sig:
        if direction == "greater":
            verdict = "validated" if z > 0 else "rejected"
        elif direction == "less":
            verdict = "validated" if z < 0 else "rejected"
        else:
            verdict = "validated"
    else:
        verdict = "inconclusive"

    pooled_sd = math.sqrt((s_a ** 2 + s_b ** 2) / 2) if (s_a + s_b) > 0 else 0
    effect    = round(abs(m_a - m_b) / pooled_sd, 3) if pooled_sd > 0 else 0

    return {
        "test_type":     "two_sample_z",
        "z":             z,
        "p_value":       p,
        "significant":   sig,
        "verdict":       verdict,
        "mean_a":        round(m_a, 3),
        "mean_b":        round(m_b, 3),
        "std_a":         round(s_a, 3),
        "std_b":         round(s_b, 3),
        "n_a":           n_a,
        "n_b":           n_b,
        "effect_size":   effect,
        "interpretation": "",
        "working": {
            "formula": "Z = (X̄ₐ − X̄ᵦ) / √(σₐ²/nₐ + σᵦ²/nᵦ)",
            "x_bar_a": round(m_a, 3),
            "x_bar_b": round(m_b, 3),
            "std_a":   round(s_a, 3),
            "std_b":   round(s_b, 3),
            "n_a":     n_a,
            "n_b":     n_b,
        },
    }


def _run_one_sample_z(parsed: dict, responses: list, group_avg: float, hypothesis_text: str = "") -> dict:
    group   = parsed.get("group") or {}
    outcome = (
        parsed.get("outcome") or parsed.get("y_var") or parsed.get("x_var")
        or _infer_theme_from_text(hypothesis_text) or {}
    )

    g_field = group.get("field")
    g_val   = group.get("value")
    out_field = outcome.get("field")

    if g_field and g_val:
        rows = _filter_responses(responses, g_field, g_val)
    else:
        rows = responses

    scores = _get_scores(rows, out_field)
    n = len(scores)
    if n < 30:
        return {"error": f"Sample too small (n={n}). Need ≥ 30 responses."}

    baseline = float(parsed.get("baseline_value") or group_avg)
    sm  = mean(scores)
    sd  = std_dev(scores)
    direction = parsed.get("direction", "greater")

    z_res = one_sample_z_test(sm, baseline, sd, n)
    z     = z_res["z"]
    p     = z_res["p_two_tailed"] if direction == "two_tailed" else z_res["p_one_tailed"]
    sig   = p < 0.05

    if sig:
        if direction == "greater":
            verdict = "validated" if z > 0 else "rejected"
        elif direction == "less":
            verdict = "validated" if z < 0 else "rejected"
        else:
            verdict = "validated"
    else:
        verdict = "inconclusive"

    return {
        "test_type":      "one_sample_z",
        "z":              z,
        "p_value":        p,
        "critical_z":     1.645,
        "significant":    sig,
        "verdict":        verdict,
        "sample_mean":    round(sm, 3),
        "pop_mean":       baseline,
        "std_dev":        round(sd, 3),
        "n":              n,
        "interpretation": "",
        "working": {
            "formula": "Z = (X̄ − μ₀) / (σ / √n)",
            "x_bar":   round(sm, 3),
            "mu_0":    baseline,
            "sigma":   round(sd, 3),
            "sqrt_n":  round(math.sqrt(n), 3),
            "se":      round(sd / math.sqrt(n), 3),
        },
    }


# ── Request models ────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    hypothesis_text: str


class TestRequest(BaseModel):
    hypothesis_text: str
    parsed:          dict  = {}   # pre-parsed output from /parse
    filters:         dict  = {}
    alpha:           float = 0.05


# ── POST /api/hypothesis/parse ────────────────────────────────────────────────

@router.post("/parse")
async def parse_hypothesis(req: ParseRequest):
    """
    Step 1 + 3: Parse the natural-language hypothesis and map variables
    to actual survey questions / theme scores. Returns structured params
    that the frontend shows for confirmation before running the test.
    """
    try:
        questions = _read("questions.json")
        try:
            meta_data = json.loads((_DATA / "meta.json").read_text(encoding="utf-8"))
            group_avg = meta_data.get("group_avg", 4.44)
        except Exception:
            group_avg = 4.44

        q_list = "\n".join(
            f'  {q["id"]}: "{q.get("text", q["id"])}" [theme: {q.get("category", "")}]'
            for q in questions
        )

        prompt = f"""You are a statistical analysis engine for an employee engagement HR survey.

SURVEY DATA AVAILABLE:
Theme score fields (aggregated scores per respondent):
  engagement, leadership, performance_culture, development_and_career,
  manager_effectiveness, onboarding, overall

Individual survey questions (OP questions):
{q_list}

Demographic split fields and their known values:
  generation: Gen Z, Gen Y, Gen X, Baby Boomer
  gender: Male, Female
  is_manager: Yes, No
  job_level: Staff, Junior Management, Middle Management, Senior Management, Top Management
  tenure: 0-2, 2-5, 5-10, 10-15, 15-20, 20-25, >25 (Equal or more than 25)
  abglp: Yes, No
  country: <any country name>
  business: <any business unit name>

Company group average: {group_avg}/5

HYPOTHESIS: "{req.hypothesis_text}"

TASK — Classify this hypothesis and map every variable to real survey fields.

Hypothesis types:
- "group_comparison": Two distinct groups compared on same outcome
    (e.g. "Managers trust leadership more than ICs", "Gen Z vs Gen Y engagement")
- "relationship": X correlates with / impacts / leads to Y
    (e.g. "Higher recognition leads to higher engagement")
- "one_sample": One group vs company/benchmark average
    (e.g. "Gen Y has higher engagement score than company average")
- "unsupported": Cannot map to available data

For variables: prefer theme scores when the concept maps clearly to one.
For individual questions: only use when the concept maps better to a specific question.

Return ONLY a valid JSON object (no markdown). The shape depends on hypothesis_type
— follow the EXACT example for whichever type you detect:

If hypothesis_type == "group_comparison" (e.g. "Managers trust leadership more than ICs"):
{{
  "hypothesis_type": "group_comparison", "parseable": true, "parse_error": null,
  "group_a": {{"field": "is_manager", "value": "Yes", "label": "People Managers", "confidence": 0.96}},
  "group_b": {{"field": "is_manager", "value": "No", "label": "Individual Contributors", "confidence": 0.94}},
  "outcome": {{"source": "theme", "field": "leadership", "question_id": null, "label": "Leadership Score", "confidence": 0.97}},
  "x_var": null, "y_var": null, "group": null, "baseline": null, "baseline_value": null,
  "h0": "...", "h1": "...", "test_recommended": "two_sample_z", "direction": "greater|less|two_tailed"
}}

If hypothesis_type == "relationship" (e.g. "Higher recognition leads to higher engagement"):
{{
  "hypothesis_type": "relationship", "parseable": true, "parse_error": null,
  "x_var": {{"source": "theme", "field": "development_and_career", "question_id": null, "label": "Career Development Score", "confidence": 0.91}},
  "y_var": {{"source": "theme", "field": "engagement", "question_id": null, "label": "Engagement Score", "confidence": 0.99}},
  "group_a": null, "group_b": null, "group": null, "outcome": null, "baseline": null, "baseline_value": null,
  "h0": "...", "h1": "...", "test_recommended": "pearson_correlation", "direction": "greater|less|two_tailed"
}}

If hypothesis_type == "one_sample" (e.g. "Gen Y has higher engagement score than company average"):
{{
  "hypothesis_type": "one_sample", "parseable": true, "parse_error": null,
  "group": {{"field": "generation", "value": "Gen Y", "label": "Gen Y employees", "confidence": 0.98}},
  "outcome": {{"source": "theme", "field": "engagement", "question_id": null, "label": "Engagement Score", "confidence": 0.97}},
  "baseline": "group_average", "baseline_value": {group_avg},
  "group_a": null, "group_b": null, "x_var": null, "y_var": null,
  "h0": "...", "h1": "...", "test_recommended": "one_sample_z", "direction": "greater|less|two_tailed"
}}

RULES (critical — read carefully):
- For group_comparison: group_a, group_b, AND outcome are ALL REQUIRED — never leave outcome null.
  outcome is the metric/theme being compared (e.g. "trust in Leadership" → field="leadership").
  Every group_comparison hypothesis is comparing some metric between two groups — that metric
  is always the outcome, never x_var/y_var.
- For relationship: x_var AND y_var are BOTH REQUIRED — never leave either null.
- For one_sample: group, outcome, AND baseline_value are ALL REQUIRED.
- Set every field not relevant to the detected type to null — do not omit keys.
- confidence must be 0.0–1.0 (how certain you are in the mapping).
- If unsupported, set parseable=false and explain in parse_error."""

        parsed = await call_llm_json([{"role": "user", "content": prompt}], 600)

        if not parsed.get("parseable", True):
            return {
                "parseable":   False,
                "parse_error": parsed.get("parse_error") or "Could not map hypothesis to survey data.",
                "suggestion":  'Try: "Employees who rate Career Growth high have higher Engagement than the company average."',
            }

        parsed["group_avg"] = group_avg
        return parsed

    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── POST /api/hypothesis/test ─────────────────────────────────────────────────

@router.post("/test")
async def run_test(req: TestRequest):
    """
    Step 2: Run the correct statistical test based on parsed hypothesis type.
    Accepts pre-parsed params from /parse; falls back to LLM re-parse if not provided.
    """
    try:
        responses = load_responses()
        q_bu      = _read_dict("question_bu_scores.json")

        try:
            meta_data = json.loads((_DATA / "meta.json").read_text(encoding="utf-8"))
            group_avg = meta_data.get("group_avg", 4.44)
        except Exception:
            group_avg = 4.44

        parsed = req.parsed
        if not parsed or not parsed.get("parseable", True) is not False:
            # Re-parse if caller didn't provide pre-parsed params
            parse_res = await parse_hypothesis(ParseRequest(hypothesis_text=req.hypothesis_text))
            if not parse_res.get("parseable", True):
                return {"success": False, "error": parse_res.get("parse_error", "Could not parse hypothesis.")}
            parsed = parse_res

        h_type = parsed.get("hypothesis_type", "one_sample")

        # ── Route to correct test ──
        if h_type == "relationship":
            result = _run_pearson(parsed, responses, q_bu)
        elif h_type == "group_comparison":
            result = _run_two_sample_z(parsed, responses, req.hypothesis_text)
        else:
            result = _run_one_sample_z(parsed, responses, group_avg, req.hypothesis_text)

        if "error" in result:
            return {"success": False, "error": result["error"]}

        # ── LLM plain-English interpretation ──
        try:
            if h_type == "relationship":
                interp_ctx = f"Pearson r={result['r']}, p={result['p_value']}, n={result['n']} business units, verdict={result['verdict']}"
            elif h_type == "group_comparison":
                interp_ctx = (
                    f"Two-sample Z={result['z']}, p={result['p_value']}, "
                    f"Group A mean={result['mean_a']} (n={result['n_a']}), "
                    f"Group B mean={result['mean_b']} (n={result['n_b']}), "
                    f"effect size={result['effect_size']}, verdict={result['verdict']}"
                )
            else:
                interp_ctx = f"Z={result['z']}, p={result['p_value']}, sample mean={result['sample_mean']}, baseline={result['pop_mean']}, verdict={result['verdict']}"

            interp_prompt = f"""Write a 1–2 sentence plain English interpretation of this statistical result for an HR director.
Be specific with numbers. Be direct about what it means for HR decision-making.

Hypothesis: "{req.hypothesis_text}"
Result: {interp_ctx}

Return ONLY JSON: {{"interpretation": "<sentence(s)>"}}"""

            interp = await call_llm_json([{"role": "user", "content": interp_prompt}], 200)
            result["interpretation"] = interp.get("interpretation", "")
        except Exception:
            result["interpretation"] = f"The test result is {result.get('verdict', 'inconclusive')}."

        # ── Attach parsed context for frontend display ──
        result["h0"]             = parsed.get("h0", "")
        result["h1"]             = parsed.get("h1", "")
        result["hypothesis_type"] = h_type
        result["parsed"]         = parsed

        # ── Save to history ──
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
            "result":          result.get("verdict", "inconclusive"),
            "test_type":       result.get("test_type"),
            "p_value":         result.get("p_value"),
            "filters_applied": req.filters,
            "date_tested":     f"{now.strftime('%b')} {now.day}, {now.year}",
            "params":          parsed,
        })
        history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")

        return {"success": True, "result": result}

    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/hypothesis/templates ─────────────────────────────────────────────

@router.get("/templates")
def get_templates():
    return {
        "templates": [
            {
                "id":   "T-001",
                "type": "group_comparison",
                "text": "People Managers have higher trust in Leadership than Individual Contributors.",
            },
            {
                "id":   "T-002",
                "type": "relationship",
                "text": "Employees with higher Career Development scores tend to have higher Engagement scores.",
            },
            {
                "id":   "T-003",
                "type": "one_sample",
                "text": "Gen Y employees have higher Engagement scores than the company average.",
            },
            {
                "id":   "T-004",
                "type": "relationship",
                "text": "Higher Manager Effectiveness scores are associated with higher Engagement.",
            },
            {
                "id":   "T-005",
                "type": "group_comparison",
                "text": "Female employees rate Manager Effectiveness higher than Male employees.",
            },
        ]
    }


# ── GET /api/hypothesis/history ───────────────────────────────────────────────

@router.get("/history")
def get_history(limit: int = Query(20), offset: int = Query(0)):
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
def get_history_item(item_id: str):
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
def delete_history_item(item_id: str):
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
