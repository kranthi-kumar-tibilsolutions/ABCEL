import json
import math
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from lib.stats import pearson_r
from lib.llm   import call_llm_json
from lib.nlp   import classify_batch

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"
_SAMPLE  = _DATA / "sample"


def _read(f: str):
    for base in (_DATA, _SAMPLE):
        try:
            return json.loads((base / f).read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"responses": []} if f == "sentiments.json" else []


def _filter(responses: list, business_unit, department, location, tenure,
            job_level, include_inactive: str) -> list:
    out = responses
    if include_inactive == "No":
        out = [r for r in out if r.get("is_active") is not False]
    if business_unit and business_unit != "All":
        out = [r for r in out if r.get("business_unit") == business_unit]
    if department and department != "All":
        out = [r for r in out if r.get("department")    == department]
    if location and location != "All":
        out = [r for r in out if r.get("location")      == location]
    if tenure and tenure != "All":
        out = [r for r in out if r.get("tenure")        == tenure]
    if job_level and job_level != "All":
        out = [r for r in out if r.get("job_level")     == job_level]
    return out


# ── GET /api/sentiment/overview ───────────────────────────────────────────────

@router.get("/overview")
async def get_overview(
    business_unit:    Optional[str] = Query(None),
    department:       Optional[str] = Query(None),
    location:         Optional[str] = Query(None),
    tenure:           Optional[str] = Query(None),
    job_level:        Optional[str] = Query(None),
    include_inactive: str           = Query("No"),
):
    try:
        sentiments = _read("sentiments.json")
        filtered   = _filter(
            sentiments["responses"],
            business_unit, department, location, tenure, job_level, include_inactive,
        )
        total = len(filtered)

        if total == 0:
            return {
                "total": 0, "overall_score": 0,
                "distribution": {
                    "negative": {"count": 0, "pct": 0},
                    "neutral":  {"count": 0, "pct": 0},
                    "positive": {"count": 0, "pct": 0},
                },
                "top_topics": [],
            }

        negative = sum(1 for r in filtered if r.get("label") == "Negative")
        neutral  = sum(1 for r in filtered if r.get("label") == "Neutral")
        positive = sum(1 for r in filtered if r.get("label") == "Positive")
        avg_score = round(sum(r.get("score", 0) for r in filtered) / total, 2)

        topic_map = {}
        for r in filtered:
            for topic in (r.get("topics") or []):
                if topic not in topic_map:
                    topic_map[topic] = {"count": 0, "total_score": 0}
                topic_map[topic]["count"]       += 1
                topic_map[topic]["total_score"] += r.get("score", 0)

        topics = sorted(
            [
                {
                    "topic":              topic,
                    "pct_of_responses":   round((d["count"] / total) * 100, 1),
                    "sentiment_score":    round(d["total_score"] / d["count"], 2),
                    "trend":              "up" if d["total_score"] / d["count"] > 0 else "down",
                }
                for topic, d in topic_map.items()
            ],
            key=lambda x: -x["pct_of_responses"],
        )

        return {
            "total":         total,
            "overall_score": avg_score,
            "distribution": {
                "negative": {"count": negative, "pct": round((negative / total) * 100, 1)},
                "neutral":  {"count": neutral,  "pct": round((neutral  / total) * 100, 1)},
                "positive": {"count": positive, "pct": round((positive / total) * 100, 1)},
            },
            "top_topics": topics[:10],
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/sentiment/over-time ──────────────────────────────────────────────

@router.get("/over-time")
async def get_over_time(
    granularity:      str           = Query("monthly"),
    business_unit:    Optional[str] = Query(None),
    department:       Optional[str] = Query(None),
    location:         Optional[str] = Query(None),
    tenure:           Optional[str] = Query(None),
    job_level:        Optional[str] = Query(None),
    include_inactive: str           = Query("No"),
):
    try:
        sentiments = _read("sentiments.json")
        responses  = _filter(
            sentiments["responses"],
            business_unit, department, location, tenure, job_level, include_inactive,
        )

        monthly = {}
        for r in responses:
            key = r.get("month") or "Unknown"
            if key not in monthly:
                monthly[key] = []
            monthly[key].append(r.get("score", 0))

        trend = [
            {
                "month":          month,
                "positive_score": round(sum(1 for s in scores if s > 0.2)  / len(scores), 2),
                "negative_score": round(sum(1 for s in scores if s < -0.2) / len(scores), 2),
                "avg_score":      round(sum(scores) / len(scores), 2),
            }
            for month, scores in monthly.items()
        ]

        return {"trend": trend, "granularity": granularity, "total_filtered": len(responses)}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/sentiment/samples ────────────────────────────────────────────────

@router.get("/samples")
async def get_samples(
    label:            Optional[str] = Query(None),
    limit:            int           = Query(3),
    page:             int           = Query(1),
    include_inactive: str           = Query("No"),
):
    try:
        sentiments = _read("sentiments.json")
        filtered   = sentiments["responses"]

        if include_inactive == "No":
            filtered = [r for r in filtered if r.get("is_active") is not False]
        if label:
            filtered = [r for r in filtered if r.get("label") == label]

        total   = len(filtered)
        offset  = (page - 1) * limit
        samples = [
            {"text": r.get("text"), "score": r.get("score"), "label": r.get("label")}
            for r in filtered[offset: offset + limit]
        ]

        return {
            "samples": samples,
            "total":   total,
            "label":   label,
            "page":    page,
            "pages":   math.ceil(total / limit) if limit else 0,
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── GET /api/sentiment/validate-statistical ───────────────────────────────────

BASE_QUESTION = "OP1"

CATEGORY_REPS = {
    "Career Growth": "OP32",
    "Recognition":   "OP21",
    "Leadership":    "OP5",
    "Compensation":  "OP22",
    "Wellbeing":     "OP24",
}


@router.get("/validate-statistical")
async def validate_statistical():
    try:
        sentiments = _read("sentiments.json")
        responses  = _read("responses.json")
        questions  = _read("questions.json")

        base_scores = [
            r.get("scores", {}).get(BASE_QUESTION)
            for r in responses
            if r.get("scores", {}).get(BASE_QUESTION) is not None
        ]

        computed_stats = []
        for driver, op_id in CATEGORY_REPS.items():
            other_scores = [
                r.get("scores", {}).get(op_id)
                for r in responses
                if r.get("scores", {}).get(op_id) is not None
            ]
            n         = min(len(base_scores), len(other_scores))
            r_val     = pearson_r(base_scores[:n], other_scores[:n]) if n >= 10 else 0
            abs_r     = abs(r_val)
            strength  = "Strong" if abs_r >= 0.5 else ("Moderate" if abs_r >= 0.2 else "Weak")
            direction = "positive" if r_val >= 0 else "negative"
            q         = next((q for q in (questions or []) if q.get("id") == op_id), None)
            computed_stats.append({
                "driver":   driver,
                "question": q.get("text") if q else op_id,
                "r_value":  r_val,
                "finding":  f"{strength} {direction} impact on Engagement (r = {r_val})",
            })

        topic_map = {}
        for r in sentiments["responses"]:
            for topic in (r.get("topics") or []):
                if topic not in topic_map:
                    topic_map[topic] = []
                topic_map[topic].append(r.get("score", 0))

        if not topic_map:
            return {
                "validation": [],
                "message": "No sentiment data available yet. Run sentiment classification first.",
            }

        topic_sentiments = [
            {
                "topic":         topic,
                "avg_sentiment": round(sum(scores) / len(scores), 2),
            }
            for topic, scores in topic_map.items()
        ]

        prompt = f"""You are an HR analytics expert.
Compare NLP sentiment findings from open-text employee responses against
real statistical Pearson correlation findings computed from survey data.

For each driver, determine if what employees say in text aligns with what the numbers show statistically.

Topic sentiment from NLP open-text analysis:
{json.dumps(topic_sentiments)}

Statistical correlations (computed dynamically from real uploaded data):
{json.dumps(computed_stats)}

Return ONLY a JSON object with key "validation" containing an array, no explanation, no markdown:
{{ "validation": [{{
  "driver": "<name>",
  "statistical_finding": "<one sentence>",
  "r_value": <number>,
  "sentiment_alignment": "Consistent" | "Partially Consistent" | "Not Consistent",
  "validation_score": <integer 0-100>,
  "reasoning": "<one sentence explaining the alignment judgment>"
}}] }}"""

        data = await call_llm_json([{"role": "user", "content": prompt}], 800)
        return {"validation": data.get("validation") or data}

    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── POST /api/sentiment/classify ──────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    responses: list


@router.post("/classify")
async def classify(req: ClassifyRequest):
    try:
        BATCH_SIZE = 20
        results    = []

        for i in range(0, len(req.responses), BATCH_SIZE):
            batch      = req.responses[i: i + BATCH_SIZE]
            classified = await classify_batch(batch)
            for idx, c in enumerate(classified):
                results.append({**batch[idx], **c})

        (_DATA / "sentiments.json").write_text(
            json.dumps({"responses": results}, indent=2),
            encoding="utf-8",
        )

        return {"success": True, "classified": len(results)}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
