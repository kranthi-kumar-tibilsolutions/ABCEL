import os
import json
import asyncio
import re
from pathlib import Path
from typing import Optional, List

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from lib.llm import call_llm

router   = APIRouter()
_BACKEND = Path(__file__).resolve().parent.parent.parent
_DATA    = _BACKEND / "data"


# ── Data helper ───────────────────────────────────────────────────────────────

def _read(file: str):
    fp = _DATA / file
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return None


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

def _build_context(dimension: str = "Business Unit") -> str:
    meta       = _read("meta.json")       or {}
    businesses = _read("businesses.json") or []
    clusters   = _read("clusters.json")   or {}
    cohorts    = _read("cohorts.json")    or {}

    sorted_biz = sorted(businesses, key=lambda b: b.get("overall") or 0, reverse=True)
    biz_sample = sorted_biz[:5] + sorted_biz[-3:]
    biz_lines  = "\n".join(f"{b['name']}: {b['overall']} ({b['band']})" for b in biz_sample)

    def _fmt(items, suffix=""):
        # exclude noise: n<30 and "DOB not Available"; sort highest first
        valid = [c for c in (items or []) if (c.get("respondent_count") or 0) >= 30 and c.get("name") != "DOB not Available"]
        valid.sort(key=lambda c: c.get("overall") or 0, reverse=True)
        return ", ".join(f"{c['name']}={c.get('overall')}{suffix} (n={c.get('respondent_count')})" for c in valid)

    cluster_lines   = ", ".join(f"{k}: {len(v or [])} BUs" for k, v in clusters.items())
    gender_line     = _fmt(cohorts.get("gender"))
    generation_line = _fmt(cohorts.get("generation"))
    age_group_line  = _fmt(cohorts.get("age_group"))
    job_band_line   = _fmt(cohorts.get("job_band"))
    tenure_line     = _fmt(cohorts.get("tenure"), " yrs")

    return f"""ABG Vibes Employee Survey — {meta.get("survey_name", "2026")}
Respondents: {meta.get("total_respondents", 55457)} | Businesses: {meta.get("total_businesses", len(businesses))} | BUs: {meta.get("total_units", 415)}
Group avg: {meta.get("group_avg", 4.46)}/5 | Top: {meta.get("top_business")} ({meta.get("top_score")}) | Lowest: {meta.get("lowest_business")} ({meta.get("lowest_score")})
Strongest category: {meta.get("strongest_category")} | Weakest: {meta.get("weakest_category")}
Dimension: {dimension}

TOP/BOTTOM BUSINESSES: {biz_lines}

CLUSTERS: {cluster_lines}
GENDER BREAKDOWN: {gender_line}
GENERATION BREAKDOWN (Gen Z / Gen Y / Gen X / Baby Boomer — NOT age bands): {generation_line}
AGE BAND BREAKDOWN (numeric bands like 25-30, 30-35 etc — use these for any "age group" question): {age_group_line or "(not in dataset)"}
JOB BAND: {job_band_line}
TENURE (years): {tenure_line}""".strip()


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
    message:   str
    history:   List[dict] = []
    dimension: str = "Business Unit"

class SkillAnalysisRequest(BaseModel):
    skill:     Optional[str]       = None
    skills:    Optional[List[str]] = None
    dimension: str = "Business Unit"


# ── CALL 1: AI Executive Summary ──────────────────────────────────────────────

@router.post("/summary")
async def get_summary(req: SummaryRequest):
    prompt = f"""You are an expert HR analytics AI for Aditya Birla Group.
Generate an executive summary of engagement data analysed by {req.dimension} dimension.

DATA:
{_build_context(req.dimension)}

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
async def get_insights():
    prompt = f"""You are an HR analytics AI for ABG. Analyse this data.

DATA:
{_build_context()}

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
async def get_business_insight(req: BusinessInsightRequest):
    name       = req.businessName or req.business
    businesses = _read("businesses.json") or []
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

@router.post("/chat")
async def chat(req: ChatRequest):
    system_prompt = f"""You are an AI analyst assistant for ABG Vibes — Aditya Birla Group's employee engagement dashboard. You answer ONLY questions about the ABG Vibes survey, employee engagement, HR analytics, and the data below.

STRICT SCOPE RULE: If the user asks anything outside employee engagement or this survey (e.g. coding, general knowledge, math, jokes, or any other topic), respond with exactly: "I can only help with questions about the ABG Vibes employee engagement survey. What would you like to know about the data?"

- Greetings or small talk → respond briefly and warmly (1 sentence), then offer to help with engagement data. Do NOT cite any numbers.
- Specific questions about data → answer in 2-3 sentences, lead with the key insight and number, use **bold** for key figures.
- Never start a reply with "!" or similar punctuation.
- "age group" or "age band" questions → use ONLY the AGE BAND BREAKDOWN scores (25-30, 30-35, etc.). NEVER use generation names (Gen Z, Traditionalist, etc.) as an answer to age group questions.
- "generation" questions → use ONLY the GENERATION BREAKDOWN scores (Gen Z, Gen Y, Gen X, Baby Boomer).
- Traditionalist is NOT an age group — it is a generation label with only 1 respondent and must never be cited.
- Never say age group data is missing — it is always in the AGE BAND BREAKDOWN section above.

SURVEY DATA (use only when the user asks a data question):
{_build_context(req.dimension)}"""

    messages = [
        {"role": "system", "content": system_prompt},
        *req.history[-6:],
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
                            "max_tokens":  400,
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
                            "max_tokens":  400,
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
async def focus_areas():
    units = _read("units.json") or []
    meta  = _read("meta.json")  or {}
    avg   = meta.get("group_avg", 4.46)

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
async def skill_analysis(req: SkillAnalysisRequest):
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
            yield sse({"step": 2, "label": f"Investigating {risk_label} patterns…", "done": False})
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
            yield sse({"step": 3, "label": "Generating priority actions…", "done": False})
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
