"""
Shared mtime-keyed response cache.

All routes import `load_responses` from here so the 77MB responses.json
is parsed at most once per server process (or once per upload).
"""

import json
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"
_SAMPLE  = _DATA / "sample"

_cache: dict = {"mtime": None, "data": None}


def load_responses() -> list:
    """Return parsed responses.json, re-reading only when the file changes."""
    fp = _DATA / "responses.json"
    if not fp.exists():
        fp = _SAMPLE / "responses.json"
    if not fp.exists():
        return []
    try:
        mtime = fp.stat().st_mtime
        if _cache["mtime"] == mtime and _cache["data"] is not None:
            return _cache["data"]
        data = json.loads(fp.read_text(encoding="utf-8"))
        _cache["mtime"] = mtime
        _cache["data"]  = data
        return data
    except Exception:
        return []


def invalidate():
    """Force cache miss on next call (called after upload replaces responses.json)."""
    _cache["mtime"] = None
    _cache["data"]  = None
