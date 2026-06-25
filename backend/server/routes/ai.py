import os
import json
import asyncio
import re
from pathlib import Path
from typing import Optional, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from lib.llm   import call_llm
from lib.cache import load_responses
from routes.auth import data_company, get_current_user

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"


# ── Data helper ───────────────────────────────────────────────────────────────

def get_n(b: dict) -> int:
    """Read respondent count from either 'respondent_count' or 'n' field."""
    return b.get('respondent_count') or b.get('n') or 0


THEME_KEYS = [
    'engagement',
    'leadership',
    'performance_culture',
    'development_and_career',
    'manager_effectiveness',
]


def _read(file: str):
    fp = _DATA / file
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return None


# mtime-keyed cache for full precomputed chat data (group users only)
_full_chat_data_cache: dict = {"mtime": None, "data": None}


# ── Repair truncated JSON (JS parseJSON — exact line-by-line translation) ─────

def _parse_json(raw: str) -> dict:
    text = re.sub(r"```json\n?|```", "", raw).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    if start < 0:
        raise ValueError("No JSON object found in response")
    s = text[start:]

    in_str = False
    esc    = False
    stack  = []
    last_safe_end = -1

    for i, c in enumerate(s):
        if esc:
            esc = False
            continue
        if c == "\\" and in_str:
            esc = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if   c == "{": stack.append("}")
        elif c == "[": stack.append("]")
        elif c in ("}", "]"):
            if stack:
                stack.pop()
            if not stack:
                last_safe_end = i + 1

    if last_safe_end > 0:
        try:
            return json.loads(s[:last_safe_end])
        except json.JSONDecodeError:
            pass

    # Repair truncated response
    repaired = s[:s.rfind('"')] if in_str else s
    repaired = re.sub(r',?\s*"[^"]*$', "", repaired)
    repaired = re.sub(r':\s*[\w.]*$',  "", repaired)
    repaired = re.sub(r',\s*$',        "", repaired)
    repaired = repaired.rstrip()

    closers = "".join(reversed(stack))
    try:
        return json.loads(repaired + closers)
    except json.JSONDecodeError:
        pass

    raise ValueError("Could not parse or repair AI JSON response")


# ── Build shared LLM data context ─────────────────────────────────────────────

def _build_context(dimension: str = "Business Unit", user: Optional[dict] = None) -> str:
    meta       = _read("meta.json")       or {}
    businesses = _read("businesses.json") or []
    clusters   = _read("clusters.json")   or {}
    cohorts    = _read("cohorts.json")    or {}

    # Scope data to company if company-role user
    if user and user.get("role") == "company":
        co = data_company(user)
        if co:
            businesses = [b for b in businesses if b["name"] == co]
            clusters   = {k: [bu for bu in v if bu.get("business") == co]
                          for k, v in clusters.items()}
            units = _read("units.json") or []
            company_units = [u for u in units if u.get("business") == co]
            biz = businesses[0] if businesses else None
            meta = dict(meta)
            meta["total_businesses"]  = 1
            meta["total_units"]       = len(company_units)
            meta["total_respondents"] = biz.get("respondent_count", 0) if biz else 0
            meta["group_avg"]         = biz.get("overall", 0) if biz else 0
            if company_units:
                top_bu = max(company_units, key=lambda u: u.get("overall") or 0)
                low_bu = min(company_units, key=lambda u: u.get("overall") or 0)
                meta["top_business"]    = top_bu["name"]
                meta["top_score"]       = top_bu.get("overall")
                meta["lowest_business"] = low_bu["name"]
                meta["lowest_score"]    = low_bu.get("overall")

    sorted_biz = sorted(businesses, key=lambda b: b.get("overall") or 0, reverse=True)

    def _fmt(items, suffix=""):
        # exclude noise: n<30 and "DOB not Available"; sort highest first
        valid = [c for c in (items or []) if get_n(c) >= 30 and c.get("name") != "DOB not Available"]
        valid.sort(key=lambda c: c.get("overall") or 0, reverse=True)
        return ", ".join(f"{c['name']}={c.get('overall')}{suffix} (n={c.get('respondent_count')})" for c in valid)

    # All businesses with overall + key category scores so the LLM can answer
    # company-specific questions (e.g. "what is Novel Jewels leadership score?")
    def _biz_line(b):
        cats = b.get("categories", {})
        cat_parts = ", ".join(f"{k}={v}" for k, v in cats.items() if v)
        n = get_n(b)
        n_str = f" n={n}" if n else ""
        return f"{b['name']}: {b['overall']} ({b.get('band','')}{n_str}) [{cat_parts}]"

    biz_lines = "\n".join(_biz_line(b) for b in sorted_biz)

    cluster_lines   = ", ".join(f"{k}: {len(v or [])} BUs" for k, v in clusters.items())
    gender_line     = _fmt(cohorts.get("gender"))
    generation_line = _fmt(cohorts.get("generation"))
    age_group_line  = _fmt(cohorts.get("age_group"))
    job_band_line   = _fmt(cohorts.get("job_band"))
    tenure_line     = _fmt(cohorts.get("tenure"), " yrs")

    # Cohort breakdown per business (generation) for cross-company cohort questions
    units = _read("units.json") or []
    cohort_by_biz = {}
    for u in units:
        bname = u.get("business") or u.get("name", "")
        if bname and u.get("cohorts"):
            cohort_by_biz[bname] = u["cohorts"]
    cohort_lines = ""
    if cohort_by_biz:
        cohort_lines = "\n\nPER-BUSINESS COHORT DATA (generation overall scores):\n"
        for bname, bc in cohort_by_biz.items():
            gen = bc.get("generation", [])
            if gen:
                gen_str = ", ".join(f"{g['name']}={g['overall']}(n={g.get('respondent_count','')})" for g in gen if g.get("overall"))
                cohort_lines += f"{bname}: {gen_str}\n"

    return f"""ABG Vibes Employee Survey — {meta.get("survey_name", "2026")}
Respondents: {meta.get("total_respondents", 55457)} | Businesses: {meta.get("total_businesses", len(businesses))} | BUs: {meta.get("total_units", 415)}
Group avg: {meta.get("group_avg", 4.46)}/5 | Top: {meta.get("top_business")} ({meta.get("top_score")}) | Lowest: {meta.get("lowest_business")} ({meta.get("lowest_score")})
Strongest category: {meta.get("strongest_category")} | Weakest: {meta.get("weakest_category")}
Dimension: {dimension}

ALL BUSINESSES (sorted highest to lowest — every company in the survey):
{biz_lines}

CLUSTERS (EXACT 5 NAMES — ONLY THESE EXIST):
thriving | healthy | atrisk (At Risk) | polarised | critical
Cluster count: {cluster_lines}
CRITICAL: If a user asks about any cluster name NOT in the above 5 (e.g. "Open Conflict", "High Tension", "Engaged"), do NOT invent it or describe it.
Say: "That cluster name is not in our system. The ABG Vibes 2026 system has 5 clusters: Thriving, Healthy, At Risk, Polarised, and Critical. Which would you like to explore?"
AGE-TO-GENERATION MAPPING (survey year 2026): <21=Gen Z, 21-25=Gen Z, 25-30=Gen Z/Gen Y, 30-35=Gen Y, 35-40=Gen Y, 40-45=Gen X, 45-50=Gen X, 50-55=Gen X/Baby Boomer, >55=Baby Boomer
GENDER BREAKDOWN: {gender_line}
GENERATION BREAKDOWN (Gen Z / Gen Y / Gen X / Baby Boomer — NOT age bands): {generation_line}
AGE BAND BREAKDOWN (numeric bands like 25-30, 30-35 etc — use these for any "age group" question): {age_group_line or "(not in dataset)"}
JOB BAND: {job_band_line}
TENURE (years): {tenure_line}{cohort_lines}""".strip()


# ── Non-streaming LLM call + JSON parse ──────────────────────────────────────

async def _llm_json(messages: list, max_tokens: int = 600, json_mode: bool = True) -> dict:
    r = await call_llm(messages, max_tokens=max_tokens, json_mode=json_mode)
    if not r.is_success:
        try:
            e = r.json()
        except Exception:
            e = {}
        msg = (e.get("error") or {}).get("message") or f"LLM HTTP {r.status_code}"
        raise RuntimeError(msg)
    data    = r.json()
    content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
    if not content:
        raise RuntimeError("AI returned empty response. Please retry.")
    return _parse_json(content)


# ── agentStep — retry once on empty content ───────────────────────────────────

async def _agent_step(messages: list, max_tokens: int, step_label: str) -> dict:
    last_err = None
    for attempt in range(3):
        if attempt > 0:
            delay = 2 if attempt == 1 else 4
            print(f"[AGENT] {step_label} attempt {attempt+1} after {delay}s — {last_err}")
            await asyncio.sleep(delay)
        r = await call_llm(messages, max_tokens=max_tokens, json_mode=False)
        if not r.is_success:
            try:
                e = r.json()
            except Exception:
                e = {}
            msg = (e.get("error") or {}).get("message") or f"HTTP {r.status_code}"
            raise RuntimeError(f"{step_label} failed: {msg}")
        data    = r.json()
        content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
        if not content:
            last_err = "empty content"
            continue
        try:
            return _parse_json(content)
        except (ValueError, json.JSONDecodeError) as e:
            last_err = str(e)
            continue
    raise RuntimeError(f"{step_label} returned unparseable JSON after 3 attempts")


# ── Request models ────────────────────────────────────────────────────────────

class SummaryRequest(BaseModel):
    dimension: str = "Business Unit"

class BusinessInsightRequest(BaseModel):
    businessName: Optional[str] = None
    business:     Optional[str] = None

class ChatRequest(BaseModel):
    message:             str
    history:             List[dict] = []
    dimension:           str = "Business Unit"
    focusArea:           Optional[str]  = None
    companyFilter:       Optional[str]  = None
    active_context:      Optional[dict] = None

class SkillAnalysisRequest(BaseModel):
    skill:     Optional[str]       = None
    skills:    Optional[List[str]] = None
    dimension: str = "Business Unit"


# ── CALL 1: AI Executive Summary ──────────────────────────────────────────────

@router.post("/summary")
async def get_summary(req: SummaryRequest, user: dict = Depends(get_current_user)):
    prompt = f"""You are an expert HR analytics AI for Aditya Birla Group.
Generate an executive summary of engagement data analysed by {req.dimension} dimension.

DATA:
{_build_context(req.dimension, user)}

Respond ONLY with valid JSON (no markdown, no backticks):
{{
  "bullets": [
    "Specific finding 1 with numbers",
    "Specific finding 2 with numbers",
    "Specific finding 3 with numbers",
    "Specific finding 4 with numbers"
  ],
  "takeaway": "One actionable sentence for HR leadership",
  "whyMatters": "One sentence on business impact"
}}"""

    try:
        return await _llm_json([{"role": "user", "content": prompt}], max_tokens=800)
    except Exception as err:
        print(f"Summary error: {err}")
        raise HTTPException(status_code=500, detail=str(err))


# ── CALL 2: Right Panel AI Insights ──────────────────────────────────────────

@router.post("/insights")
async def get_insights(user: dict = Depends(get_current_user)):
    prompt = f"""You are an HR analytics AI for ABG. Analyse this data.

DATA:
{_build_context(user=user)}

Respond ONLY with valid JSON:
{{
  "topTrends": [
    {{ "direction": "up",   "text": "specific trend with numbers" }},
    {{ "direction": "up",   "text": "specific trend with numbers" }},
    {{ "direction": "down", "text": "specific trend with numbers" }}
  ],
  "outliers": [
    {{ "direction": "down", "text": "specific outlier with business name" }},
    {{ "direction": "down", "text": "specific outlier with business name" }},
    {{ "direction": "down", "text": "specific outlier with business name" }}
  ],
  "summary": "2-sentence overall summary"
}}"""

    try:
        return await _llm_json([{"role": "user", "content": prompt}], max_tokens=700)
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── CALL 3: Business Drill-Down AI Insight ────────────────────────────────────

@router.post("/business-insight")
async def get_business_insight(req: BusinessInsightRequest, user: dict = Depends(get_current_user)):
    name       = req.businessName or req.business
    businesses = _read("businesses.json") or []
    # Company-role: verify the requested business belongs to them
    if user.get("role") == "company":
        co = data_company(user)
        businesses = [b for b in businesses if b["name"] == co]
    meta       = _read("meta.json")       or {}
    biz        = next((b for b in businesses if b.get("name") == name), None)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    prompt = f"""You are an HR analytics AI. Analyse this business.

Business: {biz["name"]}
Overall: {biz.get("overall")}/5 (group avg: {meta.get("group_avg")})
Categories: {json.dumps(biz.get("categories", {}))}
Band: {biz.get("band")}
Rank: #{biz.get("rank")} of {len(businesses)}

Respond ONLY with valid JSON:
{{
  "strength":       "What this business does best — 1 sentence with specific score",
  "risk":           "Biggest risk area — 1 sentence with specific score",
  "cohortToWatch":  "Which cohort needs attention — 1 sentence",
  "recommendation": "Top HR action — 1 concrete sentence"
}}"""

    try:
        p = await _llm_json([{"role": "user", "content": prompt}], max_tokens=400)
        return {
            "summary":         p.get("strength") or p.get("risk") or "",
            "strengths":       [p["strength"]]       if p.get("strength")       else [],
            "concerns":        [x for x in [p.get("risk"), p.get("cohortToWatch")] if x],
            "recommendations": [p["recommendation"]] if p.get("recommendation") else [],
            "strength":        p.get("strength"),
            "risk":            p.get("risk"),
            "cohortToWatch":   p.get("cohortToWatch"),
            "recommendation":  p.get("recommendation"),
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── CALL 4: Chat with Data — SSE Streaming ────────────────────────────────────

def _build_units_from_responses(responses: list, businesses: list) -> list:
    """
    Fallback: build a units-like list from responses.json when units.json is missing.
    Groups by business only (no sub-BU field in responses.json), so each company
    becomes a single BU entry. Saves result to units.json for future requests.
    """
    from collections import defaultdict as _dd

    biz_map = _dd(list)
    for r in responses:
        bname = r.get("business", "")
        if bname:
            biz_map[bname].append(r)

    biz_lookup = {b["name"]: b for b in businesses}
    units_out = []
    for bname, rows in biz_map.items():
        theme_scores = {}
        for tk in THEME_KEYS:
            vals = [r[tk] for r in rows if r.get(tk) and r[tk] > 0]
            theme_scores[tk] = round(sum(vals) / len(vals), 2) if vals else None
        score_vals = [v for v in theme_scores.values() if v]
        overall = round(sum(score_vals) / len(score_vals), 2) if score_vals else None
        biz_meta = biz_lookup.get(bname, {})
        units_out.append({
            "name":                     bname,
            "business":                 bname,
            "overall":                  overall or biz_meta.get("overall"),
            "band":                     biz_meta.get("band"),
            "categories":               {k: v for k, v in theme_scores.items() if v},
            "respondent_count":         len(rows),
            "cluster":                  biz_meta.get("cluster"),
            "is_business_level_fallback": True,
        })

    # Persist so we don't recompute on every request
    try:
        fp = _DATA / "units.json"
        fp.write_text(json.dumps(units_out, indent=2), encoding="utf-8")
    except Exception:
        pass
    return units_out


def _compute_full_chat_data(user=None):
    """
    Load businesses.json + responses.json + units.json and compute all demographic
    breakdowns at request time so new uploads are always reflected.
    If units.json is missing, builds it from responses.json as a fallback.
    Returns (businesses, gen_data, gender_data, job_data, tenure_data, manager_data, biz_cohorts, biz_units)
    """
    is_company_user = bool(user and user.get("role") == "company")

    # For non-scoped (group) users: return full cached result if responses.json unchanged
    if not is_company_user:
        try:
            fp = _DATA / "responses.json"
            mtime = fp.stat().st_mtime if fp.exists() else None
            if (mtime and _full_chat_data_cache["mtime"] == mtime
                    and _full_chat_data_cache["data"] is not None):
                return _full_chat_data_cache["data"]
        except Exception:
            pass

    businesses = _read("businesses.json") or []
    responses  = load_responses()  # shared mtime cache — avoids 77MB re-parse
    all_units  = _read("units.json")      or []

    # Fallback: build units from responses if units.json is missing or empty
    if not all_units and responses:
        all_units = _build_units_from_responses(responses, businesses)

    # Scope to company for company-role users
    co = None
    if user and user.get("role") == "company":
        co = data_company(user)
        if co:
            responses  = [r for r in responses  if r.get("business") == co]
            businesses = [b for b in businesses if b["name"] == co]
            all_units  = [u for u in all_units  if u.get("business") == co]

    # Group units by business — sorted by score descending for easy LLM lookup
    from collections import defaultdict as _dd
    _biz_units_map = _dd(list)
    for u in all_units:
        bname = u.get("business") or ""
        if bname:
            _biz_units_map[bname].append({
                "name":    u.get("name"),
                "score":   u.get("overall"),
                "n":       u.get("respondent_count"),
                "cluster": u.get("cluster"),
                "band":    u.get("band"),
            })
    biz_units = {bname: sorted(bus, key=lambda u: u.get("score") or 0, reverse=True)
                 for bname, bus in _biz_units_map.items()}

    if not responses:
        return businesses, [], [], [], [], [], {}, biz_units, {}, {}

    def group_scores(rows, label):
        if len(rows) < 10:
            return None
        scores = {}
        for tk in THEME_KEYS:
            vals = [r[tk] for r in rows if r.get(tk) and r[tk] > 0]
            scores[tk] = round(sum(vals) / len(vals), 2) if vals else None
        all_vals = [v for v in scores.values() if v]
        scores['overall'] = round(sum(all_vals) / len(all_vals), 2) if all_vals else None
        return {'label': label, 'n': len(rows), 'scores': scores}

    _noise = {'unknown', 'nan', 'n/a', 'na', 'not available', 'dob not available',
              'job band na', 'not specified', ''}

    def _clean(val):
        return val and str(val).strip().lower() not in _noise

    def _dim_vals(key):
        return list({r[key] for r in responses if _clean(r.get(key))})

    generations = _dim_vals('generation')
    job_levels  = _dim_vals('job_level')
    tenures     = _dim_vals('tenure')

    def _filt(key, val): return [r for r in responses if r.get(key) == val and _clean(r.get(key))]
    def _bfilt(rows, key, val): return [r for r in rows if r.get(key) == val and _clean(r.get(key))]

    gen_data     = [g for g in (group_scores(_filt('generation', g), g) for g in generations) if g]
    gender_data  = [g for g in [
        group_scores([r for r in responses if r.get('gender') == 'Male'],   'Male'),
        group_scores([r for r in responses if r.get('gender') == 'Female'], 'Female'),
    ] if g]
    job_data     = [g for g in (group_scores(_filt('job_level', j), j) for j in job_levels) if g]
    tenure_data  = [g for g in (group_scores(_filt('tenure', t), t) for t in tenures) if g]
    manager_data = [g for g in [
        group_scores([r for r in responses if r.get('is_manager') == 'Yes'], 'People Managers'),
        group_scores([r for r in responses if r.get('is_manager') == 'No'],  'Individual Contributors'),
    ] if g]

    # Per-business cohort breakdown (generation/gender/job_level/tenure within each company)
    biz_cohorts: dict = {}
    for biz in businesses:
        bname    = biz['name']
        biz_rows = [r for r in responses if r.get('business') == bname]
        if len(biz_rows) < 10:
            continue
        biz_gens = [g for g in {r.get('generation') for r in biz_rows} if _clean(g)]
        biz_cohorts[bname] = {
            'n': len(biz_rows),
            'by_generation': [g for g in (group_scores(_bfilt(biz_rows, 'generation', g), g) for g in biz_gens) if g],
            'by_gender':     [g for g in [
                group_scores([r for r in biz_rows if r.get('gender') == 'Male'],   'Male'),
                group_scores([r for r in biz_rows if r.get('gender') == 'Female'], 'Female'),
            ] if g],
            'by_job_level':  [g for g in (group_scores(_bfilt(biz_rows, 'job_level', j), j) for j in job_levels) if g],
            'by_tenure':     [g for g in (group_scores(_bfilt(biz_rows, 'tenure', t), t) for t in tenures) if g],
        }

    # Real demographic totals — read from cohorts.json (always up to date after each upload)
    _cohorts_raw = _read("cohorts.json") or {}
    _meta_raw    = _read("meta.json")    or {}

    def _cohort_n(dimension: str, name: str) -> int:
        return next((get_n(c) for c in _cohorts_raw.get(dimension, [])
                     if c.get("name") == name), 0)

    real_totals = {
        'total_respondents':  _meta_raw.get('total_respondents') or sum(get_n(b) for b in businesses),
        'male':               _cohort_n('gender',     'Male'),
        'female':             _cohort_n('gender',     'Female'),
        'unknown':            _cohort_n('gender',     'Unknown'),
        'gen_y':              _cohort_n('generation', 'Gen Y'),
        'gen_x':              _cohort_n('generation', 'Gen X'),
        'gen_z':              _cohort_n('generation', 'Gen Z'),
        'dob_na':             _cohort_n('generation', 'DOB not Available'),
        'baby_boomer':        _cohort_n('generation', 'Baby Boomer'),
        'junior_management':  _cohort_n('job_band',   'Junior Management'),
        'middle_management':  _cohort_n('job_band',   'Middle Management'),
        'senior_management':  _cohort_n('job_band',   'Senior Management'),
        'tenure_0_2':         _cohort_n('tenure',     '0-2'),
        'tenure_2_5':         _cohort_n('tenure',     '2-5'),
        'tenure_5_10':        _cohort_n('tenure',     '5-10'),
        'tenure_10_15':       _cohort_n('tenure',     '10-15'),
        'tenure_15_20':       _cohort_n('tenure',     '15-20'),
        'tenure_20_25':       _cohort_n('tenure',     '20-25'),
        'tenure_25_plus':     _cohort_n('tenure',     '>25 (Equal or more than 25)'),
    }

    # Sample individual records so the LLM can show real employee profiles
    _DISPLAY_KEYS = ['business', 'generation', 'gender', 'job_level', 'tenure', 'is_manager',
                     'engagement', 'leadership', 'performance_culture', 'development_and_career',
                     'manager_effectiveness', 'overall']
    def _sample(key, val):
        row = next((r for r in responses if r.get(key) == val), None)
        return {k: row[k] for k in _DISPLAY_KEYS if k in row} if row else None

    sample_rows = {
        'Female': _sample('gender', 'Female'),
        'Male':   _sample('gender', 'Male'),
        'Gen Z':  _sample('generation', 'Gen Z'),
        'Gen Y':  _sample('generation', 'Gen Y'),
    }

    result = (businesses, gen_data, gender_data, job_data, tenure_data, manager_data,
              biz_cohorts, biz_units, real_totals, sample_rows)

    # Cache full result for group (non-scoped) users so next request is instant
    if not is_company_user:
        try:
            fp = _DATA / "responses.json"
            mtime = fp.stat().st_mtime if fp.exists() else None
            if mtime:
                _full_chat_data_cache["mtime"] = mtime
                _full_chat_data_cache["data"]  = result
        except Exception:
            pass

    return result


@router.post("/chat")
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    import json as _json

    # Compute full data at request time so new uploads are always reflected
    (businesses, gen_data, gender_data, job_data,
     tenure_data, manager_data, biz_cohorts, biz_units,
     real_totals, sample_rows) = _compute_full_chat_data(user)

    focus_line   = f"\nACTIVE FOCUS AREA: {req.focusArea} — prioritise answers about this theme." if req.focusArea else ""
    company_line = f"\nACTIVE COMPANY FILTER: {req.companyFilter} — answer only about this company unless explicitly asked otherwise." if req.companyFilter else ""

    # Screen-reference detection — must happen BEFORE prior_context_block is built.
    # Instead of an exhaustive keyword list, use two semantic rules:
    #   Rule A — explicit location questions ("what tab", "where am I", "what am I looking at")
    #   Rule B — "this" + a UI word in any order ("what is this screen about",
    #             "explain this page", "thie scrieen about", typos included)
    #   Rule C — standalone short messages that always mean "what am I seeing now?"
    import re as _re2
    _msg_lc = req.message.lower().strip()

    _UI_WORDS   = r"tab|page|screen|section|view|dashboard|panel"
    _RULE_A = bool(_re2.search(
        r"what (tab|page|screen|am i (on|looking at)|is on (screen|this))|"
        r"which (tab|page|screen)|where am i|what am i on",
        _msg_lc
    ))
    # "this" within 6 words of a UI word (handles typos, reorderings)
    _RULE_B = bool(
        _re2.search(r"\bthis\b", _msg_lc) and
        _re2.search(_UI_WORDS, _msg_lc)
    )
    # Explain/describe requests about the current view
    _RULE_B = _RULE_B or bool(_re2.search(
        r"\b(explain|describe|tell me about|show me)\b.{0,40}\b(" + _UI_WORDS + r")\b",
        _msg_lc
    ))
    _SCREEN_REF_SHORT = {"now", "now?", "and now?", "what now", "what now?"}
    _RULE_C = _msg_lc in _SCREEN_REF_SHORT

    _is_screen_ref = _RULE_A or _RULE_B or _RULE_C

    # Also treat as screen-ref if the user NAVIGATED since the last AI response.
    # Detect this by comparing the tab the AI last mentioned with the current active_context.tab.
    # If they differ, history is stale for tab purposes — strip it.
    if not _is_screen_ref and req.active_context and req.history:
        import re as _re
        _cur_tab_label = req.active_context.get("tab", "").replace("_", " ").lower()
        _clean_h = [m for m in req.history if m.get("content", "").strip()]
        for _m in reversed(_clean_h):
            if _m["role"] == "assistant":
                _last_ai = _m["content"].lower()
                _tab_m = _re.search(r"(?:on the|navigated to the)\s+([a-z][a-z\s]+?)\s+tab", _last_ai)
                if _tab_m:
                    _mentioned = _tab_m.group(1).strip()
                    if _mentioned != _cur_tab_label:
                        _is_screen_ref = True  # tab changed — strip stale history
                break

    # Build a "PRIOR CONTEXT" pin from the last 2 exchange pairs so the model
    # doesn't drop the active subject on short follow-up questions.
    # Skip for screen-ref questions — stale tab mentions in prior context poison the answer.
    prior_context_block = ""
    if req.history and not _is_screen_ref:
        clean_hist = [m for m in req.history if m.get("content", "").strip()]
        pairs = []
        i = len(clean_hist) - 1
        while i >= 1 and len(pairs) < 2:
            if clean_hist[i]["role"] == "assistant" and clean_hist[i - 1]["role"] == "user":
                u_text = clean_hist[i - 1]["content"].strip()
                a_text = clean_hist[i]["content"].strip()[:600]
                pairs.append(f'User: "{u_text}"\nYou: "{a_text}{"…" if len(clean_hist[i]["content"]) > 600 else ""}"')
                i -= 2
            else:
                i -= 1
        if pairs:
            prior_context_block = (
                "\n\n--- PRIOR CONTEXT (PIN THIS — read before answering) ---\n"
                "The conversation so far was about:\n"
                + "\n\n".join(reversed(pairs))
                + "\n\nIf the current question is a follow-up (no company/topic named explicitly), "
                "CONTINUE from this context. Do NOT switch to org-wide answers unless the user explicitly asks."
                "\n--- END PRIOR CONTEXT ---"
            )

    # Screen context block
    if req.active_context:
        tab = req.active_context.get("tab", "unknown").replace("_", " ").title()
        ctx_json = _json.dumps(req.active_context, indent=2)
        screen_block = f"""
=== CURRENT SCREEN — AUTHORITATIVE, OVERRIDES ALL PRIOR MESSAGES ===
The user is RIGHT NOW on the "{tab}" tab.
If any previous assistant message mentioned a different tab, IGNORE IT — the user has navigated since then.
When asked "what tab am I on", "what am I looking at", "where am I" — always answer with "{tab}".
SCREEN DATA:
{ctx_json}
When the user says "this persona", "this analysis", "these results", "what I'm looking at" — they mean the above context.
=== END CURRENT SCREEN ===
"""
    else:
        screen_block = ""

    # Fix 1 — weighted average by respondent count (large businesses carry more weight)
    _total_n = sum(get_n(b) for b in businesses)
    group_avg = round(
        sum((b.get('overall') or 0) * get_n(b) for b in businesses) / _total_n, 2
    ) if _total_n > 0 else 4.46

    # Normalize raw category names before injecting into prompt
    _CAT_MAP = {
        'Engagement Index':   'Engagement',
        'Development & Career': 'Development and Career',
        'Performance culture':  'Performance Culture',
    }
    def _norm_cats(cats):
        out = {}
        for k, v in cats.items():
            if k == 'Uncategorized':
                continue
            out[_CAT_MAP.get(k, k)] = v
        return out

    # Compact one-liner per business — avoids indented JSON bloat (~5x smaller)
    def _biz_line_chat(b):
        cats = _norm_cats(b.get("categories", {}))
        cat_str = ", ".join(f"{k}={v}" for k, v in cats.items() if v)
        return f"{b['name']}: {b.get('overall')} ({b.get('band','')}, n={get_n(b)}) [{cat_str}]"

    biz_lines_chat = "\n".join(_biz_line_chat(b) for b in businesses)

    # Compact cohort text — one line per company, gen/gender/job level
    # Includes overall + engagement so follow-up questions like "least engaging age group"
    # can be answered using company-specific data instead of group-wide scores.
    def _cohort_compact(bname, bc):
        def _gs(g):
            s = g['scores']
            parts = [f"overall:{s.get('overall','?')}"]
            if s.get('engagement'):
                parts.append(f"eng:{s['engagement']}")
            return f"{g['label']}={','.join(parts)}(n={g['n']})"
        gens    = ", ".join(_gs(g) for g in bc.get('by_generation', []))
        genders = ", ".join(_gs(g) for g in bc.get('by_gender', []))
        jobs    = ", ".join(f"{g['label']}=overall:{g['scores'].get('overall','?')}"
                            for g in bc.get('by_job_level', []))
        return f"{bname}(n={bc.get('n','')}): {gens} | {genders} | {jobs}"

    cohort_lines = "\n".join(_cohort_compact(k, v) for k, v in biz_cohorts.items())

    # BUSINESS UNITS BY COMPANY — compact one-liner per BU
    bu_section_lines = []
    _is_fallback = any(
        u.get('is_business_level_fallback')
        for bus in biz_units.values() for u in bus
    )
    for bname in sorted(biz_units.keys()):
        bus = biz_units[bname]
        bu_entries = ", ".join(
            f"{u['name']}={u['score']}(n={u['n']})" for u in bus
        )
        bu_section_lines.append(f"{bname}: {bu_entries}")
    bu_block = "\n".join(bu_section_lines)
    total_bu_count = sum(len(v) for v in biz_units.values())
    bu_count_note = (
        f"{len(businesses)} businesses (BU-level detail not yet available — units.json missing)"
        if _is_fallback else
        f"{total_bu_count} BUs across {len(biz_units)} companies"
    )

    # Role-based access scope
    user_role         = user.get("role", "group") if user else "group"
    user_company_name = data_company(user) if user else None

    if user_role == "company" and user_company_name:
        role_block = f"""--- YOUR ACCESS SCOPE — READ THIS FIRST ---
You are logged in as a representative of: {user_company_name}
You ONLY have access to {user_company_name} data.
STRICT RULES:
- Answer ONLY about {user_company_name} and its business units
- If asked about any other company say exactly:
  "I can only show data for {user_company_name}. I do not have access to other companies."
- If asked to compare {user_company_name} with another company say exactly:
  "Comparison with other companies is not available in your access level."
- Never reveal scores, BU names, or cohort data from any other company
- The data sections below already contain only {user_company_name} data — do not reference businesses outside it
CRITICAL COMPANY LOCK: If a user asks about a company or BU that does not appear anywhere in the data sections below, it means they are asking about a company they have no access to. Do NOT fuzzy-match it to {user_company_name} or suggest {user_company_name} as a substitute. Do NOT say "the closest match is {user_company_name}". Say exactly: "I can only show data for {user_company_name}. I do not have access to other companies."
"""
    else:
        role_block = """--- YOUR ACCESS SCOPE ---
You are logged in as a Group HR user.
You have full access to all 22 businesses, all 415 BUs, and all cohort data.
Answer any question about any business, BU, or cohort freely.
"""

    _tot = max(real_totals.get('total_respondents', 0), 1)
    _strongest_score = next(
        (b.get('categories', {}).get('Engagement') or b.get('categories', {}).get('engagement')
         for b in businesses if b.get('categories')), '4.64'
    )
    _weakest_score = next(
        (b.get('categories', {}).get('Performance Culture') or b.get('categories', {}).get('performance_culture')
         for b in businesses if b.get('categories')), '4.32'
    )

    system_prompt = f"""You are ARIA — ABG's AI Analyst for the ABG Vibes 2026 Employee Engagement Survey.
You are embedded inside the ABG analytics dashboard. You have complete knowledge of the survey data.
You answer questions conversationally, like a senior HR consultant who knows this data inside out.

RESPONSE SCOPE LABEL — MANDATORY FIRST LINE:
Every response must start with a bold scope label on its own line so the user instantly knows what data you're using.
Format: **[Scope: <label>]**
- If answering about a specific company → **[Scope: <Company Name>]** e.g. **[Scope: ABG Renewables]**
- If answering about a specific BU → **[Scope: <BU Name> (<Company>)]**
- If answering about a specific demographic (e.g. Gen Z group-wide) → **[Scope: Gen Z — ABG Vibes Overall]**
- If answering about the whole group / no specific entity → **[Scope: ABG Vibes Overall]**
- If answering about the current tab/screen → **[Scope: Current Screen]**
This label must ALWAYS be the very first thing in your response, before any other text.
{prior_context_block}

{role_block}
--- CLUSTER NAMES — NON-NEGOTIABLE RULE ---
This system has EXACTLY 5 engagement clusters, no more:
  1. Thriving   2. Healthy   3. At Risk (atrisk)   4. Polarised   5. Critical

THESE CLUSTER NAMES DO NOT EXIST IN THIS SYSTEM — DO NOT DESCRIBE THEM:
"Open Conflict", "High Tension", "Disengaged", "Productive", "Engaged",
"Under Pressure", "Burnout", "Stable", "Recovering", "Mixed" — and any other
cluster name a user might invent.

MANDATORY RESPONSE for any unknown cluster name:
"[name] is not one of our clusters. ABG Vibes 2026 uses exactly 5 clusters:
Thriving, Healthy, At Risk, Polarised, and Critical. Which would you like to explore?"

DO NOT: describe what the cluster "might" mean, map it to a real cluster, or use
the invented cluster name as if it exists. Refuse and list the 5 real clusters.

--- SCOPE GUARDRAIL — READ FIRST ---
You are STRICTLY an HR engagement data analyst for the ABG Vibes 2026 survey.
ONLY use the scope refusal ("I'm your HR engagement data analyst...") for questions that have
ZERO relation to HR, employees, or engagement — for example: technology questions, programming,
sports results, news events, general knowledge, or requests to write code.
DO NOT use the scope refusal for:
- Any feature, tab, tool, or analytical concept within this dashboard — if the user asks what
  a dashboard feature does (e.g. a statistical method, a builder, an analysis view), explain it
  in the context of HR analytics. These are always in scope.
- HR or employee questions the survey doesn't cover (eNPS, attrition, headcount, turnover) — just
  say "this survey doesn't include [metric]" and offer what you DO have
- Improvement/trend questions (no historical data) — just say "this system only has 2026 data"
- Vague HR terms like "disengaged", "polarization", "polarisation", "variance", "spread",
  "unhappy employees", "morale", "attrition risk" — these ARE survey-related; interpret them
  using available data. "Polarization" and "polarised" mean BUs with high score variance
  (large gap between highest and lowest category scores) — always answer using variance data,
  never say "polarization is not a metric in this survey".
- Any question about businesses, employees, scores, categories, demographics, or HR topics —
  even if phrased indirectly or using slang (comms = communication, vibe = engagement, etc.)
The scope refusal is ONLY for: coding questions, sports, news, science, non-HR general knowledge.

--- WHEN DATA DOES NOT EXIST IN THIS SYSTEM ---
This system contains ONLY the ABG Vibes 2026 survey — a single wave snapshot.
There is NO historical data, NO 2024/2025 scores, NO monthly data, NO last-year comparison.
When a user asks about improvement over time, historical trends, last year, previous surveys,
or month-on-month comparison:
- NEVER say "this tab doesn't include historical comparisons" — that's misleading
- ALWAYS say clearly: "This system only has the 2026 ABG Vibes survey — no historical
  data exists for comparison."
- Then immediately pivot to what you CAN offer: current rankings, category breakdowns,
  identifying today's highest/lowest performers, or cohort analysis within 2026.
When a user asks about a metric not in this survey (eNPS, attrition rate, headcount by location):
- Just say "the ABG Vibes 2026 survey doesn't include [metric]" — no scope refusal preamble
- Then offer the closest available metric (e.g., Engagement category scores instead of eNPS)

--- WHO YOU ARE ---
- You know the ABG Vibes 2026 survey data completely
- You answer about what the user is currently looking at on screen
- You answer follow-up questions naturally — in and out of any topic
- You never say "I don't have that data" if the data is loaded below
- You never make up numbers — only use what is in the data sections below
- You are concise but complete — answer the question directly, then add insight
- When asked "what do you think" or "your opinion" — give a perspective as a senior HR analyst would, not just numbers

--- COMPANY NAME MATCHING — CRITICAL ---
The 22 exact business names are listed below. When the user mentions a company name that is misspelled, abbreviated, or partial, match it to the CLOSEST name from that exact list.
PRIORITY RULE: If the user is on a specific tab (e.g. Outliers, At-Risk), prefer matching against the companies VISIBLE on that screen (from active_context) before searching the full list.
EXAMPLES OF CORRECT MATCHING:
- "Novell" or "Novelis" → Novelis  (NOT Novel Jewels Ltd.)
- "Novel Jewels" or "NJL" → Novel Jewels Ltd.
- "ABG HQ" or "Headquarters" → ABG Headquarters
- "Birla Carbon" or "Carbon" → Birla Carbon
- "Grasim" → Grasim CFD
- "Cement" → Cement HO
RULE: When two names share a prefix (e.g. "Novel Jewels" and "Novelis"), pick the one that is contextually relevant — if the user is discussing at-risk businesses and Novelis is at-risk, match to Novelis.

--- CRITICAL SCALE RULE — NON-NEGOTIABLE ---
All scores are on a 1 to 5 scale where 5 is the best possible score. Higher is always better. Never apply any formula to scores you see in this data.
ABSOLUTE PROHIBITION: NEVER write "1.56" or "1.37" or any number produced by subtracting a score from 6. NEVER write "favourability = 6 − raw" or "6 minus" anywhere. NEVER compute a percentage from a score (e.g. do NOT write "92% favorable"). A score of 4.44 means 4.44 out of 5 — it is already the final favourability score. It is POSITIVE and near the top of the scale. Do not derive any other number from it. If you find yourself computing 6 − 4.44, stop immediately — that is wrong.

--- WHAT THE USER IS LOOKING AT RIGHT NOW ---
{screen_block if screen_block else "User is on the Overview tab."}

Answer questions about this screen first when the user says things like:
"explain this", "what does this mean", "why is this number", "what am I looking at"
If active_context shows data_status "not_available" AND the user is asking about this tab's
content specifically — say: "This tab does not have real data connected yet."
EXCEPTION: If the question names a specific metric, company, BU, demographic, or asks to
list/rank/show data — answer from the survey data below regardless of data_status. Never
say "this tab doesn't show that" or redirect to another tab for a data question.

--- COMPLETE SURVEY DATA ---

GROUP SUMMARY:
- Survey: ABG Vibes 2026
- Total respondents: {real_totals.get('total_respondents', 0)}
- Businesses: {len(businesses)} | Business Units: {total_bu_count}
- Group overall score: {group_avg} / 5.0
- Strongest category: Engagement ({_strongest_score})
- Weakest category: Performance Culture ({_weakest_score})

CATEGORY NAMES (use these exact names always):
Engagement | Leadership | Performance Culture | Development and Career | Manager Effectiveness

ENGAGEMENT CLUSTERS (EXACTLY 5 — NO OTHERS EXIST IN THIS SYSTEM):
thriving | healthy | atrisk (At Risk) | polarised | critical
RULE: If a user asks about ANY cluster name not in the above 5 (e.g. "Open Conflict", "High Tension", "Engaged", "Disengaged", "Productive"), do NOT invent content for it, do NOT describe what it might mean.
REQUIRED RESPONSE: "[name] isn't one of our cluster categories. The ABG Vibes 2026 system classifies BUs into 5 clusters: Thriving, Healthy, At Risk, Polarised, and Critical. Which would you like to explore?"

ALL 22 BUSINESSES (ranked highest to lowest — format: name: overall (band, n=respondents) [category scores]):
{biz_lines_chat}

BUSINESS UNITS BY COMPANY (format: company: BU=score(n=respondents), ...):
{bu_block}

GENDER (real totals from full dataset — never count sample rows):
Male: {real_totals.get('male', 0)} ({round(real_totals.get('male', 0) / _tot * 100, 1)}%) | Female: {real_totals.get('female', 0)} ({round(real_totals.get('female', 0) / _tot * 100, 1)}%)

GENERATION (real totals):
Gen Y: {real_totals.get('gen_y', 0)} | Gen X: {real_totals.get('gen_x', 0)} | Gen Z: {real_totals.get('gen_z', 0)}

JOB LEVEL (real totals):
Junior Mgmt: {real_totals.get('junior_management', 0)} | Middle Mgmt: {real_totals.get('middle_management', 0)} | Senior Mgmt: {real_totals.get('senior_management', 0)}

TENURE (real totals):
0-2y: {real_totals.get('tenure_0_2', 0)} | 2-5y: {real_totals.get('tenure_2_5', 0)} | 5-10y: {real_totals.get('tenure_5_10', 0)} | 10-15y: {real_totals.get('tenure_10_15', 0)} | 15-20y: {real_totals.get('tenure_15_20', 0)} | 20-25y: {real_totals.get('tenure_20_25', 0)} | 25+y: {real_totals.get('tenure_25_plus', 0)}

NOTE: n-values in score sections below are from compute sample only — NOT actual headcounts. Always use the real totals above for headcount questions.

GENERATION SCORES: {" | ".join(f"{g['label']}: overall={g['scores'].get('overall','?')}, eng={g['scores'].get('engagement','?')}, lead={g['scores'].get('leadership','?')}, perf={g['scores'].get('performance_culture','?')}, dev={g['scores'].get('development_and_career','?')}, mgr={g['scores'].get('manager_effectiveness','?')} (n={g['n']})" for g in gen_data)}

GENDER SCORES: {" | ".join(f"{g['label']}: overall={g['scores'].get('overall','?')}, eng={g['scores'].get('engagement','?')}, lead={g['scores'].get('leadership','?')}, perf={g['scores'].get('performance_culture','?')}, dev={g['scores'].get('development_and_career','?')}, mgr={g['scores'].get('manager_effectiveness','?')} (n={g['n']})" for g in gender_data)}

JOB LEVEL SCORES: {" | ".join(f"{g['label']}: overall={g['scores'].get('overall','?')}, eng={g['scores'].get('engagement','?')}, lead={g['scores'].get('leadership','?')}, perf={g['scores'].get('performance_culture','?')}, dev={g['scores'].get('development_and_career','?')}, mgr={g['scores'].get('manager_effectiveness','?')} (n={g['n']})" for g in job_data)}

TENURE SCORES: {" | ".join(f"{g['label']}: overall={g['scores'].get('overall','?')}, eng={g['scores'].get('engagement','?')}, lead={g['scores'].get('leadership','?')}, perf={g['scores'].get('performance_culture','?')}, dev={g['scores'].get('development_and_career','?')}, mgr={g['scores'].get('manager_effectiveness','?')} (n={g['n']})" for g in tenure_data)}

MANAGER vs IC: {" | ".join(f"{g['label']}: overall={g['scores'].get('overall','?')}, eng={g['scores'].get('engagement','?')}, lead={g['scores'].get('leadership','?')}, perf={g['scores'].get('performance_culture','?')}, dev={g['scores'].get('development_and_career','?')}, mgr={g['scores'].get('manager_effectiveness','?')} (n={g['n']})" for g in manager_data)}

PER-BUSINESS COHORT SCORES (generation | gender | job level — overall scores only):
{cohort_lines}

--- COMPANY NAME RULES ---
TYPO / FUZZY-MATCH PRIORITY RULE — CRITICAL:
When the user's query contains a word or phrase that resembles a business name or BU name — even with typos, misspellings, or homophones — ALWAYS resolve it silently to the correct entity and answer directly. NEVER say "the survey doesn't include [misspelled name]" when the term is clearly a garbled version of a company or BU name.

DECISION ORDER for every unknown term:
  1. Does it sound like / partially match any of the 22 business names or BU names? → Answer about that entity (mention the correct name once, then proceed).
  2. Does it match a known metric or category? → Use that.
  3. Only if NEITHER apply → say "survey doesn't include [term]".

Examples of correct fuzzy-matching:
- "financial severices ho" → Financial Services HO (typo of "services")
- "finacial services" → Financial Services HO
- "pulp n fiber" → Pulp and Fibre HO
- "birla carbn" → Birla Carbon
- "novalis" → Novelis (not Novel Jewels)
- "novel jewl" → Novel Jewels Ltd.

"Novel Jewels" / "novel jewel" → Novel Jewels Ltd. (jewellery, 376 respondents, 1 BU)
"Novelis" / "novelis" → Novelis (aluminium, 8,227 respondents, 42 BUs)
These are completely different companies. Never confuse them.

ABBREVIATION MATCHING:
Users often use abbreviations or short forms. Always match these:
- "ABNAH" or "New Age" or "Hospitality" → Aditya Birla New Age Hospitality Pvt Ltd
- "ABMCo" or "ABMC" or "Mgmt Co" → Aditya Birla Mgmt Co Pvt Ltd
- "ABFRL" or "Fashion" or "Apparels" → Apparels
- "FS" or "Financial" or "Fin Services" → Financial Services HO
- "P&F" or "Pulp Fibre" or "Pulp" → Pulp and Fibre HO
- "CFI" → CFI
- "Century" → Century Group HO
Never say "I don't have data for [abbreviation]". Always attempt to match it to the closest company in the dataset and confirm the match in your answer.

DEMOGRAPHIC SYNONYM MAPPING — CRITICAL:
Users describe the same survey dimensions using different words. NEVER say "we don't have [term] data". Always map to the correct survey dimension:
- "age group" / "age bracket" / "age band" / "age range" / "which age" / "how old" / "age-wise" / "by age" → GENERATION cohort data (Gen Z / Gen Y / Gen X / Baby Boomer)
  AGE-TO-GENERATION mapping (survey year 2026): under 21 = Gen Z | 21-30 = Gen Z/Gen Y | 30-40 = Gen Y | 40-50 = Gen X | 50+ = Baby Boomer
  MANDATORY FORMAT when answering age group questions: ALWAYS include the age range in parentheses after the generation name.
  CORRECT: "Gen Y (ages 30–40) has the highest engagement at 4.64"
  CORRECT: "Gen X (ages 40–50): 4.51 | Gen Y (ages 30–40): 4.64 | Gen Z (under 30): 4.57 | Baby Boomer (50+): 4.48"
  WRONG: "Gen Y has the highest engagement at 4.64" ← never drop the age range when user asked about age groups
- "sex" / "male female" / "men women" / "boys girls" → GENDER data (Male / Female)
- "grade" / "level" / "band" / "seniority" / "hierarchy" / "management level" / "designation" → JOB LEVEL data (Junior Management / Middle Management / Senior Management)
- "how long they've worked" / "years of service" / "experience" / "work history" / "service length" / "how many years" → TENURE data (0-2y, 2-5y, 5-10y etc.)
- "department" / "division" / "team" / "unit" / "section" / "group" → business unit (BU)
- "company" / "organization" / "org" / "firm" / "entity" → business (one of the 22 companies)
- "comms" / "comm" → Communication category
- "perf" / "PC" → Performance Culture category
- "dev" / "career" / "growth" → Development and Career category
- "mgr" / "manager support" → Manager Effectiveness category
- "onb" / "joining" / "new hire" → this survey does NOT include an Onboarding category; tell the user Onboarding is not part of this survey's 5 categories
RULE: When a user uses any synonym above — answer directly using the mapped survey data. Never say "this survey doesn't track [synonym]".

CRITICAL — "BU" / "BUs" / "bus" DISAMBIGUATION:
In this system: "BU" and "BUs" always mean Business Units (the sub-units within a business).
"bus" in a question always means "BUs" = business units — NOT the 22 businesses/companies.
The 22 top-level entities are called "businesses" or "companies", never "BUs".
Examples:
- "show me all BUs" → list business units (415 total), not the 22 businesses
- "show me Mining's bus" → list Mining's business units specifically
- "all bus" after discussing a company → show that company's business units
- "how many BUs" → count of business units, not businesses
If a user asks "all bus" or "show bus" or "list bus" mid-conversation about a specific
company, show ONLY that company's business units — not all 415 BUs and not the 22 companies.
Example: user asks about Mining, then says "can you show me all bus"
→ show Mining's business units ONLY (not all BUs, not all companies).

--- INDIVIDUAL RECORDS ---
There are NO open text comments in this dataset. Every response is a numeric Likert score 1-5.
When asked to show a female / male / Gen Z / Gen Y employee response — use the exact sample rows below. Show them as a readable human profile (demographics first, then scores). Do NOT redirect to Sentiment Analysis.

SAMPLE ROWS (use verbatim when asked to show an individual response):
Female: {_json.dumps(sample_rows.get('Female'))}
Male: {_json.dumps(sample_rows.get('Male'))}
Gen Z: {_json.dumps(sample_rows.get('Gen Z'))}
Gen Y: {_json.dumps(sample_rows.get('Gen Y'))}

--- RESPONSE LENGTH AND FORMAT — MANDATORY ---
- Default response length is 3 to 5 sentences. No more unless the user explicitly asks for a full breakdown, detailed analysis, or complete list.
- Never use headers (###) for conversational answers. Headers are only for when the user says "give me a report" or "full breakdown" or "detailed analysis".
- Never use emojis unless the user used one first.
- Never use horizontal rules (---).
- Tables are only for direct comparisons where the user asks to compare two or more things side by side. Not for every answer.
- If the answer is a single number or fact — say it in one sentence then add one line of context. Done.
- If the user asks a follow-up like "how to address it" or "what should we do" — give 2 to 3 concrete actions maximum. Not a 10-step plan.
- After every answer offer ONE specific follow-up option, not a list of options.
- Think like a colleague answering over Slack — clear, short, useful.

--- ANSWER PRIORITY — READ THIS CAREFULLY ---

CONTEXT CHAINING — MOST IMPORTANT RULE:
Every follow-up question inherits ALL context from the entire conversation history.
When a user asks a follow-up question that references pronouns like "they", "them", "their", "theirs", "those", "the others", "it" — look at the FULL conversation history and identify:
- What topic was being discussed (e.g. Ram's persona, Gen Z scores, a specific business)
- What filters or dimensions were active (e.g. age group 25-30, ABMCo, female employees)
- What the user is narrowing down or drilling into

Then answer with ALL those filters still applied.

Example:
Message 1: "explain Ram's persona" → context is Ram, 25-30 age, ABMCo
Message 2: "how many employees are in this age group" → answer about 25-30 age group Gen Y = 27,916
Message 3: "how many in Aditya Birla Mgmt Co" → answer must be "how many 25-30 year old employees in ABMCo" — NOT total ABMCo headcount.

The user is always drilling deeper into the same topic unless they explicitly change it.

Use this exact decision order for every message:

0. IS THIS AN UNAMBIGUOUS SCREEN-REFERENCE QUESTION? (HIGHEST PRIORITY — overrides everything)
   These phrases ALWAYS mean the user is asking about what is on their screen RIGHT NOW.
   Use tab context immediately, regardless of conversation history:
   "what page is this", "what tab is this", "what tab am I on", "what am I looking at",
   "what does this page show", "what does this tab show", "what is on this screen",
   "what is on screen", "explain this tab", "explain this page", "explain this",
   "what is this", "what page am I on", "what does this show", "explain what I see",
   "what's on screen", "break down what's on screen", "what's on this screen",
   "what is being shown here", "what analysis is being done here".
   NEVER treat these as follow-ups to prior conversation — they always reference the screen.

1. IS THIS A FOLLOW-UP TO THE PREVIOUS MESSAGE?
   Look at the conversation history. If the question continues the same topic using pronouns
   or relative references ("what are the top 3", "why", "tell me more", "what about them",
   "what about those", "what about their", "and the bottom 3", "compare that", "which one",
   "how does that compare", "tell me more about that") — answer from the conversation history.
   The tab context is irrelevant for genuine follow-up questions.
   IMPORTANT: "what about [specific named company/person/topic]" is NOT a follow-up —
   it is a NEW question about that named entity. Treat it as Rule 3 (data question).
   Example: user just asked about Gen Z lowest scores, then asks "what are the top 3"
   → answer about Gen Z top 3 scores, NOT about whatever tab is open.

2. IS THIS A TAB CONTEXT QUESTION?
   Rule 2 applies ONLY when the question is asking about the tab's current display itself —
   what it shows, what the numbers mean, how to read it.
   HARD EXCLUSION: If the question names any specific metric, score, category, company,
   business unit, demographic group, or asks to list/rank/filter/show data — it is NOT a
   tab context question. Skip Rule 2 entirely and go to Rule 3.
   Rule 2 triggers only on phrases like "explain this", "what am I looking at",
   "what does this mean", "what is on this page", "explain the kpi",
   "what are these numbers", "give me bullets for this", "explain each", "what is this tab",
   where the user is asking ABOUT THE DISPLAY, not asking for specific data.
   IMPORTANT: If the previous assistant answer was an error ("AI unavailable" or similar),
   treat the current question as a fresh tab context question, not a follow-up.
   Example: user opens statistical analysis tab and asks "explain what I am seeing"
   → use tab context to explain the selected question and correlations.
   Counter-example (Rule 2 does NOT apply, use Rule 3 instead):
   "show BUs with high polarization" — names a metric → Rule 3
   "which businesses score low on communication" — names a category → Rule 3
   "list the bottom 5 units by variance" — asks for ranked data → Rule 3
   "how is Gen Z scoring" — names a demographic → Rule 3
   "show me at-risk businesses" — asks for filtered data → Rule 3
   These are data questions regardless of which tab is currently open.

3. IS THIS A DATA QUESTION?
   Any question that asks for specific data — by naming a company, BU, demographic,
   metric, category, score, rank, or filter — is always answered from the retrieved data.
   This applies regardless of which tab is currently open.
   Do NOT check whether the current tab contains this data. Do NOT say "this tab doesn't
   show that". Do NOT tell the user to navigate elsewhere. Always answer directly.
   Example: "what is the score for Cement HO", "how many female employees",
   "what about Novelis", "tell me about Metals", "show BUs with high polarization",
   "which businesses have low leadership", "list bottom 5 by variance",
   "how is Gen Z scoring", "show me at-risk businesses", "which cluster is Novelis in"
   → answer from businesses.json, cohorts, units, and clusters data.

4. AMBIGUOUS QUESTION?
   If the question could mean either follow-up or tab context, use this tiebreaker:
   - Contains a pronoun referring to prior topic ("they", "them", "their", "those", "it") → follow-up
   - Contains "this" referring to screen content without prior conversation context → tab context
   - No clear signal → follow-up first; if prior context is insufficient, fall back to tab context.

CRITICAL RULE: The tab context only wins when there is NO conversation history
that is relevant to the question. A user who just had a 5-message conversation
about Gen Z scores and then asks "what are the top 3" is asking about Gen Z —
not about whatever tab happens to be open.
Do not use tab context to override or redirect an answer when the conversation
already established a topic.
NEVER tell a user to "go to another tab" or "navigate to X screen" — always answer
the question directly from the available data.

{focus_line}
{company_line}
"""

    # Inject a context-reminder as a system turn right before the user's message.
    # This is the last thing Mistral reads before generating, so it reliably keeps
    # the model on the active topic when follow-up questions don't name a subject.
    context_reminder = []
    if req.history:
        clean_hist = [m for m in req.history if m.get("content", "").strip()]
        for i in range(len(clean_hist) - 1, 0, -1):
            if clean_hist[i]["role"] == "assistant" and clean_hist[i - 1]["role"] == "user":
                prev_q = clean_hist[i - 1]["content"].strip()
                prev_a = clean_hist[i]["content"].strip()[:600]
                context_reminder = [{
                    "role": "system",
                    "content": (
                        f"CONTEXT REMINDER (read this before answering the next message):\n"
                        f"The user's last question was: \"{prev_q}\"\n"
                        f"Your last answer was about: \"{prev_a}{'…' if len(clean_hist[i]['content']) > 600 else ''}\"\n"
                        "RULE: If the user's next question does not explicitly name a different company, "
                        "business unit, or topic — treat it as a follow-up to this same subject. "
                        "EXCEPTION: If the user says 'the whole group', 'overall', 'across all', "
                        "'everyone', 'org-wide', or names a completely different entity — answer that new scope directly."
                    ),
                }]
                break

    # For screen-ref questions: strip history and context_reminder entirely —
    # the system prompt's screen_block (with live active_context) is authoritative.
    effective_history   = [] if _is_screen_ref else req.history[-10:]
    effective_reminder  = [] if _is_screen_ref else context_reminder

    messages = [
        {"role": "system", "content": system_prompt},
        *effective_history,
        *effective_reminder,
        {"role": "user", "content": req.message},
    ]

    async def generate():
        try:
            mistral_ok = False

            # -- Try Mistral streaming (primary) --
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    async with client.stream(
                        "POST",
                        "https://api.mistral.ai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {os.getenv('MISTRAL_API_KEY')}",
                            "Content-Type":  "application/json",
                        },
                        json={
                            "model":       "mistral-small-latest",
                            "messages":    messages,
                            "max_tokens":  800,
                            "stream":      True,
                            "temperature": 0.3,
                        },
                    ) as r:
                        if r.is_success:
                            mistral_ok = True
                            print("[LLM] Mistral streaming OK")
                            async for line in r.aiter_lines():
                                if not line.startswith("data: "):
                                    continue
                                payload = line[6:].strip()
                                if payload == "[DONE]":
                                    yield "data: [DONE]\n\n"
                                    return
                                try:
                                    tok = json.loads(payload)["choices"][0]["delta"].get("content", "")
                                    if tok:
                                        yield f"data: {json.dumps({'text': tok})}\n\n"
                                except Exception:
                                    pass
                            yield "data: [DONE]\n\n"
                            return
                raise RuntimeError(f"Mistral HTTP {r.status_code}")
            except Exception as err:
                if mistral_ok:
                    raise
                print(f"[LLM] Mistral failed ({err}) — falling back to Cerebras")

            # -- Cerebras fallback streaming with retries --
            MAX_RETRIES = 4
            async with httpx.AsyncClient(timeout=60) as client:
                for attempt in range(MAX_RETRIES + 1):
                    if attempt > 0:
                        await asyncio.sleep(min(2 ** (attempt - 1) * 0.5, 4.0))

                    got_429 = False
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
                            "max_tokens":  800,
                            "stream":      True,
                            "temperature": 0.3,
                        },
                    ) as r:
                        if r.status_code == 429:
                            got_429 = True
                        else:
                            print("[LLM] Cerebras streaming OK")
                            async for line in r.aiter_lines():
                                if not line.startswith("data: "):
                                    continue
                                payload = line[6:].strip()
                                if payload == "[DONE]":
                                    yield "data: [DONE]\n\n"
                                    return
                                try:
                                    tok = json.loads(payload)["choices"][0]["delta"].get("content", "")
                                    if tok:
                                        yield f"data: {json.dumps({'text': tok})}\n\n"
                                except Exception:
                                    pass
                            yield "data: [DONE]\n\n"
                            return

                    if not got_429:
                        return

            raise RuntimeError("Cerebras rate-limited after 4 retries")

        except Exception:
            # One final Mistral retry before giving up
            try:
                await asyncio.sleep(1.5)
                async with httpx.AsyncClient(timeout=30) as client:
                    async with client.stream(
                        "POST",
                        "https://api.mistral.ai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {os.getenv('MISTRAL_API_KEY')}",
                            "Content-Type":  "application/json",
                        },
                        json={
                            "model":       "mistral-small-latest",
                            "messages":    messages,
                            "max_tokens":  800,
                            "stream":      True,
                            "temperature": 0.3,
                        },
                    ) as r:
                        if r.is_success:
                            print("[LLM] Mistral retry OK")
                            async for line in r.aiter_lines():
                                if not line.startswith("data: "):
                                    continue
                                payload = line[6:].strip()
                                if payload == "[DONE]":
                                    yield "data: [DONE]\n\n"
                                    return
                                try:
                                    tok = json.loads(payload)["choices"][0]["delta"].get("content", "")
                                    if tok:
                                        yield f"data: {json.dumps({'text': tok})}\n\n"
                                except Exception:
                                    pass
                            yield "data: [DONE]\n\n"
                            return
            except Exception:
                pass
            yield f"data: {json.dumps({'text': 'AI unavailable. Please try again.'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ── CALL 5: Focus Areas ───────────────────────────────────────────────────────

def _card_prompt(bu: dict, card_type: str) -> str:
    is_bright = card_type == "brightSpots"
    dir_str   = "up" if is_bright else "down"
    badge     = "High Performer" if is_bright else ("Critical Risk" if card_type == "criticalWatchlist" else "Emerging Risk")
    q1hint    = "a positive quote about team spirit or growth" if is_bright else "a pain-point quote about leadership or workload"
    name      = bu["name"]
    score     = bu.get("overall", "N/A")
    count     = bu.get("respondent_count", 350)

    return f"""You are an HR analytics AI for Aditya Birla Group.
Write a focus area card for this business unit.

BU: {name}
Score: {score}/5.00  |  Group avg: N/A  |  ~{count} respondents
Card type: {card_type}

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "buName": "{name}",
  "badge": "{badge}",
  "quote1": "{q1hint} — write the actual quote here, max 18 words",
  "quote2": "a second realistic employee first-person quote, max 18 words",
  "stat": "Score {score}/5.00",
  "impact": "~{count} employees",
  "sparklineDirection": "{dir_str}"
}}"""


def _fallback_card(bu: Optional[dict], card_type: str) -> Optional[dict]:
    if bu is None:
        return None
    is_bright = card_type == "brightSpots"
    return {
        "buName":             bu["name"],
        "badge":              "High Performer" if is_bright else ("Critical Risk" if card_type == "criticalWatchlist" else "Emerging Risk"),
        "quote1":             "Our team collaboration has improved significantly this year." if is_bright else "Communication from leadership has been inconsistent lately.",
        "quote2":             "I feel genuinely valued and supported in my role here."       if is_bright else "I am not sure my feedback reaches the right people.",
        "stat":               f"Score {bu.get('overall')}/5.00",
        "impact":             f"~{bu.get('respondent_count', 350)} employees",
        "sparklineDirection": "up" if is_bright else "down",
    }


async def _call_card(bu: Optional[dict], card_type: str) -> Optional[object]:
    if bu is None:
        return None
    return await call_llm(
        [{"role": "user", "content": _card_prompt(bu, card_type)}],
        max_tokens=350,
        json_mode=False,
    )


async def _extract_card(r) -> Optional[dict]:
    if r is None:
        return None
    if not r.is_success:
        return None
    data    = r.json()
    content = ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
    if not content:
        return None
    try:
        parsed = _parse_json(content)
        return parsed if parsed and parsed.get("buName") else None
    except Exception:
        return None


@router.post("/focus-areas")
async def focus_areas(user: dict = Depends(get_current_user)):
    units = _read("units.json") or []
    meta  = _read("meta.json")  or {}

    if user.get("role") == "company":
        co = data_company(user)
        if co:
            units = [u for u in units if u.get("business") == co]

    avg = meta.get("group_avg", 4.46)

    by_cluster  = lambda c: [u for u in units if u.get("cluster") == c]
    sort_asc    = lambda lst: sorted(lst, key=lambda u: u.get("overall") or 0)
    sort_desc   = lambda lst: sorted(lst, key=lambda u: u.get("overall") or 0, reverse=True)
    first       = lambda lst: lst[0] if lst else None

    atrisk_asc  = sort_asc(by_cluster("atrisk"))
    critical    = first(sort_asc(by_cluster("critical"))) or first(atrisk_asc)
    polarised   = first(by_cluster("polarised")) or (atrisk_asc[1] if len(atrisk_asc) > 1 else None) or first(atrisk_asc)
    thriving    = first(sort_desc(by_cluster("thriving"))) or first(sort_desc(by_cluster("atrisk")))

    # Replace generic avg placeholder in prompt with real value
    orig_card_prompt = _card_prompt

    def card_prompt_with_avg(bu, card_type):
        return orig_card_prompt(bu, card_type).replace("Group avg: N/A", f"Group avg: {avg}/5.00")

    try:
        c_res, p_res, t_res = await asyncio.gather(
            _call_card(critical,  "criticalWatchlist"),
            _call_card(polarised, "emergingRisks"),
            _call_card(thriving,  "brightSpots"),
        )
        crit_card, emerg_card, bright_card = await asyncio.gather(
            _extract_card(c_res),
            _extract_card(p_res),
            _extract_card(t_res),
        )
        return {
            "criticalWatchlist": crit_card  or _fallback_card(critical,  "criticalWatchlist") or {},
            "emergingRisks":     emerg_card or _fallback_card(polarised, "emergingRisks")     or {},
            "brightSpots":       bright_card or _fallback_card(thriving,  "brightSpots")       or {},
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# ── CALL 6: InsightsStudio — 3-Step Agentic Pipeline (SSE) ───────────────────

SKILLS = {
    "leadership-effectiveness": {
        "label":     "Leadership Effectiveness",
        "goal":      "Analyse how senior and middle leadership is perceived across BUs. Find where leadership scores are weakest and correlate with low engagement.",
        "chartType": "bar",
    },
    "communication": {
        "label":     "Communication",
        "goal":      "Identify communication gaps between leadership and employees. Find BUs where communication scores are lowest and correlate with engagement drops.",
        "chartType": "heatmap",
    },
    "recognition-reward": {
        "label":     "Recognition & Reward",
        "goal":      "Analyse recognition and reward perception across BUs and cohorts. Find which groups feel least recognised and the impact on intent to stay.",
        "chartType": "bar",
    },
    "growth-development": {
        "label":     "Growth & Development",
        "goal":      "Identify where employees feel least supported in career growth. Find BUs and cohorts with the biggest development gaps, especially Gen Z.",
        "chartType": "bar",
    },
    "work-life-balance": {
        "label":     "Work-Life Balance",
        "goal":      "Find where workload and wellbeing scores are most concerning. Identify BUs at risk of burnout from low wellbeing combined with low engagement.",
        "chartType": "scatter",
    },
    "team-collaboration": {
        "label":     "Team Collaboration",
        "goal":      "Analyse team cohesion scores. Find polarised teams (high variance) where some employees are engaged but others are not — a hidden risk.",
        "chartType": "heatmap",
    },
    "psychological-safety": {
        "label":     "Psychological Safety",
        "goal":      "Find BUs where employees feel least safe to speak up. Correlate with Performance Culture scores as a proxy for psychological safety.",
        "chartType": "scatter",
    },
    "manager-support": {
        "label":     "Manager Support",
        "goal":      "Deep-dive on Manager Effectiveness scores. Find which BUs have underperforming managers and the gap vs group average.",
        "chartType": "bar",
    },
}


@router.post("/skill-analysis")
async def skill_analysis(req: SkillAnalysisRequest, user: dict = Depends(get_current_user)):
    skill_ids = (req.skills or []) if (req.skills and len(req.skills)) else ([req.skill] if req.skill else [])
    if not skill_ids:
        raise HTTPException(status_code=400, detail="No skill selected")
    skill_defs = [SKILLS[sid] for sid in skill_ids if sid in SKILLS]
    if not skill_defs:
        raise HTTPException(status_code=400, detail=f"Unknown skill: {skill_ids[0]}")

    skill_def = {
        "label":     " & ".join(s["label"] for s in skill_defs),
        "goal":      "\n".join(s["goal"]   for s in skill_defs),
        "chartType": skill_defs[0]["chartType"],
    }

    meta       = _read("meta.json")       or {}
    businesses = _read("businesses.json") or []
    units      = _read("units.json")      or []
    cohorts    = _read("cohorts.json")    or {}

    if user.get("role") == "company":
        co = data_company(user)
        if co:
            businesses = [b for b in businesses if b["name"] == co]
            units      = [u for u in units      if u.get("business") == co]

    # Map UI dimension label → cohorts.json key
    _DIM_KEY = {
        "Business Unit": None,
        "Gender":        "gender",
        "Generation":    "generation",
        "Tenure":        "tenure",
        "Job Band":      "job_band",
        "Age Group":     "age_group",
    }
    dim_key = _DIM_KEY.get(req.dimension)

    sorted_units = sorted(units, key=lambda u: u.get("overall") or u.get("score") or 0, reverse=True)
    top_bus      = sorted_units[:6]
    bottom_bus   = sorted_units[-6:][::-1]

    biz_context = "\n".join(
        f"{b.get('name')} ({b.get('overall') or b.get('score')}): "
        + ", ".join(f"{k}={v}" for k, v in (b.get("categories") or {}).items())
        for b in businesses
    )

    # Build cohort context: only the selected dimension (not all dimensions)
    if dim_key and cohorts.get(dim_key):
        dim_cohorts = cohorts[dim_key]
        cohort_context = (
            f"{req.dimension} breakdown (group avg: {meta.get('group_avg')}/5):\n"
            + "\n".join(
                f"  {c.get('name')}: {c.get('overall')} (n={c.get('respondent_count', '?')})"
                for c in dim_cohorts
            )
        )
        dim_label = req.dimension
    else:
        # Business Unit selected — use all cohorts as supporting context
        cohort_context = "\n".join(
            f"{dim}: " + ", ".join(
                f"{c.get('name')}={c.get('overall')}"
                for c in (items or [])
            )
            for dim, items in cohorts.items()
        )
        dim_label = "Business Unit"

    def _bu_label(u):
        return f"{u.get('name')}({u.get('overall') or u.get('score')})"

    top_str    = ", ".join(_bu_label(u) for u in top_bus)
    bottom_str = ", ".join(_bu_label(u) for u in bottom_bus)
    base_context = (
        f"ABG Employee Survey — {meta.get('survey_name', '2026')}\n"
        f"Group avg: {meta.get('group_avg')}/5 | Respondents: {meta.get('total_respondents')} | BUs: {meta.get('total_units')}\n"
        f"Top BUs: {top_str}\n"
        f"Bottom BUs: {bottom_str}"
    )

    async def generate():
        def sse(obj: dict) -> str:
            return f"data: {json.dumps(obj)}\n\n"

        try:
            # ── Step 1: Pattern Discovery ─────────────────────────────────────
            yield sse({"step": 1, "label": "Scanning data for patterns…", "done": False})
            print(f"[AGENT] Step 1 — Pattern Discovery ({skill_def['label']}, dim={dim_label})")

            # For non-BU dimensions pass the actual cohort scores so Step 1 names the right groups
            step1_data = (
                f"{cohort_context}\n\nALL BUSINESSES WITH CATEGORY SCORES (for context):\n{biz_context}"
                if dim_key else
                f"{base_context}\n\nALL BUSINESSES WITH CATEGORY SCORES:\n{biz_context}"
            )
            step1 = await _agent_step([{"role": "user", "content":
                f"""You are an HR data analyst agent. Scan this data and find the 3 most significant patterns related to {skill_def["label"]}.

SKILL FOCUS: {skill_def["goal"]}
ANALYSE BY DIMENSION: {dim_label}
{"— The riskBUs and brightSpotBUs fields MUST contain exact " + dim_label + " group names from the data below, NOT business unit names." if dim_key else "— The riskBUs and brightSpotBUs fields should be exact Business Unit names."}
— IMPORTANT: Use ONLY the exact group names that appear in the data. Do NOT invent labels like "non-management", "lower-band", "early-career" etc. Copy the names verbatim.

DATA:
{step1_data}

Respond ONLY with valid JSON:
{{
  "patterns": [
    "Pattern 1 — name a specific {dim_label} group and its exact score",
    "Pattern 2 — name a specific {dim_label} group and its exact score",
    "Pattern 3 — name a specific {dim_label} group and its exact score"
  ],
  "riskBUs": ["lowest-scoring {dim_label} group", "second-lowest {dim_label} group"],
  "brightSpotBUs": ["highest-scoring {dim_label} group", "second-highest {dim_label} group"],
  "keyMetric": "The single most striking number from the {dim_label} data, with context"
}}"""}], 500, "Step 1")

            yield sse({"step": 1, "label": "Patterns discovered", "done": True, "finding": step1.get("keyMetric")})
            print(f"[AGENT] Step 1 done — risk groups: {', '.join(step1.get('riskBUs') or [])}")
            await asyncio.sleep(0.8)

            # ── Step 2: Root Cause Investigation ─────────────────────────────
            risk_label = (step1.get("riskBUs") or [dim_label])[0]
            yield sse({"step": 2, "label": "Investigating root causes…", "done": False})
            print("[AGENT] Step 2 — Root Cause Investigation")

            patterns_str = "\n".join(f"{i+1}. {p}" for i, p in enumerate(step1.get("patterns") or []))
            step2 = await _agent_step([{"role": "user", "content":
                f"""You are an HR investigation agent analysing {skill_def["label"]} at Aditya Birla Group.
The analysis dimension is: {dim_label}

Step 1 found these patterns:
{patterns_str}
At-risk {dim_label} groups: {", ".join(step1.get("riskBUs") or [])}

{dim_label} cohort scores:
{cohort_context}

Respond ONLY with valid JSON. All values must be plain strings — no nested objects or arrays.
{{
  "cohortFindings": "One sentence: which {dim_label} group scores lowest, its exact score, and the gap vs group average ({meta.get('group_avg')}/5)",
  "rootCause": "One sentence: the specific structural reason the lowest {dim_label} groups underperform on {skill_def["label"]}",
  "agentReasoning": "Two to three sentences connecting the {dim_label} score differences to {skill_def["label"]}. Name specific {dim_label} groups and exact scores."
}}"""}], 800, "Step 2")

            yield sse({"step": 2, "label": "Root causes identified", "done": True})
            print(f"[AGENT] Step 2 done — cohort: {(step2.get('cohortFindings') or '')[:60]}…")
            await asyncio.sleep(0.8)

            # ── Step 3: Action Generation ─────────────────────────────────────
            yield sse({"step": 3, "label": "Synthesising recommendations…", "done": False})
            print("[AGENT] Step 3 — Action Synthesis")

            step3 = await _agent_step([{"role": "user", "content":
                f"""You are an HR strategy agent finalising a {skill_def["label"]} analysis for Aditya Birla Group.
The analysis is broken down by: {dim_label}

Investigation findings:
Patterns: {" | ".join(step1.get("patterns") or [])}
At-risk {dim_label} groups: {", ".join(step1.get("riskBUs") or [])}
Bright spot {dim_label} groups: {", ".join(step1.get("brightSpotBUs") or [])}
Root cause: {step2.get("rootCause") or "Not identified"}
{dim_label} cohort impact: {step2.get("cohortFindings") or "Not identified"}

Write a headline and 4 prioritised actions SPECIFIC to {skill_def["label"]} and the {dim_label} dimension.
Do NOT use generic leadership examples. Base everything on the findings above.

Respond ONLY with valid JSON (no markdown):
{{
  "headline": "<concise headline naming the {dim_label} gap and skill>",
  "keyFindings": [
    "<finding 1 — name a specific {dim_label} group and its score>",
    "<finding 2 — name a specific {dim_label} group and its score>",
    "<finding 3 — name a specific {dim_label} group and its score>",
    "<finding 4 — state the widest gap between {dim_label} groups>"
  ],
  "priorityActions": [
    {{ "rank": 1, "action": "<action targeting the lowest {dim_label} group for {skill_def["label"]}>", "owner": "HR Business Partner", "timeline": "30 days", "expectedImpact": "<measurable outcome>" }},
    {{ "rank": 2, "action": "<action targeting mid-tier {dim_label} groups>", "owner": "L&D / HR", "timeline": "60 days", "expectedImpact": "<measurable outcome>" }},
    {{ "rank": 3, "action": "<structural change to close the {dim_label} gap>", "owner": "Senior Leadership", "timeline": "90 days", "expectedImpact": "<measurable outcome>" }},
    {{ "rank": 4, "action": "<leverage bright spot {dim_label} groups to share best practice>", "owner": "HR COE", "timeline": "120 days", "expectedImpact": "<measurable outcome>" }}
  ]
}}"""}], 700, "Step 3")

            yield sse({"step": 3, "label": "Recommendations ready", "done": True})
            print(f"[AGENT] Step 3 done — headline: {step3.get('headline')}")

            # ── Merge all 3 agent outputs ─────────────────────────────────────
            yield sse({"result": {
                "skillLabel":      skill_def["label"],
                "chartType":       skill_def["chartType"],
                "headline":        step3.get("headline")        or step1.get("keyMetric") or "",
                "agentReasoning":  step2.get("agentReasoning")  or "",
                "keyFindings":     step3.get("keyFindings")     or step1.get("patterns")  or [],
                "riskBUs":         step1.get("riskBUs")         or [],
                "brightSpotBUs":   step1.get("brightSpotBUs")   or [],
                "priorityActions": step3.get("priorityActions") or [],
                "cohortInsight":   step2.get("cohortFindings")  or "",
            }})
            yield "data: [DONE]\n\n"
            print(f"[AGENT] {skill_def['label']} analysis complete")

        except Exception as err:
            print(f"[AGENT] Pipeline error: {err}")
            yield sse({"error": str(err)})
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
