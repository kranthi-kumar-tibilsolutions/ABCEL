import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.stats import pearson_r, pearson_p_value, correlation_strength, correlation_category
from lib.llm   import call_llm_json
from routes.auth import data_company, get_current_user

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


def _read_dict(f: str) -> dict:
    for base in (_DATA, _SAMPLE):
        try:
            return json.loads((base / f).read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _resolve_business(user: dict, requested: str | None) -> str | None:
    """Return the effective business filter, enforcing company-role scope."""
    if user.get("role") == "company":
        return data_company(user)   # locked — ignore whatever frontend sent
    return requested if requested and requested != "All" else None


def _bu_corr_vectors(q_bu: dict, q_id_a: str, q_id_b: str, business: str | None = None):
    """Return aligned (xs, ys) lists using business-unit level question means."""
    a_scores = q_bu.get(q_id_a, {})
    b_scores = q_bu.get(q_id_b, {})
    # If a business filter is set, keep only BUs belonging to that business;
    # the BU keys in question_bu_scores are business names (CQ9 = Org Level 1).
    if business and business != "All":
        a_scores = {k: v for k, v in a_scores.items() if k == business}
        b_scores = {k: v for k, v in b_scores.items() if k == business}
    common = sorted(set(a_scores) & set(b_scores))
    return [a_scores[k] for k in common], [b_scores[k] for k in common]


def _filter(responses: list, business, year, country, department,
            include_inactive: str = "No") -> list:
    out = responses
    if include_inactive == "No":
        out = [r for r in out if r.get("is_active") is not False]
    if business   and business   != "All":
        out = [r for r in out if r.get("business")   == business]
    if year       and year       != "All":
        out = [r for r in out if r.get("year")       == year]
    if country    and country    != "All":
        out = [r for r in out if r.get("country")    == country]
    if department and department != "All":
        out = [r for r in out if r.get("department") == department]
    return out


def _scores(responses: list, q_id: str) -> list:
    return [
        v for r in responses
        if (v := r.get("scores", {}).get(q_id)) is not None
    ]


# ── GET /api/statistical/questions ────────────────────────────────────────────

@router.get("/questions")
async def get_questions():
    try:
        return {"questions": _read("questions.json")}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/statistical/correlations/{question_id} ───────────────────────────

@router.get("/correlations/{question_id}")
async def get_correlations(
    question_id:      str,
    business:         Optional[str] = Query(None),
    year:             Optional[str] = Query(None),
    country:          Optional[str] = Query(None),
    department:       Optional[str] = Query(None),
    include_inactive: str           = Query("No"),
    limit:            Optional[int] = Query(None),
    offset:           int           = Query(0),
    user:             dict          = Depends(get_current_user),
):
    try:
        business  = _resolve_business(user, business)
        questions = _read("questions.json")
        q_bu      = _read_dict("question_bu_scores.json")

        # n = number of BUs used for correlation (full dataset, not filtered sample)
        base_bu = q_bu.get(question_id, {})
        if business and business != "All":
            base_bu = {k: v for k, v in base_bu.items() if k == business}
        n = len(base_bu)

        correlations = []
        for q in questions:
            if q["id"] == question_id:
                continue
            xs, ys = _bu_corr_vectors(q_bu, question_id, q["id"], business)
            r_val  = pearson_r(xs, ys)
            p_val  = pearson_p_value(r_val, len(xs))
            correlations.append({
                "question_id":     q["id"],
                "question_text":   q.get("text", ""),
                "category":        q.get("category", ""),
                "pearson_r":       r_val,
                "p_value":         p_val,
                "strength":        correlation_strength(r_val),
                "category_bucket": correlation_category(r_val),
                "significant":     p_val < 0.05,
                "n_bus":           len(xs),
            })
        correlations.sort(key=lambda x: -abs(x["pearson_r"]))

        tab_counts = {
            "all":               len(correlations),
            "strong_positive":   sum(1 for c in correlations if c["category_bucket"] == "strong_positive"),
            "moderate_positive": sum(1 for c in correlations if c["category_bucket"] == "moderate_positive"),
            "weak_none":         sum(1 for c in correlations if c["category_bucket"] == "weak_none"),
            "negative":          sum(1 for c in correlations if c["category_bucket"] in ("moderate_negative", "strong_negative")),
        }

        total = len(correlations)
        paged = correlations[offset: offset + limit] if limit is not None else correlations
        showing = (
            f"Showing {offset + 1}–{min(offset + limit, total)} of {total} questions"
            if limit is not None
            else f"Showing all {total} questions"
        )
        q_text = next((q.get("text", "") for q in questions if q["id"] == question_id), "")

        return {
            "question_id":   question_id,
            "question_text": q_text,
            "n":             n,
            "tab_counts":    tab_counts,
            "total":         total,
            "showing":       showing,
            "correlations":  paged,
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/statistical/correlogram/{question_id} ────────────────────────────

@router.get("/correlogram/{question_id}")
async def get_correlogram(
    question_id:      str,
    top:              int           = Query(20),
    business:         Optional[str] = Query(None),
    year:             Optional[str] = Query(None),
    country:          Optional[str] = Query(None),
    department:       Optional[str] = Query(None),
    include_inactive: str           = Query("No"),
    user:             dict          = Depends(get_current_user),
):
    try:
        business  = _resolve_business(user, business)
        questions = _read("questions.json")
        q_bu      = _read_dict("question_bu_scores.json")

        ranked = sorted(
            [
                {
                    "id": q["id"],
                    "r":  abs(pearson_r(*_bu_corr_vectors(q_bu, question_id, q["id"], business))),
                }
                for q in questions if q["id"] != question_id
            ],
            key=lambda x: -x["r"],
        )[:top]

        top_ids = [question_id] + [r["id"] for r in ranked]

        def _pearson_pair(id_a: str, id_b: str) -> float:
            if id_a == id_b:
                return 1.0
            xs, ys = _bu_corr_vectors(q_bu, id_a, id_b, business)
            return pearson_r(xs, ys)

        matrix = [[_pearson_pair(id_a, id_b) for id_b in top_ids] for id_a in top_ids]

        def _short_label(q_id: str) -> str:
            q = next((q for q in questions if q["id"] == q_id), None)
            return (q.get("short_label") if q else None) or q_id

        return {
            "question_ids":    top_ids,
            "question_labels": [_short_label(i) for i in top_ids],
            "matrix":          matrix,
            "color_scale": {
                "min": -1.0,
                "max":  1.0,
                "labels":  {"negative": "red", "neutral": "white", "positive": "blue"},
                "legend":  "Darker color indicates stronger correlation",
            },
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/statistical/network/{question_id} ────────────────────────────────

@router.get("/network/{question_id}")
async def get_network(
    question_id:      str,
    top:              int           = Query(25),
    business:         Optional[str] = Query(None),
    year:             Optional[str] = Query(None),
    country:          Optional[str] = Query(None),
    department:       Optional[str] = Query(None),
    include_inactive: str           = Query("No"),
    user:             dict          = Depends(get_current_user),
):
    try:
        business  = _resolve_business(user, business)
        questions = _read("questions.json")
        q_bu      = _read_dict("question_bu_scores.json")

        all_edges = []
        for q in questions:
            if q["id"] == question_id:
                continue
            xs, ys = _bu_corr_vectors(q_bu, question_id, q["id"], business)
            r_val  = pearson_r(xs, ys)
            all_edges.append({
                "source":    question_id,
                "target":    q["id"],
                "r":         r_val,
                "strength":  correlation_strength(r_val),
                "direction": "positive" if r_val > 0 else "negative",
                "thickness": abs(r_val),
            })
        all_edges.sort(key=lambda x: -abs(x["r"]))
        # Take top N by absolute r — no hard threshold so the graph always renders
        edges = all_edges[:top]
        # Attach max_r so frontend can scale edge thickness/opacity relatively
        max_r = abs(edges[0]["r"]) if edges else 1

        node_ids = set([question_id] + [e["target"] for e in edges])

        def _q(q_id: str):
            return next((q for q in questions if q["id"] == q_id), None)

        nodes = [
            {
                "id":        q_id,
                "label":     (_q(q_id) or {}).get("short_label") or q_id,
                "category":  (_q(q_id) or {}).get("category", ""),
                "is_center": q_id == question_id,
            }
            for q_id in node_ids
        ]

        return {"nodes": nodes, "edges": edges, "max_r": round(max_r, 4)}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/statistical/insights/{question_id} ───────────────────────────────

@router.get("/insights/{question_id}")
async def get_insights(
    question_id: str,
    business:    Optional[str] = Query(None),
    year:        Optional[str] = Query(None),
    country:     Optional[str] = Query(None),
    department:  Optional[str] = Query(None),
    user:        dict          = Depends(get_current_user),
):
    try:
        business    = _resolve_business(user, business)
        questions   = _read("questions.json")
        filtered    = _filter(_read("responses.json"), business, year, country, department)
        q_text      = next((q.get("text", "") for q in questions if q["id"] == question_id), question_id)
        base_scores = _scores(filtered, question_id)
        n_base      = len(base_scores)

        corrs = sorted(
            [
                {
                    "id":   q["id"],
                    "text": q.get("text", ""),
                    "r":    pearson_r(
                        base_scores[:(_len := min(n_base, len(_scores(filtered, q["id"]))))],
                        _scores(filtered, q["id"])[:_len],
                    ),
                }
                for q in questions if q["id"] != question_id
            ],
            key=lambda x: -x["r"],
        )

        top_pos = corrs[0]              if corrs else None
        top_neg = corrs[-1]             if corrs else None

        prompt = f"""You are an HR analytics expert. Write a 2-sentence insight about these Pearson correlation findings.
Be specific with the numbers. Write in plain English for an HR director audience.

Question analysed: "{q_text}"
Strongest positive correlation: {top_pos.get("text") if top_pos else "N/A"} (r = {top_pos.get("r") if top_pos else "N/A"})
Strongest negative correlation: {top_neg.get("text") if top_neg else "N/A"} (r = {top_neg.get("r") if top_neg else "N/A"})

Return ONLY a JSON object: {{ "insight": "<2 sentences>" }}"""

        data = await call_llm_json([{"role": "user", "content": prompt}], 200)
        return {"insight": data.get("insight"), "top_positive": top_pos, "top_negative": top_neg}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
