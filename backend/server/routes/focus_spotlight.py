import json
import os
from pathlib import Path
from typing  import Optional

from fastapi           import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic          import BaseModel
import httpx

from routes.auth        import data_company, get_current_user
from lib.segment_engine import compute_segments, precompute_and_save

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"
_SAMPLE  = _DATA / "sample"


def _resolve_data_file(filename: str) -> Path:
    """Prefer the real uploaded data dir, fall back to the bundled sample data."""
    primary = _DATA / filename
    return primary if primary.exists() else (_SAMPLE / filename)


def _load_precomputed() -> dict | None:
    fp = _DATA / "spotlight_segments.json"
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return None


class ResultsRequest(BaseModel):
    business:      Optional[str]  = None
    min_n:         Optional[int]  = None
    active_filter: Optional[str]  = 'all'   # 'all' | 'active' | 'inactive'
    scope:         Optional[dict] = None    # e.g. {"gender": "Female", "generation": "Gen Z"}


class InsightRequest(BaseModel):
    segments: list
    group_mean: float
    group_std:  float


# == GET /api/focus-spotlight/filters ==
@router.get("/filters")
def get_filters(user: dict = Depends(get_current_user)):
    """Available filter values + what the data actually contains."""
    fp = _resolve_data_file("businesses.json")
    businesses = json.loads(fp.read_text(encoding="utf-8")) if fp.exists() else []
    biz_names  = sorted({b.get("name", "") for b in businesses if b.get("name")})

    if user and user.get("role") == "company":
        co = data_company(user)
        if co:
            biz_names = [co] if co in biz_names else []

    has_active = has_inactive = False
    dim_values: dict = {}   # { dimension: [sorted unique values] }

    resp_fp = _resolve_data_file("responses.json")
    if resp_fp.exists():
        try:
            rows = json.loads(resp_fp.read_text(encoding="utf-8"))

            # Collect unique values per dimension
            DIM_FIELDS = {
                "gender":      "gender",
                "generation":  "generation",
                "tenure":      "tenure",
                "job_level":   "job_level",
                "is_manager":  "is_manager",
            }
            buckets: dict = {k: set() for k in DIM_FIELDS}

            for r in rows:
                # active/inactive check
                val = str(r.get("is_active", "true")).strip().lower()
                if val in ("false", "0", "no"):
                    has_inactive = True
                else:
                    has_active = True

                # collect dimension values
                for dim, field in DIM_FIELDS.items():
                    raw = r.get(field)
                    if raw is None:
                        continue
                    if dim == "is_manager":
                        label = "Manager" if str(raw).lower() in ("true", "1", "yes") else "Non-Manager"
                    else:
                        label = str(raw).strip()
                    if label and label.lower() not in ("none", "nan", "n/a", ""):
                        buckets[dim].add(label)

            dim_values = {dim: sorted(vals) for dim, vals in buckets.items() if vals}

        except Exception:
            has_active = has_inactive = True

    return {
        "businesses":   biz_names,
        "has_active":   has_active,
        "has_inactive": has_inactive,
        "dimensions":   dim_values,
    }


# == POST /api/focus-spotlight/results ==
@router.post("/results")
def get_results(req: ResultsRequest, user: dict = Depends(get_current_user)):
    """
    Return spotlight segments.
    Uses cached spotlight_segments.json when no business filter is set;
    otherwise recomputes scoped to that business.
    """
    business = req.business if req.business and req.business not in ('All', '') else None
    min_n    = req.min_n or 30

    # Company role: lock to their own business
    if user and user.get("role") == "company":
        co = data_company(user)
        if co:
            business = co

    active_filter = (req.active_filter or 'all').lower()
    scope = {k: v for k, v in (req.scope or {}).items() if v and v != 'All'}

    # No filters at all → serve precomputed cache (fastest path)
    if not business and active_filter == 'all' and not scope:
        cached = _load_precomputed()
        if cached:
            return cached

    # Any scoped filter → compute fresh
    result = compute_segments(
        business=business,
        min_n=min_n,
        active_filter=active_filter,
        filters=scope if scope else None,
    )
    if not result:
        return {
            "summary":    {"total_segments": 0, "total_respondents": 0,
                           "group_mean": 0, "group_std": 0, "band_counts": {}},
            "thresholds": {},
            "segments":   [],
        }

    return result


# == POST /api/focus-spotlight/precompute ==
@router.post("/precompute")
def trigger_precompute(_: dict = Depends(get_current_user)):
    """Recompute and cache segments for all businesses. Call after new data upload."""
    result = precompute_and_save()
    if not result:
        raise HTTPException(status_code=400, detail="No response data available to compute")
    return {
        "success":           True,
        "total_segments":    result["summary"]["total_segments"],
        "total_respondents": result["summary"]["total_respondents"],
    }


# == POST /api/focus-spotlight/insight ==
@router.post("/insight")
async def generate_insight(req: InsightRequest, _: dict = Depends(get_current_user)):
    """
    Stream an LLM-generated narrative summary of the top outlier segments.
    Uses Cerebras streaming (SSE). Returns text/event-stream.
    The LLM only summarises the precomputed statistics — it does no enumeration.
    """
    top = req.segments[:8]
    if not top:
        raise HTTPException(status_code=400, detail="No segments provided")

    lines = []
    for s in top:
        direction = "above" if s.get("z_score", 0) > 0 else "below"
        lines.append(
            f"- {s['label']}: score {s['mean']} "
            f"({s['vs_mean']} vs mean, {s['z_abs']} SD {direction}, "
            f"n={s['n']}, p={s['p_value']}, band={s['band']})"
        )

    prompt = (
        f"You are an HR analytics assistant. "
        f"The overall engagement mean is {req.group_mean:.2f} (SD = {req.group_std:.4f}).\n\n"
        f"Top demographic outlier segments (ranked by deviation):\n"
        + "\n".join(lines)
        + "\n\nWrite 3–5 sentences summarising the key patterns. "
        "Identify which groups need attention and which are thriving. "
        "Be specific, use the numbers, and keep a professional tone. "
        "No bullet points, no headers."
    )

    messages = [
        {"role": "system", "content": "You are a concise HR analytics assistant. Respond in plain prose only."},
        {"role": "user",   "content": prompt},
    ]

    async def _stream():
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    "https://api.cerebras.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {os.getenv('CEREBRAS_API_KEY')}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "model":       os.getenv("CEREBRAS_MODEL", "llama3.1-70b"),
                        "messages":    messages,
                        "max_tokens":  300,
                        "temperature": 0.3,
                        "stream":      True,
                    },
                ) as r:
                    async for line in r.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            yield "data: [DONE]\n\n"
                            return
                        try:
                            chunk = json.loads(data)
                            delta = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                yield f"data: {json.dumps({'content': delta})}\n\n"
                        except Exception:
                            continue
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
