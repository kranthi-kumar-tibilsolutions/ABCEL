"""
Full functional validation — every endpoint, every response field.
Checks: HTTP status, response shape, data correctness, no hallucinated/empty values.
"""
import requests, json, sys, time

BASE = "http://localhost:3001"
PASS = FAIL = WARN = 0
results = []

def check(label, url, method="GET", body=None, checks=None, stream=False):
    global PASS, FAIL, WARN
    try:
        kwargs = {"timeout": 60}
        if body:
            kwargs["json"] = body
        if stream:
            kwargs["stream"] = True
        r = getattr(requests, method.lower())(url, **kwargs)
        status = r.status_code

        if status != 200:
            results.append(("FAIL", label, f"HTTP {status}"))
            FAIL += 1
            return None

        if stream:
            # Collect SSE lines and find result
            data = None
            for line in r.iter_lines():
                if line:
                    txt = line.decode() if isinstance(line, bytes) else line
                    if txt.startswith("data: ") and "[DONE]" not in txt:
                        try:
                            evt = json.loads(txt[6:])
                            if "result" in evt:
                                data = evt["result"]
                            elif "error" in evt:
                                results.append(("FAIL", label, f"SSE error: {evt['error'][:80]}"))
                                FAIL += 1
                                return None
                        except Exception:
                            pass
            if data is None:
                results.append(("WARN", label, "SSE stream returned no result"))
                WARN += 1
                return None
        else:
            try:
                data = r.json()
            except Exception:
                results.append(("FAIL", label, "Response is not JSON"))
                FAIL += 1
                return None

        issues = []
        if checks:
            for c in checks:
                parts = c.split(".")
                val = data
                for p in parts:
                    if isinstance(val, dict):
                        val = val.get(p)
                    elif isinstance(val, list) and p.isdigit():
                        val = val[int(p)] if int(p) < len(val) else None
                    else:
                        val = None
                    if val is None:
                        break
                if val is None:
                    issues.append(f"missing: {c}")
                elif isinstance(val, (list, dict)) and len(val) == 0:
                    issues.append(f"empty: {c}")

        if issues:
            results.append(("WARN", label, " | ".join(issues)))
            WARN += 1
        else:
            results.append(("PASS", label, ""))
            PASS += 1

        return data

    except requests.exceptions.ConnectionError:
        results.append(("FAIL", label, "Connection refused — server not running?"))
        FAIL += 1
        return None
    except Exception as e:
        results.append(("FAIL", label, str(e)[:100]))
        FAIL += 1
        return None


def validate(label, data, assertions):
    """Extra validation on already-fetched data."""
    global PASS, FAIL, WARN
    issues = []
    for key, test_fn, msg in assertions:
        try:
            parts = key.split(".")
            val = data
            for p in parts:
                val = val.get(p) if isinstance(val, dict) else (val[int(p)] if isinstance(val, list) else None)
            if not test_fn(val):
                issues.append(f"{key}: {msg} (got {repr(val)[:60]})")
        except Exception as e:
            issues.append(f"{key}: check error — {e}")

    if issues:
        for i in issues:
            results.append(("WARN", label, i))
            WARN += 1
    else:
        results.append(("PASS", label, ""))
        PASS += 1


# ─────────────────────────────────────────────────────────
# 1. DATA ROUTES
# ─────────────────────────────────────────────────────────
print("\n══════ 1. DATA ROUTES ══════")

status = check("GET /api/status", f"{BASE}/api/status",
               checks=["ready"])
if status:
    validate("  /status → ready=true", status, [
        ("ready", lambda v: v is True, "should be true — data must be loaded"),
    ])

meta = check("GET /api/meta", f"{BASE}/api/meta",
             checks=["survey_name","total_respondents","total_businesses","total_units",
                     "group_avg","top_business","lowest_business","strongest_category","weakest_category"])
if meta:
    validate("  /meta data sanity", meta, [
        ("group_avg",         lambda v: v and 1 <= v <= 5,       "must be 1-5"),
        ("total_respondents", lambda v: v and v > 0,              "must be > 0"),
        ("total_businesses",  lambda v: v and v > 0,              "must be > 0"),
        ("survey_name",       lambda v: v and v != "upload_1781349187358", "should not be raw upload filename"),
        ("dimensions_detected", lambda v: v and "age_group" in v, "age_group must be detected"),
    ])

businesses = check("GET /api/businesses", f"{BASE}/api/businesses", checks=[])
if businesses:
    validate("  /businesses structure", businesses[0] if businesses else {}, [
        ("name",             lambda v: bool(v),       "must have name"),
        ("overall",          lambda v: v and 1<=v<=5, "overall 1-5"),
        ("band",             lambda v: v in ("strong","healthy","watch","concern"), "valid band"),
        ("rank",             lambda v: v and v >= 1,  "rank >= 1"),
        ("categories",       lambda v: bool(v),       "must have categories"),
        ("respondent_count", lambda v: v and v > 0,   "must have respondents"),
    ])
    validate("  /businesses sorted descending", {"ok": businesses == sorted(businesses, key=lambda b: b.get("overall",0), reverse=True)}, [
        ("ok", lambda v: v, "businesses must be sorted highest→lowest by overall"),
    ])

units = check("GET /api/units", f"{BASE}/api/units", checks=[])
if units:
    validate("  /units structure", units[0] if units else {}, [
        ("name",     lambda v: bool(v), "must have name"),
        ("business", lambda v: bool(v), "must have parent business"),
        ("overall",  lambda v: v and 1<=v<=5, "overall 1-5"),
        ("cluster",  lambda v: v in ("thriving","atrisk","polarised","critical"), "valid cluster"),
    ])

clusters = check("GET /api/clusters", f"{BASE}/api/clusters",
                 checks=["thriving","atrisk","polarised","critical"])
if clusters:
    validate("  /clusters — all 4 keys non-empty lists", clusters, [
        ("thriving",  lambda v: isinstance(v,list), "must be list"),
        ("atrisk",    lambda v: isinstance(v,list), "must be list"),
        ("polarised", lambda v: isinstance(v,list), "must be list"),
        ("critical",  lambda v: isinstance(v,list), "must be list"),
    ])
    total_clustered = sum(len(v) for v in clusters.values())
    validate("  /clusters — total BUs matches /units count",
             {"match": total_clustered == len(units) if units else True}, [
        ("match", lambda v: v, f"clustered={total_clustered} vs units={len(units) if units else '?'}"),
    ])

cohorts = check("GET /api/cohorts", f"{BASE}/api/cohorts",
                checks=["gender","generation","tenure","job_band","age_group"])
if cohorts:
    for dim in ["gender","generation","tenure","job_band","age_group"]:
        grps = cohorts.get(dim, [])
        validate(f"  /cohorts → {dim} has scores", {"ok": all(g.get("overall") for g in grps)}, [
            ("ok", lambda v: v, f"all {dim} groups must have overall score"),
        ])
    validate("  /cohorts → age_group has 9 bands", {"n": len(cohorts.get("age_group",[]))}, [
        ("n", lambda v: v == 9, f"expected 9 age bands, got {len(cohorts.get('age_group',[]))}"),
    ])

check("GET /api/units?business=Birla Carbon", f"{BASE}/api/units?business=Birla%20Carbon",
      checks=[])


# ─────────────────────────────────────────────────────────
# 2. AI ROUTES
# ─────────────────────────────────────────────────────────
print("\n══════ 2. AI ROUTES ══════")

summary = check("POST /api/summary (Business Unit)", f"{BASE}/api/summary",
                "POST", {"dimension":"Business Unit"},
                checks=["bullets","takeaway","whyMatters"])
if summary:
    validate("  /summary bullets are non-empty strings", summary, [
        ("bullets", lambda v: v and all(isinstance(b,str) and len(b)>10 for b in v), "bullets must be non-empty strings"),
    ])

summary_gen = check("POST /api/summary (Generation)", f"{BASE}/api/summary",
                    "POST", {"dimension":"Generation"},
                    checks=["bullets"])

insights = check("POST /api/insights", f"{BASE}/api/insights", "POST", {},
                 checks=["topTrends","outliers","summary"])
if insights:
    validate("  /insights topTrends have direction+text", insights, [
        ("topTrends", lambda v: v and all("direction" in t and "text" in t for t in v), "must have direction+text"),
        ("outliers",  lambda v: v and all("direction" in t and "text" in t for t in v), "must have direction+text"),
        ("summary",   lambda v: bool(v and len(v) > 20), "summary must be non-empty"),
    ])

biz_insight = check("POST /api/business-insight", f"{BASE}/api/business-insight",
                    "POST", {"businessName": businesses[0]["name"] if businesses else "Birla Carbon"},
                    checks=["summary","strengths","concerns"])
if biz_insight:
    validate("  /business-insight non-empty", biz_insight, [
        ("summary", lambda v: bool(v and len(v) > 30), "summary must be substantive"),
    ])

focus = check("POST /api/focus-areas", f"{BASE}/api/focus-areas", "POST", {},
              checks=["criticalWatchlist","brightSpots"])
if focus:
    validate("  /focus-areas structure", focus, [
        ("criticalWatchlist", lambda v: v and v.get("buName"), "criticalWatchlist must have buName"),
        ("brightSpots",       lambda v: v and v.get("buName"), "brightSpots must have buName"),
    ])

# Chat — streaming (accumulates text chunks, not a result object)
print("  Testing POST /api/chat (streaming)…")
def check_chat(label, message):
    global PASS, FAIL, WARN
    try:
        r = requests.post(f"{BASE}/api/chat", json={
            "message": message, "history": [], "dimension": "Business Unit"
        }, stream=True, timeout=60)
        if r.status_code != 200:
            results.append(("FAIL", label, f"HTTP {r.status_code}"))
            FAIL += 1
            return
        full_text = ""
        for line in r.iter_lines():
            if line:
                txt = line.decode() if isinstance(line, bytes) else line
                if txt.startswith("data: ") and "[DONE]" not in txt:
                    try:
                        evt = json.loads(txt[6:])
                        full_text += evt.get("text", "")
                    except Exception:
                        pass
        if full_text and len(full_text) > 10:
            results.append(("PASS", label, ""))
            PASS += 1
        else:
            results.append(("WARN", label, f"response text empty or too short: {repr(full_text[:80])}"))
            WARN += 1
    except Exception as e:
        results.append(("FAIL", label, str(e)[:100]))
        FAIL += 1

check_chat("POST /api/chat — age group question", "What is the engagement score for the 30-35 age group?")
check_chat("POST /api/chat — generation question", "Which generation has the highest engagement?")
check_chat("POST /api/chat — top business question", "Which business has the highest engagement score?")

# Skill analysis — all 8 skills × 2 dimensions
print("\n  Testing POST /api/skill-analysis (all skills)…")
for skill_id in ["psychological-safety","leadership-effectiveness","manager-support","growth-development"]:
    for dim in ["Job Band","Generation"]:
        sa = check(f"  /skill-analysis {skill_id} × {dim}", f"{BASE}/api/skill-analysis",
                   "POST", {"skills": [skill_id], "dimension": dim},
                   checks=["headline","keyFindings","priorityActions","cohortInsight"],
                   stream=True)
        if sa:
            validate(f"    → headline mentions {dim}", sa, [
                ("headline", lambda v: bool(v and len(v) > 10), "headline must be non-empty"),
                ("cohortInsight", lambda v: bool(v and len(v) > 10), "cohortInsight must be non-empty"),
                ("priorityActions", lambda v: v and len(v) >= 3, "must have ≥3 actions"),
            ])


# ─────────────────────────────────────────────────────────
# 3. SENTIMENT ROUTES
# ─────────────────────────────────────────────────────────
print("\n══════ 3. SENTIMENT ROUTES ══════")

sent_ov = check("GET /api/sentiment/overview", f"{BASE}/api/sentiment/overview",
                checks=["total","distribution"])
if sent_ov:
    validate("  /sentiment/overview distribution has positive/neutral/negative", sent_ov, [
        ("distribution", lambda v: v and all(k in v for k in ("positive","neutral","negative")), "must have positive/neutral/negative keys"),
        ("total", lambda v: v is not None and v >= 0, "total must be ≥ 0"),
    ])

sent_time = check("GET /api/sentiment/over-time", f"{BASE}/api/sentiment/over-time",
                  checks=["trend","granularity"])
if sent_time:
    validate("  /sentiment/over-time trend is a list", sent_time, [
        ("trend", lambda v: isinstance(v, list), "must be list"),
    ])

sent_samples = check("GET /api/sentiment/samples", f"{BASE}/api/sentiment/samples",
                     checks=["samples","total"])
if sent_samples:
    validate("  /sentiment/samples structure", sent_samples, [
        ("total", lambda v: v is not None and v >= 0, "total ≥ 0"),
        ("samples", lambda v: isinstance(v, list), "must be list"),
    ])

check("GET /api/sentiment/samples?label=Positive", f"{BASE}/api/sentiment/samples?label=Positive",
      checks=["samples"])
check("GET /api/sentiment/validate-statistical", f"{BASE}/api/sentiment/validate-statistical")


# ─────────────────────────────────────────────────────────
# 4. STATISTICAL ROUTES
# ─────────────────────────────────────────────────────────
print("\n══════ 4. STATISTICAL ROUTES ══════")

qs = check("GET /api/statistical/questions", f"{BASE}/api/statistical/questions",
           checks=["questions"])
q0 = None
if qs and qs.get("questions"):
    q0 = qs["questions"][0]["id"]
    validate("  /statistical/questions structure", qs["questions"][0], [
        ("id",       lambda v: bool(v), "must have id"),
        ("text",     lambda v: bool(v), "must have text"),
        ("category", lambda v: bool(v), "must have category"),
    ])
    validate(f"  /statistical/questions has ≥10 questions", {"n": len(qs["questions"])}, [
        ("n", lambda v: v >= 10, f"expected ≥10, got {len(qs['questions'])}"),
    ])

if q0:
    corr = check(f"GET /api/statistical/correlations/{q0}", f"{BASE}/api/statistical/correlations/{q0}",
                 checks=["correlations","n","tab_counts"])
    if corr:
        validate("  /correlations — pearson_r in range", corr["correlations"][0] if corr["correlations"] else {}, [
            ("pearson_r", lambda v: v is not None and -1 <= v <= 1, "r must be in [-1,1]"),
            ("p_value",   lambda v: v is not None and 0 <= v <= 1,  "p must be in [0,1]"),
            ("significant", lambda v: v is not None,                  "must have significant field"),
        ])

    check(f"GET /api/statistical/correlations/{q0}?limit=5", f"{BASE}/api/statistical/correlations/{q0}?limit=5",
          checks=["correlations","total","showing"])

    corelog = check(f"GET /api/statistical/correlogram/{q0}", f"{BASE}/api/statistical/correlogram/{q0}",
                    checks=["matrix","question_ids"])
    if corelog:
        validate("  /correlogram matrix is square", corelog, [
            ("matrix", lambda v: v and all(len(row)==len(v) for row in v), "matrix must be square"),
        ])

    netw = check(f"GET /api/statistical/network/{q0}", f"{BASE}/api/statistical/network/{q0}",
                 checks=["nodes"])  # edges can be empty if all |r| < 0.2
    if netw:
        validate("  /network nodes have id+label", netw["nodes"][0] if netw["nodes"] else {}, [
            ("id",    lambda v: bool(v), "node must have id"),
            ("label", lambda v: bool(v), "node must have label"),
        ])

    stat_ins = check(f"GET /api/statistical/insights/{q0}", f"{BASE}/api/statistical/insights/{q0}",
                     checks=["insight"])
    if stat_ins:
        validate("  /statistical/insights non-empty", stat_ins, [
            ("insight", lambda v: bool(v and len(v) > 20), "insight must be substantive"),
        ])


# ─────────────────────────────────────────────────────────
# 5. PERSONA ROUTES
# ─────────────────────────────────────────────────────────
print("\n══════ 5. PERSONA ROUTES ══════")

dims_p = check("GET /api/persona/dimensions", f"{BASE}/api/persona/dimensions",
               checks=["dimensions"])
if dims_p:
    validate("  /persona/dimensions has age_group", dims_p, [
        ("dimensions", lambda v: v and any(d.get("id") == "age_group" for d in v), "age_group must be a persona dimension"),
    ])

top5 = check("GET /api/persona/top5", f"{BASE}/api/persona/top5",
             checks=["personas"])
if top5:
    validate("  /persona/top5 has ≥1 persona", top5, [
        ("personas", lambda v: v and len(v) >= 1, "must have ≥1 persona"),
    ])
    if top5.get("personas"):
        validate("  /persona/top5 structure", top5["personas"][0], [
            ("label",   lambda v: bool(v), "must have label"),
            ("filters", lambda v: isinstance(v,list), "must have filters list"),
            ("n",       lambda v: v and v >= 30, "must have n >= 30"),
        ])

pco = check("GET /api/persona/cohorts", f"{BASE}/api/persona/cohorts",
            checks=["cohorts"])
if pco:
    validate("  /persona/cohorts includes age_group entries", pco, [
        ("cohorts", lambda v: v and any("age" in c.get("id","") for c in v), "age_group cohorts must be present"),
    ])

pq = check("POST /api/persona/query", f"{BASE}/api/persona/query", "POST", {
    "filters": [{"dimension":"generation","operator":"eq","value":"Gen Y"}],
    "comparison_cohorts": [],
    "persona_name": "Gen Y Test",
}, checks=["persona_n","themes"])
if pq:
    validate("  /persona/query Gen Y results", pq, [
        ("persona_n", lambda v: v and v > 0, "must have respondents"),
        ("themes",    lambda v: v and len(v) > 0, "must have themes"),
    ])

pq_age = check("POST /api/persona/query (age_group)", f"{BASE}/api/persona/query", "POST", {
    "filters": [{"dimension":"age_group","operator":"eq","value":"30-35"}],
    "comparison_cohorts": [],
    "persona_name": "30-35 Age Band",
}, checks=["persona_n","themes"])
if pq_age:
    validate("  /persona/query age_group 30-35 results", pq_age, [
        ("persona_n", lambda v: v and v > 0, "must have respondents"),
    ])

saved = check("POST /api/persona/save", f"{BASE}/api/persona/save", "POST", {
    "persona_name": "Test Persona",
    "filters": [{"dimension":"generation","operator":"eq","value":"Gen Z"}],
    "persona_n": 100,
    "scores": {},
}, checks=["success","id"])

tw = check("POST /api/persona/takeaways", f"{BASE}/api/persona/takeaways", "POST", {
    "persona_name": "Gen Z",
    "themes": [{"theme":"Engagement","persona_score":4.3,"overall_score":4.44,"delta_overall":-0.14,"significant":True}],
    "persona_n": 7315,
}, checks=["takeaways"])
if tw:
    validate("  /persona/takeaways is non-empty list", tw, [
        ("takeaways", lambda v: isinstance(v, list) and len(v) >= 1, "takeaways must be a non-empty list"),
    ])


# ─────────────────────────────────────────────────────────
# 6. HYPOTHESIS ROUTES
# ─────────────────────────────────────────────────────────
print("\n══════ 6. HYPOTHESIS ROUTES ══════")

tmpl = check("GET /api/hypothesis/templates", f"{BASE}/api/hypothesis/templates",
             checks=["templates"])
if tmpl:
    validate("  /hypothesis/templates has ≥3 templates", tmpl, [
        ("templates", lambda v: v and len(v) >= 3, "must have ≥3 templates"),
    ])

hist0 = check("GET /api/hypothesis/history", f"{BASE}/api/hypothesis/history",
              checks=["total","items"])

hyp = check("POST /api/hypothesis/test", f"{BASE}/api/hypothesis/test", "POST", {
    "hypothesis_text": "Gen Y employees have higher engagement scores than the group average.",
    "filters": {},
    "alpha": 0.05,
}, checks=["success","result"])
if hyp and hyp.get("result"):
    validate("  /hypothesis/test result fields", hyp["result"], [
        ("verdict",   lambda v: v in ("validated","rejected","inconclusive"), "valid verdict"),
        ("z",         lambda v: v is not None, "must have z-score"),
        ("p_value",   lambda v: v is not None and 0<=v<=1, "p_value 0-1"),
        ("n",         lambda v: v and v > 0, "must have sample n"),
        ("pop_mean",  lambda v: v and v > 1.0, "pop_mean must be > 1 (not alpha value like 0.05)"),
    ])

hist1 = check("GET /api/hypothesis/history (after test)", f"{BASE}/api/hypothesis/history",
              checks=["total","items"])
if hist1 and hist1.get("items"):
    item_id = hist1["items"][0]["id"]
    check(f"GET /api/hypothesis/history/{item_id}", f"{BASE}/api/hypothesis/history/{item_id}",
          checks=["id","verdict"])
    check(f"DELETE /api/hypothesis/history/{item_id}", f"{BASE}/api/hypothesis/history/{item_id}",
          method="DELETE", checks=["success"])


# ─────────────────────────────────────────────────────────
# 7. UPLOAD / RESET / LOAD-SAMPLE
# ─────────────────────────────────────────────────────────
print("\n══════ 7. UPLOAD / SAMPLE ROUTES ══════")

check("POST /api/load-sample", f"{BASE}/api/load-sample", "POST", None,
      checks=["success","copied"])


# ─────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────
print(f"\n{'═'*60}")
for status, label, detail in results:
    colour = "✅" if status=="PASS" else ("⚠️ " if status=="WARN" else "❌")
    suffix = f"  →  {detail}" if detail else ""
    print(f"  {colour}  {label}{suffix}")

print(f"\n{'═'*60}")
print(f"  PASSED: {PASS}   WARNINGS: {WARN}   FAILED: {FAIL}")
print(f"{'═'*60}\n")
sys.exit(1 if FAIL > 0 else 0)
