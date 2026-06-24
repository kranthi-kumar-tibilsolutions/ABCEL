import json
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from routes.auth import data_company, get_current_user
from lib.cache   import load_responses

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"
_SAMPLE  = _DATA / "sample"

_FILES  = ["businesses.json", "units.json", "clusters.json", "cohorts.json", "meta.json"]


def _read(file: str):
    fp = _DATA / file
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return None


def _is_company(user: dict) -> bool:
    return user.get("role") == "company"


# == GET /api/status ==
@router.get("/status")
def get_status():
    ready = (_DATA / "businesses.json").exists()
    return {"ready": ready}


# == GET /api/meta ==
@router.get("/meta")
def get_meta(user: dict = Depends(get_current_user)):
    data = _read("meta.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")

    if not _is_company(user):
        return data

    co = data_company(user)
    if not co:
        return data

    # Recompute meta from company's own businesses/units data
    businesses = _read("businesses.json") or []
    units      = _read("units.json") or []

    biz  = next((b for b in businesses if b["name"] == co), None)
    biz_units = [u for u in units if u.get("business") == co]

    if not biz_units:
        return data

    scores = [u.get("overall") or u.get("score") or 0 for u in biz_units]
    top_bu    = max(biz_units, key=lambda u: u.get("overall") or u.get("score") or 0)
    lowest_bu = min(biz_units, key=lambda u: u.get("overall") or u.get("score") or 0)

    scoped = dict(data)
    scoped["total_businesses"]  = 1
    scoped["total_units"]       = len(biz_units)
    scoped["total_respondents"] = biz.get("respondent_count", 0) if biz else sum(
        u.get("respondent_count", 0) for u in biz_units
    )
    scoped["group_avg"]         = biz.get("overall", 0) if biz else (
        round(sum(scores) / len(scores), 2) if scores else 0
    )
    scoped["top_business"]      = top_bu["name"]
    scoped["top_score"]         = top_bu.get("overall") or top_bu.get("score") or 0
    scoped["lowest_business"]   = lowest_bu["name"]
    scoped["lowest_score"]      = lowest_bu.get("overall") or lowest_bu.get("score") or 0

    # Category averages from company BUs
    cat_totals: dict = defaultdict(float)
    cat_counts: dict = defaultdict(int)
    for u in biz_units:
        for cat, val in (u.get("categories") or {}).items():
            cat_totals[cat] += val
            cat_counts[cat] += 1
    if cat_totals:
        scoped["category_averages"] = {
            cat: round(cat_totals[cat] / cat_counts[cat], 2)
            for cat in cat_totals
        }

    return scoped


# == GET /api/businesses ==
@router.get("/businesses")
def get_businesses(user: dict = Depends(get_current_user)):
    data = _read("businesses.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")

    if not _is_company(user):
        return data

    co = data_company(user)
    return [b for b in data if b["name"] == co] if co else data


# == GET /api/units ==
@router.get("/units")
def get_units(
    business: Optional[str] = Query(None),
    cluster:  Optional[str] = Query(None),
    limit:    Optional[int] = Query(None),
    user:     dict          = Depends(get_current_user),
):
    data = _read("units.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")

    result = data

    # Company-role: restrict to their company first
    if _is_company(user):
        co = data_company(user)
        if co:
            result = [u for u in result if u.get("business") == co]

    if business:
        result = [u for u in result if u.get("business") == business]
    if cluster:
        result = [u for u in result if u.get("cluster") == cluster]
    if limit is not None:
        result = result[:limit]
    return result


# == GET /api/clusters ==
@router.get("/clusters")
def get_clusters(user: dict = Depends(get_current_user)):
    data = _read("clusters.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")

    if not _is_company(user):
        return data

    co = data_company(user)
    if not co:
        return data

    return {
        cluster: [bu for bu in bus if bu.get("business") == co]
        for cluster, bus in data.items()
    }


# == GET /api/cohorts ==
@router.get("/cohorts")
def get_cohorts(user: dict = Depends(get_current_user)):
    data = _read("cohorts.json")
    if data is None:
        return {"gender": [], "generation": [], "tenure": [], "job_band": []}

    if not _is_company(user):
        return data

    co = data_company(user)
    if not co:
        return data

    # Recompute cohort breakdowns from raw responses filtered to this company
    responses = load_responses()
    if not responses:
        return data

    company_rows = [r for r in responses if r.get("business") == co]
    if not company_rows:
        return data

    score_keys = ["engagement", "development_and_career", "leadership",
                  "performance_culture", "manager_effectiveness", "overall"]

    cat_map = {
        "engagement":             "Engagement",
        "development_and_career": "Development and Career",
        "leadership":             "Leadership",
        "performance_culture":    "Performance Culture",
        "manager_effectiveness":  "Manager Effectiveness",
    }

    def _compute_cohort(rows: list, dim_key: str) -> list:
        groups: dict = defaultdict(list)
        for r in rows:
            val = r.get(dim_key)
            if val:
                groups[val].append(r)

        result = []
        for name, grp in groups.items():
            overall_vals = [r.get("overall") or 0 for r in grp if r.get("overall")]
            avg_overall  = round(sum(overall_vals) / len(overall_vals), 2) if overall_vals else 0

            cats = {}
            for sk, label in cat_map.items():
                vals = [r.get(sk) or 0 for r in grp if r.get(sk)]
                cats[label] = round(sum(vals) / len(vals), 2) if vals else 0

            result.append({
                "name":             name,
                "overall":          avg_overall,
                "categories":       cats,
                "respondent_count": len(grp),
            })

        return sorted(result, key=lambda x: x["overall"], reverse=True)

    dim_field_map = {
        "age_group":  "age_group",
        "generation": "generation",
        "gender":     "gender",
        "job_band":   "job_level",
        "tenure":     "tenure",
    }

    return {
        dim: _compute_cohort(company_rows, field)
        for dim, field in dim_field_map.items()
    }


# == POST /api/load-sample ==
@router.post("/load-sample")
def load_sample():
    copied = 0
    _DATA.mkdir(parents=True, exist_ok=True)
    for file in _FILES:
        src  = _SAMPLE / file
        dest = _DATA   / file
        if src.exists():
            shutil.copy2(str(src), str(dest))
            copied += 1
    if copied == 0:
        raise HTTPException(status_code=404, detail="No sample data found")
    return {"success": True, "copied": copied}


# == POST /api/reset ==
@router.post("/reset")
def reset():
    for file in _FILES:
        fp = _DATA / file
        if fp.exists():
            fp.unlink()
    return {"success": True}
