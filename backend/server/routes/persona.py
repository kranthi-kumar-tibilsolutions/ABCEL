import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from lib.stats import std_dev, two_sample_z_test, significance_badge
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


# Real dimension names from responses.json (DATA_REALITY_UPDATE §6)
DIMS = ["business", "age_group", "generation", "gender", "job_level", "tenure", "country", "is_manager", "abglp"]

DIM_LABELS = {
    "business":   "Business",
    "age_group":  "Age Group",
    "generation": "Generation",
    "gender":     "Gender",
    "job_level":  "Job Band Level",
    "tenure":     "Tenure Band",
    "country":    "Country",
    "is_manager": "Manager (Y/N)",
    "abglp":      "ABGLP Talent Pool",
}

# Real theme field names from responses.json (DATA_REALITY_UPDATE §7)
THEMES = [
    {"label": "Engagement",            "key": "engagement"},
    {"label": "Leadership",            "key": "leadership"},
    {"label": "Performance Culture",   "key": "performance_culture"},
    {"label": "Development & Career",  "key": "development_and_career"},
    {"label": "Manager Effectiveness", "key": "manager_effectiveness"},
    {"label": "Onboarding",            "key": "onboarding"},
]

# Built-in cohorts — values validated against actual responses.json data
BUILTIN_COHORTS = {
    "gen_z":        {"label": "Gen Z",                   "filter": [{"dimension": "generation", "operator": "eq", "value": "Gen Z"}]},
    "gen_y":        {"label": "Gen Y (Millennials)",     "filter": [{"dimension": "generation", "operator": "eq", "value": "Gen Y"}]},
    "gen_x":        {"label": "Gen X",                   "filter": [{"dimension": "generation", "operator": "eq", "value": "Gen X"}]},
    "female":       {"label": "Female Employees",        "filter": [{"dimension": "gender",     "operator": "eq", "value": "Female"}]},
    "male":         {"label": "Male Employees",          "filter": [{"dimension": "gender",     "operator": "eq", "value": "Male"}]},
    "new_joiners":  {"label": "New Joiners (0-2 yrs)",   "filter": [{"dimension": "tenure",     "operator": "eq", "value": "0-2"}]},
    "mid_tenure":   {"label": "Mid-Tenure (2-5 yrs)",    "filter": [{"dimension": "tenure",     "operator": "eq", "value": "2-5"}]},
    "senior_tenure":{"label": "Senior Tenure (10+ yrs)", "filter": [{"dimension": "tenure",     "operator": "eq", "value": "10-15"}]},
    "junior_mgmt":  {"label": "Junior Management",       "filter": [{"dimension": "job_level",  "operator": "eq", "value": "Junior Management"}]},
    "middle_mgmt":  {"label": "Middle Management",       "filter": [{"dimension": "job_level",  "operator": "eq", "value": "Middle Management"}]},
    "senior_mgmt":  {"label": "Senior Management",       "filter": [{"dimension": "job_level",  "operator": "eq", "value": "Senior Management"}]},
    "non_mgmt":     {"label": "Non-Management",          "filter": [{"dimension": "job_level",  "operator": "eq", "value": "Non Management"}]},
    "abglp":        {"label": "ABGLP Talent Pool",       "filter": [{"dimension": "abglp",      "operator": "eq", "value": "Yes"}]},
    "managers":     {"label": "People Managers",         "filter": [{"dimension": "is_manager", "operator": "eq", "value": "Yes"}]},
    "ic":           {"label": "Individual Contributors", "filter": [{"dimension": "is_manager", "operator": "eq", "value": "No"}]},
    "age_under_25": {"label": "Age Under 25",            "filter": [{"dimension": "age_group",  "operator": "eq", "value": "21-25"}]},
    "age_30_35":    {"label": "Age 30-35",               "filter": [{"dimension": "age_group",  "operator": "eq", "value": "30-35"}]},
    "age_40_45":    {"label": "Age 40-45",               "filter": [{"dimension": "age_group",  "operator": "eq", "value": "40-45"}]},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_group_scores(group: list, themes: list) -> dict:
    result = {}
    for theme in themes:
        vals = [
            v for u in group
            if (v := u.get(theme["key"])) is not None and v > 0
        ]
        result[theme["label"]] = {
            "mean": sum(vals) / len(vals) if vals else 0,
            "std":  std_dev(vals),
            "n":    len(vals),
        }
    return result


def _apply_filters(data: list, filters: list) -> list:
    result = data
    for f in filters:
        dim = f.get("dimension")
        op  = f.get("operator")
        val = f.get("value")

        def match(u, _dim=dim, _op=op, _val=val) -> bool:
            uval = u.get(_dim)
            if uval is None:
                return False
            if _op == "eq":
                return str(uval) == str(_val)
            if _op == "gte":
                try:    return float(uval) >= float(_val)
                except: return False
            if _op == "lte":
                try:    return float(uval) <= float(_val)
                except: return False
            if _op == "contains":
                return str(_val).lower() in str(uval).lower()
            return True

        result = [u for u in result if match(u)]
    return result


# ── Request models ────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    filters:            List[Any] = []
    comparison_cohorts: List[str] = []
    persona_name:       Optional[str] = None
    survey_filters:     dict = {}

class TakeawaysRequest(BaseModel):
    persona_name: str
    themes:       list
    persona_n:    int

class SaveRequest(BaseModel):
    persona_name: str
    filters:      list
    persona_n:    int
    scores:       Optional[dict] = None


# ── POST /api/persona/query ───────────────────────────────────────────────────

@router.post("/query")
async def persona_query(req: QueryRequest):
    try:
        units = _read("responses.json")

        # Apply top-level survey filters first (20.6)
        sf = req.survey_filters
        if sf.get("business") and sf["business"] != "All":
            units = [u for u in units if u.get("business") == sf["business"]]
        if sf.get("year") and sf["year"] != "All":
            units = [u for u in units if u.get("year") == sf["year"]]
        if sf.get("country") and sf["country"] != "All":
            units = [u for u in units if u.get("country") == sf["country"]]
        if sf.get("include_inactive") == "No":
            units = [u for u in units if u.get("is_active") is not False]

        persona_group = _apply_filters(units, req.filters)
        persona_n     = len(persona_group)

        if persona_n == 0:
            raise HTTPException(
                status_code=400,
                detail="No employees match the selected filters. Try broadening your criteria.",
            )

        persona_scores = _compute_group_scores(persona_group, THEMES)
        overall_scores = _compute_group_scores(units, THEMES)
        overall_n      = len(units)

        # Resolve comparison cohorts — skip any with fewer than 10 respondents
        comparisons = []
        for cohort_id in req.comparison_cohorts:
            cohort_def = BUILTIN_COHORTS.get(cohort_id)
            if not cohort_def:
                continue
            cohort_group = _apply_filters(units, cohort_def["filter"])
            if len(cohort_group) < 10:
                continue   # too small to compute reliable stats
            comparisons.append({
                "id":     cohort_id,
                "label":  cohort_def["label"],
                "n":      len(cohort_group),
                "scores": _compute_group_scores(cohort_group, THEMES),
            })

        theme_results = []
        for theme in THEMES:
            p_mean  = persona_scores[theme["label"]]["mean"]
            p_std   = persona_scores[theme["label"]]["std"]
            o_mean  = overall_scores[theme["label"]]["mean"]
            o_std   = overall_scores[theme["label"]]["std"]

            z_result = two_sample_z_test(p_mean, o_mean, p_std, o_std, persona_n, overall_n)
            badge    = significance_badge(z_result["p"])

            row = {
                "theme":              theme["label"],
                "persona_score":      round(p_mean, 2),
                "overall_score":      round(o_mean, 2),
                "delta_overall":      round(p_mean - o_mean, 2),
                "p_value":            z_result["p"],
                "significant":        badge["significant"],
                "significance_label": (
                    f"p < {'0.01' if z_result['p'] < 0.01 else '0.05'}"
                    if badge["significant"] else "n.s."
                ),
                "comparisons": {},
            }

            for cohort in comparisons:
                c_mean = cohort["scores"][theme["label"]]["mean"]
                c_std  = cohort["scores"][theme["label"]]["std"]
                z_c    = two_sample_z_test(p_mean, c_mean, p_std, c_std, persona_n, cohort["n"])
                row["comparisons"][cohort["id"]] = {
                    "score":       round(c_mean, 2),
                    "delta":       round(p_mean - c_mean, 2),
                    "p_value":     z_c["p"],
                    "significant": significance_badge(z_c["p"])["significant"],
                }

            theme_results.append(row)

        diff_summary = {
            "vs_overall": sum(1 for t in theme_results if t["significant"]),
            "vs_cohorts": {
                c["id"]: sum(
                    1 for t in theme_results
                    if t["comparisons"].get(c["id"], {}).get("significant")
                )
                for c in comparisons
            },
        }

        return {
            "persona_name": req.persona_name or "Custom Persona",
            "persona_n":    persona_n,
            "themes":       theme_results,
            "comparisons":  [{"id": c["id"], "label": c["label"], "n": c["n"]} for c in comparisons],
            "diff_summary": diff_summary,
        }
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/persona/dimensions ───────────────────────────────────────────────

@router.get("/dimensions")
async def get_dimensions():
    try:
        units = _read("responses.json")
        dimensions = [
            {
                "id":     dim,
                "label":  DIM_LABELS.get(dim, dim),
                "values": sorted(set(u.get(dim) for u in units if u.get(dim))),
            }
            for dim in DIMS
        ]
        return {"dimensions": dimensions}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/persona/top5 ─────────────────────────────────────────────────────

@router.get("/top5")
async def get_top5():
    try:
        units       = _read("responses.json")
        suggestions = []

        for dim in DIMS:
            values = list(set(u.get(dim) for u in units if u.get(dim)))
            for val in values:
                group = [u for u in units if u.get(dim) == val]
                if len(group) < 30:
                    continue

                group_scores   = _compute_group_scores(group, THEMES)
                overall_scores = _compute_group_scores(units, THEMES)

                max_delta = 0.0
                max_theme = ""
                for theme in THEMES:
                    delta = abs(
                        (group_scores[theme["label"]]["mean"] or 0)
                        - (overall_scores[theme["label"]]["mean"] or 0)
                    )
                    if delta > max_delta:
                        max_delta = delta
                        max_theme = theme["label"]

                suggestions.append({
                    "id":          f"{dim}_{val}",
                    "label":       str(val),
                    "filters":     [{"dimension": dim, "operator": "eq", "value": val}],
                    "n":           len(group),
                    "key_finding": f"{'+' if max_delta > 0 else ''}{max_delta:.2f} pts on {max_theme} vs overall",
                    "max_delta":   max_delta,
                })

        top5 = sorted(suggestions, key=lambda x: -x["max_delta"])[:5]
        return {"personas": top5}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── POST /api/persona/takeaways ───────────────────────────────────────────────

@router.post("/takeaways")
async def get_takeaways(req: TakeawaysRequest):
    try:
        theme_summary = json.dumps([
            {
                "theme":       t["theme"],
                "persona":     t["persona_score"],
                "overall":     t["overall_score"],
                "delta":       t["delta_overall"],
                "significant": t["significant"],
            }
            for t in req.themes
        ])
        prompt = f"""You are an HR analytics expert.
Generate 3 concise key takeaways for this persona comparison report.
Be specific with numbers. Use plain English for an HR director.

Persona: {req.persona_name} (n={req.persona_n})
Theme comparison data: {theme_summary}

Return ONLY a JSON object: {{ "takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"] }}"""

        data = await call_llm_json([{"role": "user", "content": prompt}], 300)
        return {"takeaways": data.get("takeaways") or data}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── POST /api/persona/save ────────────────────────────────────────────────────

@router.post("/save")
async def save_persona(req: SaveRequest):
    try:
        saved_path = _DATA / "saved_personas.json"
        saved: list = []
        try:
            saved = json.loads(saved_path.read_text(encoding="utf-8"))
        except Exception:
            pass

        persona_id = f"P-{int(time.time() * 1000)}"
        saved.append({
            "id":         persona_id,
            "name":       req.persona_name,
            "filters":    req.filters,
            "n":          req.persona_n,
            "scores":     req.scores,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        saved_path.write_text(json.dumps(saved, indent=2), encoding="utf-8")
        return {"success": True, "id": persona_id, "persona_name": req.persona_name}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/persona/cohorts ──────────────────────────────────────────────────

@router.get("/cohorts")
async def get_cohorts():
    try:
        saved_path = _DATA / "saved_personas.json"
        saved: list = []
        try:
            saved = json.loads(saved_path.read_text(encoding="utf-8"))
        except Exception:
            pass

        builtin = [
            {"id": pid, "name": pdef["label"], "type": "builtin"}
            for pid, pdef in BUILTIN_COHORTS.items()
        ]
        return {
            "cohorts": builtin + [
                {"id": p["id"], "name": p["name"], "type": "saved", "n": p.get("n")}
                for p in saved
            ]
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
