import json
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router  = APIRouter()
_DATA   = Path("./backend/data")
_SAMPLE = Path("./backend/data/sample")

_FILES  = ["businesses.json", "units.json", "clusters.json", "cohorts.json", "meta.json"]


def _read(file: str):
    fp = _DATA / file
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return None


# == GET /api/status — health check: does data exist? ==
@router.get("/status")
async def get_status():
    ready = (_DATA / "businesses.json").exists()
    return {"ready": ready}


# == GET /api/meta — survey metadata ==
@router.get("/meta")
async def get_meta():
    data = _read("meta.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")
    return data


# == GET /api/businesses — all businesses sorted by overall desc ==
@router.get("/businesses")
async def get_businesses():
    data = _read("businesses.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")
    return data


# == GET /api/units?business=&cluster=&limit= ==
@router.get("/units")
async def get_units(
    business: Optional[str] = Query(None),
    cluster:  Optional[str] = Query(None),
    limit:    Optional[int] = Query(None),
):
    data = _read("units.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")
    result = data
    if business:
        result = [u for u in result if u.get("business") == business]
    if cluster:
        result = [u for u in result if u.get("cluster")  == cluster]
    if limit is not None:
        result = result[:limit]
    return result


# == GET /api/clusters ==
@router.get("/clusters")
async def get_clusters():
    data = _read("clusters.json")
    if data is None:
        raise HTTPException(status_code=404, detail="No data loaded")
    return data


# == GET /api/cohorts — returns empty buckets if no data ==
@router.get("/cohorts")
async def get_cohorts():
    data = _read("cohorts.json")
    if data is None:
        return {"gender": [], "generation": [], "tenure": [], "job_band": []}
    return data


# == POST /api/load-sample — copy sample data into live data dir ==
@router.post("/load-sample")
async def load_sample():
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


# == POST /api/reset — delete all data files ==
@router.post("/reset")
async def reset():
    for file in _FILES:
        fp = _DATA / file
        if fp.exists():
            fp.unlink()
    return {"success": True}
