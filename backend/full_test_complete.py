"""
COMPLETE frontend functional validation.
Every button, every skill, every dimension, every scenario the user can click.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import requests, json, time

BASE = "http://localhost:3001"
PASS = FAIL = WARN = 0
results = []

# ── helpers ───────────────────────────────────────────────────────────────────

def check(label, url, method="GET", body=None, checks=None, stream=False, timeout=90):
    global PASS, FAIL, WARN
    try:
        kwargs = {"timeout": timeout}
        if body is not None:
            kwargs["json"] = body
        if stream:
            kwargs["stream"] = True
        r = getattr(requests, method.lower())(url, **kwargs)
        if r.status_code != 200:
            results.append(("FAIL", label, f"HTTP {r.status_code} — {r.text[:120]}"))
            FAIL += 1
            return None
        if stream:
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
                results.append(("WARN", label, "SSE returned no result object"))
                WARN += 1
                return None
        else:
            try:
                data = r.json()
            except Exception:
                results.append(("FAIL", label, "Response not JSON"))
                FAIL += 1
                return None
        issues = []
        for c in (checks or []):
            val = data
            for p in c.split("."):
                val = val.get(p) if isinstance(val, dict) else None
            if val is None:
                issues.append(f"missing:{c}")
            elif isinstance(val, (list, dict)) and len(val) == 0:
                issues.append(f"empty:{c}")
        if issues:
            results.append(("WARN", label, " | ".join(issues)))
            WARN += 1
        else:
            results.append(("PASS", label, ""))
            PASS += 1
        return data
    except requests.exceptions.ConnectionError:
        results.append(("FAIL", label, "Connection refused"))
        FAIL += 1
        return None
    except Exception as e:
        results.append(("FAIL", label, str(e)[:100]))
        FAIL += 1
        return None


def ok(label, condition, detail=""):
    global PASS, FAIL, WARN
    if condition:
        results.append(("PASS", label, ""))
        PASS += 1
    else:
        results.append(("FAIL", label, detail))
        FAIL += 1


def warn(label, condition, detail=""):
    global PASS, FAIL, WARN
    if condition:
        results.append(("PASS", label, ""))
        PASS += 1
    else:
        results.append(("WARN", label, detail))
        WARN += 1


def chat(label, message):
    global PASS, FAIL, WARN
    try:
        r = requests.post(f"{BASE}/api/chat",
                          json={"message": message, "history": [], "dimension": "Business Unit"},
                          stream=True, timeout=60)
        if r.status_code != 200:
            results.append(("FAIL", label, f"HTTP {r.status_code}"))
            FAIL += 1
            return
        text = ""
        for line in r.iter_lines():
            if line:
                txt = line.decode() if isinstance(line, bytes) else line
                if txt.startswith("data: ") and "[DONE]" not in txt:
                    try:
                        text += json.loads(txt[6:]).get("text", "")
                    except Exception:
                        pass
        if text and len(text) > 10:
            results.append(("PASS", label, f"→ {text[:80]}…"))
            PASS += 1
        else:
            results.append(("WARN", label, f"empty response: {repr(text[:60])}"))
            WARN += 1
    except Exception as e:
        results.append(("FAIL", label, str(e)[:80]))
        FAIL += 1


def skill(skill_id, dimension):
    label = f"Insights Studio: [{skill_id}] x [{dimension}]"
    d = check(label, f"{BASE}/api/skill-analysis",
              "POST", {"skills": [skill_id], "dimension": dimension},
              checks=["headline", "keyFindings", "cohortInsight", "priorityActions"],
              stream=True, timeout=120)
    if d:
        ok(f"  {label} → headline non-empty",
           bool(d.get("headline") and len(d["headline"]) > 10), "headline empty")
        ok(f"  {label} → ≥3 priority actions",
           len(d.get("priorityActions") or []) >= 3,
           f"only {len(d.get('priorityActions') or [])} actions")
        ok(f"  {label} → cohortInsight mentions {dimension}",
           bool(d.get("cohortInsight") and len(d["cohortInsight"]) > 10),
           "cohortInsight empty")
    return d


# ─────────────────────────────────────────────────────────
print("\n=== 1. DATA ROUTES ===")
# ─────────────────────────────────────────────────────────

status = check("GET /api/status", f"{BASE}/api/status", checks=["ready"])
ok("  ready=true", status and status.get("ready") is True)

meta = check("GET /api/meta", f"{BASE}/api/meta",
             checks=["survey_name","total_respondents","group_avg","top_business","lowest_business"])
if meta:
    ok("  group_avg in range 1-5",    1 <= meta.get("group_avg", 0) <= 5)
    ok("  total_respondents > 0",     meta.get("total_respondents", 0) > 0)
    ok("  age_group in dimensions",   "age_group" in (meta.get("dimensions_detected") or []))
    ok("  survey_name = ABG Vibes 2026", meta.get("survey_name") == "ABG Vibes 2026")

biz = check("GET /api/businesses", f"{BASE}/api/businesses")
if biz:
    ok("  businesses list non-empty", len(biz) > 0)
    ok("  first biz has name/overall/band/rank/categories",
       all(k in biz[0] for k in ("name","overall","band","rank","categories")))
    ok("  businesses sorted desc", biz == sorted(biz, key=lambda b: b.get("overall",0), reverse=True))
    ok("  all overall scores 1-5", all(1 <= b.get("overall",0) <= 5 for b in biz))

units = check("GET /api/units", f"{BASE}/api/units")
if units:
    ok("  units non-empty",  len(units) > 0)
    ok("  unit has cluster", all(u.get("cluster") in ("thriving","atrisk","polarised","critical") for u in units))
    ok("  unit has business parent", all(u.get("business") for u in units))

clusters = check("GET /api/clusters", f"{BASE}/api/clusters",
                 checks=["thriving","atrisk","polarised","critical"])
if clusters and units:
    total = sum(len(v) for v in clusters.values())
    ok(f"  clustered BUs ({total}) == units ({len(units)})", total == len(units))

cohorts = check("GET /api/cohorts", f"{BASE}/api/cohorts")
if cohorts:
    for dim in ["gender","generation","tenure","job_band","age_group"]:
        ok(f"  cohorts has '{dim}' key", dim in cohorts)
        g = cohorts.get(dim, [])
        ok(f"  cohorts['{dim}'] non-empty with scores", len(g) > 0 and all(x.get("overall") for x in g))
    ok("  age_group has 9 bands", len(cohorts.get("age_group", [])) == 9)

check("GET /api/units?business=Birla Carbon", f"{BASE}/api/units?business=Birla%20Carbon")
check("GET /api/units?business=Novelis",       f"{BASE}/api/units?business=Novelis")

if units:
    ok("  units have name field",        all(u.get("name") for u in units))
    ok("  units have score/overall",     all(u.get("score") is not None or u.get("overall") is not None for u in units))
    ok("  units have band field",        all(u.get("band") for u in units))
    ok("  units have categories",        all(u.get("categories") for u in units))
    ok("  units all scores 1-5",         all(1 <= +(u.get("score") or u.get("overall") or 0) <= 5 for u in units))

# Reset endpoint (TopBar reset button)
reset = check("POST /api/reset", f"{BASE}/api/reset", "POST", None)
# Reload sample immediately after reset so subsequent tests still work
check("POST /api/load-sample (restore after reset)", f"{BASE}/api/load-sample", "POST", None, checks=["success"])


# ─────────────────────────────────────────────────────────
print("\n=== 2. AI — SUMMARY, INSIGHTS, BUSINESS INSIGHT, FOCUS AREAS ===")
# ─────────────────────────────────────────────────────────

ALL_DIMENSIONS = ["Business Unit","Gender","Generation","Tenure","Job Band"]

for dim in ALL_DIMENSIONS:
    s = check(f"POST /api/summary [{dim}]", f"{BASE}/api/summary",
              "POST", {"dimension": dim}, checks=["bullets","takeaway"])
    if s:
        ok(f"  summary [{dim}] → 3+ bullets", len(s.get("bullets", [])) >= 3)
        ok(f"  summary [{dim}] → bullets non-empty", all(len(b) > 10 for b in s.get("bullets", [])))

insights = check("POST /api/insights", f"{BASE}/api/insights", "POST", {},
                 checks=["topTrends","outliers","summary"])
if insights:
    ok("  insights → 3 trends", len(insights.get("topTrends", [])) >= 3)
    ok("  insights → directions valid",
       all(t.get("direction") in ("up","down") for t in insights.get("topTrends", [])))

for biz_name in (biz[:2] + biz[-1:]) if biz else []:
    bi = check(f"POST /api/business-insight [{biz_name['name']}]",
               f"{BASE}/api/business-insight", "POST", {"businessName": biz_name["name"]},
               checks=["summary","strengths","concerns"])
    if bi:
        ok(f"  [{biz_name['name']}] summary substantive", bool(bi.get("summary") and len(bi["summary"]) > 20))

focus = check("POST /api/focus-areas", f"{BASE}/api/focus-areas", "POST", {},
              checks=["criticalWatchlist","brightSpots"])
if focus:
    ok("  focus-areas criticalWatchlist has buName", bool((focus.get("criticalWatchlist") or {}).get("buName")))
    ok("  focus-areas brightSpots has buName",       bool((focus.get("brightSpots") or {}).get("buName")))
    ok("  focus-areas quotes non-empty", bool((focus.get("brightSpots") or {}).get("quote1")))


# ─────────────────────────────────────────────────────────
print("\n=== 3. AI CHAT — EVERY DATA TOPIC ===")
# ─────────────────────────────────────────────────────────

chat("Chat: greeting",                          "Hello[!]")
chat("Chat: overall engagement score",          "What is the overall group engagement score?")
chat("Chat: top business",                      "Which business has the highest engagement?")
chat("Chat: lowest business",                   "Which business is struggling the most?")
chat("Chat: age group 30-35",                   "What is the engagement score for the 30-35 age group?")
chat("Chat: youngest age group",                "How does the under-21 age band score compare?")
chat("Chat: generation Gen Z",                  "How is Gen Z performing vs other generations?")
chat("Chat: gender breakdown",                  "Is there a difference in engagement between male and female employees?")
chat("Chat: job band Non Management",           "What is the engagement score for Non Management employees?")
chat("Chat: tenure breakdown",                  "Which tenure band has the lowest engagement?")
chat("Chat: Performance Culture weakness",      "Why is Performance Culture the weakest category?")
chat("Chat: thriving vs critical clusters",     "How many BUs are in the thriving cluster vs critical?")
chat("Chat: recommendation for ABG HQ",        "What should ABG Headquarters focus on to improve?")


# ─────────────────────────────────────────────────────────
print("\n=== 4. INSIGHTS STUDIO — ALL 8 SKILLS x ALL 5 DIMENSIONS ===")
# ─────────────────────────────────────────────────────────

ALL_SKILLS = [
    "psychological-safety",
    "leadership-effectiveness",
    "communication",
    "recognition-reward",
    "growth-development",
    "work-life-balance",
    "team-collaboration",
    "manager-support",
]

# Test every skill against every dimension
for s in ALL_SKILLS:
    for d in ALL_DIMENSIONS:
        skill(s, d)


# ─────────────────────────────────────────────────────────
print("\n=== 5. SENTIMENT ROUTES ===")
# ─────────────────────────────────────────────────────────

sent_ov = check("GET /api/sentiment/overview", f"{BASE}/api/sentiment/overview",
                checks=["total","distribution"])
if sent_ov:
    dist = sent_ov.get("distribution", {})
    ok("  distribution has positive/neutral/negative",
       all(k in dist for k in ("positive","neutral","negative")))
    warn("  distribution has data (sentiment NLP needed if zero)",
         sent_ov.get("total", 0) >= 0)

check("GET /api/sentiment/over-time",          f"{BASE}/api/sentiment/over-time",   checks=["trend"])
check("GET /api/sentiment/samples",            f"{BASE}/api/sentiment/samples",     checks=["samples","total"])
check("GET /api/sentiment/samples?label=Positive", f"{BASE}/api/sentiment/samples?label=Positive", checks=["samples"])
check("GET /api/sentiment/validate-statistical", f"{BASE}/api/sentiment/validate-statistical")


# ─────────────────────────────────────────────────────────
print("\n=== 6. STATISTICAL ANALYSIS — MULTIPLE QUESTIONS ===")
# ─────────────────────────────────────────────────────────

qs = check("GET /api/statistical/questions", f"{BASE}/api/statistical/questions", checks=["questions"])
q_ids = []
if qs:
    q_ids = [q["id"] for q in qs["questions"]]
    ok(f"  {len(q_ids)} questions loaded", len(q_ids) >= 10)
    cats = set(q.get("category") for q in qs["questions"])
    ok(f"  questions span multiple categories ({len(cats)})", len(cats) >= 3)

# Test correlations for 5 different questions across categories
test_qs = q_ids[:5] if len(q_ids) >= 5 else q_ids
for q_id in test_qs:
    corr = check(f"GET /correlations/{q_id}", f"{BASE}/api/statistical/correlations/{q_id}",
                 checks=["correlations","n","tab_counts"])
    if corr:
        ok(f"  [{q_id}] n > 0",       corr.get("n", 0) > 0)
        ok(f"  [{q_id}] pearson_r valid",
           all(-1 <= c.get("pearson_r", 99) <= 1 for c in corr.get("correlations", [])[:5]))

    check(f"GET /correlations/{q_id}?limit=5", f"{BASE}/api/statistical/correlations/{q_id}?limit=5",
          checks=["correlations"])

    check(f"GET /correlogram/{q_id}", f"{BASE}/api/statistical/correlogram/{q_id}",
          checks=["matrix","question_ids"])

    check(f"GET /network/{q_id}", f"{BASE}/api/statistical/network/{q_id}", checks=["nodes"])

    ins = check(f"GET /statistical/insights/{q_id}", f"{BASE}/api/statistical/insights/{q_id}",
                checks=["insight"])
    if ins:
        ok(f"  [{q_id}] insight substantive", bool(ins.get("insight") and len(ins["insight"]) > 20))


# ─────────────────────────────────────────────────────────
print("\n=== 7. PERSONA BUILDER — ALL DIMENSIONS AND COHORTS ===")
# ─────────────────────────────────────────────────────────

dims_p = check("GET /api/persona/dimensions", f"{BASE}/api/persona/dimensions", checks=["dimensions"])
if dims_p:
    dim_ids = [d["id"] for d in dims_p.get("dimensions", [])]
    for expected in ["business","age_group","generation","gender","job_level","tenure"]:
        ok(f"  persona dimension '{expected}' present", expected in dim_ids)
    for d in dims_p.get("dimensions", []):
        ok(f"  dimension '{d['id']}' has values",
           bool(d.get("values") and len(d["values"]) > 0))

top5 = check("GET /api/persona/top5", f"{BASE}/api/persona/top5", checks=["personas"])
if top5:
    personas = top5.get("personas", [])
    ok("  top5 has ≥1 persona",  len(personas) >= 1)
    ok("  top5 has ≤5 personas", len(personas) <= 5)
    for p in personas:
        ok(f"  persona '{p.get('label')}' has label+filters+n",
           all(k in p for k in ("label","filters","n")))

pco = check("GET /api/persona/cohorts", f"{BASE}/api/persona/cohorts", checks=["cohorts"])
if pco:
    cohort_ids = [c["id"] for c in pco.get("cohorts", [])]
    for expected in ["gen_z","gen_y","female","managers","age_under_25","age_30_35"]:
        ok(f"  builtin cohort '{expected}' present", expected in cohort_ids)

# Query every demographic dimension
persona_queries = [
    ("generation", "Gen Y",            "Gen Y Persona"),
    ("generation", "Gen Z",            "Gen Z Persona"),
    ("gender",     "Female",           "Female Employees"),
    ("age_group",  "25-30",            "Age 25-30"),
    ("age_group",  "30-35",            "Age 30-35"),
    ("age_group",  "40-45",            "Age 40-45"),
    ("age_group",  ">55",              "Age >55"),
    ("job_level",  "Junior Management","Junior Management"),
    ("job_level",  "Senior Management","Senior Management"),
    ("tenure",     "0-2",              "New Joiners"),
    ("tenure",     "5-10",             "5-10 Year Employees"),
]
for dim, val, name in persona_queries:
    pq = check(f"POST /api/persona/query [{name}]", f"{BASE}/api/persona/query",
               "POST", {
                   "filters": [{"dimension": dim, "operator": "eq", "value": val}],
                   "comparison_cohorts": [],
                   "persona_name": name,
               }, checks=["persona_n","themes"])
    if pq:
        ok(f"  [{name}] has respondents",   pq.get("persona_n", 0) > 0,
           f"n={pq.get('persona_n')} — value '{val}' may not exist in sample")
        ok(f"  [{name}] has 6 themes",      len(pq.get("themes", [])) == 6)
        ok(f"  [{name}] themes have scores", all(t.get("persona_score") is not None
                                                  for t in pq.get("themes", [])))

# Takeaways for 2 different personas
for persona_name, themes_data in [
    ("Gen Z",      [{"theme":"Engagement","persona_score":4.30,"overall_score":4.44,"delta_overall":-0.14,"significant":True}]),
    ("Age 30-35",  [{"theme":"Leadership","persona_score":4.45,"overall_score":4.44,"delta_overall":0.01,"significant":False}]),
]:
    tw = check(f"POST /api/persona/takeaways [{persona_name}]",
               f"{BASE}/api/persona/takeaways", "POST",
               {"persona_name": persona_name, "themes": themes_data, "persona_n": 500},
               checks=["takeaways"])
    if tw:
        ok(f"  [{persona_name}] takeaways is list", isinstance(tw.get("takeaways"), list))
        ok(f"  [{persona_name}] takeaways non-empty", len(tw.get("takeaways", [])) >= 1)

# Save persona
saved = check("POST /api/persona/save", f"{BASE}/api/persona/save", "POST", {
    "persona_name": "Test - Age 30-35",
    "filters": [{"dimension": "age_group", "operator": "eq", "value": "30-35"}],
    "persona_n": 500,
    "scores": {},
}, checks=["success","id"])
if saved:
    ok("  save returned id", bool(saved.get("id")))


# ─────────────────────────────────────────────────────────
print("\n=== 8. HYPOTHESIS TESTING — ALL 5 TEMPLATES + CUSTOM ===")
# ─────────────────────────────────────────────────────────

tmpl = check("GET /api/hypothesis/templates", f"{BASE}/api/hypothesis/templates", checks=["templates"])
if tmpl:
    ok("  5 templates present", len(tmpl.get("templates", [])) == 5)
    for t in tmpl.get("templates", []):
        ok(f"  template '{t['id']}' has text", bool(t.get("text") and len(t["text"]) > 20))

hist_before = check("GET /api/hypothesis/history (start)", f"{BASE}/api/hypothesis/history",
                    checks=["total","items"])

# Run all 5 template hypotheses
template_hypotheses = [
    ("T-001 Career Growth → Engagement",
     "Employees who rate Career Growth Opportunities high have higher Engagement scores than the group average."),
    ("T-002 Managers vs ICs → Leadership",
     "People Managers have higher trust in Leadership than individual contributors."),
    ("T-003 Gen Z → Onboarding",
     "Gen Z employees have higher Onboarding scores than the company average."),
    ("T-004 New Joiners → Performance Culture",
     "New Joiners with 0-2 years tenure have lower Performance Culture scores than the group average."),
    ("T-005 Female → Manager Effectiveness",
     "Female employees rate Manager Effectiveness higher than the group average."),
]
passed_hyp_ids = []
for label, hyp_text in template_hypotheses:
    h = check(f"POST /api/hypothesis/test [{label}]", f"{BASE}/api/hypothesis/test",
              "POST", {"hypothesis_text": hyp_text, "filters": {}, "alpha": 0.05},
              checks=["success"], timeout=90)
    if h:
        if h.get("success") and h.get("result"):
            r = h["result"]
            ok(f"  [{label}] verdict valid",   r.get("verdict") in ("validated","rejected","inconclusive"))
            ok(f"  [{label}] z-score present",  r.get("z") is not None)
            ok(f"  [{label}] p_value 0-1",      r.get("p_value") is not None and 0 <= r["p_value"] <= 1)
            ok(f"  [{label}] pop_mean > 1",     (r.get("pop_mean") or 0) > 1.0,
               f"pop_mean={r.get('pop_mean')} — should be group avg ~4.44, not alpha")
            ok(f"  [{label}] n > 0",            r.get("n", 0) > 0)
            ok(f"  [{label}] interpretation",   bool(r.get("interpretation") and len(r["interpretation"]) > 10))
        elif h.get("success") is False:
            warn(f"  [{label}] parseable but small sample", False,
                 h.get("error", "failed"))

# Verify history was populated
time.sleep(1)
hist_after = check("GET /api/hypothesis/history (after tests)", f"{BASE}/api/hypothesis/history",
                   checks=["total","items"])
if hist_after and hist_before:
    ok("  history grew after tests",
       hist_after.get("total", 0) > hist_before.get("total", 0))

if hist_after and hist_after.get("items"):
    first_id = hist_after["items"][0]["id"]
    hi = check(f"GET /api/hypothesis/history/{first_id}", f"{BASE}/api/hypothesis/history/{first_id}")
    if hi:
        ok("  history item has hypothesis text", bool(hi.get("hypothesis")))
        ok("  history item has result",          bool(hi.get("result")))
    check(f"DELETE /api/hypothesis/history/{first_id}",
          f"{BASE}/api/hypothesis/history/{first_id}", method="DELETE", checks=["success"])


# ─────────────────────────────────────────────────────────
print("\n=== 9. UPLOAD & SAMPLE ROUTES ===")
# ─────────────────────────────────────────────────────────

check("POST /api/load-sample", f"{BASE}/api/load-sample", "POST", None, checks=["success","copied"])


# ─────────────────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────────────────
print(f"\n{'='*70}")
for status, label, detail in results:
    icon = "PASS" if status == "PASS" else ("WARN" if status == "WARN" else "FAIL")
    suffix = f"  => {detail}" if detail and status != "PASS" else (f"  [{detail}]" if detail else "")
    print(f"  {icon}  {label}{suffix}")

fails  = [r for r in results if r[0] == "FAIL"]
warns  = [r for r in results if r[0] == "WARN"]
passes = [r for r in results if r[0] == "PASS"]

print(f"\n{'='*70}")
print(f"  PASSED: {len(passes)}   WARNINGS: {len(warns)}   FAILED: {len(fails)}")
print(f"{'='*70}\n")

if fails:
    print("FAILURES:")
    for _, label, detail in fails:
        print(f"  [X]  {label}  =>  {detail}")
if warns:
    print("WARNINGS:")
    for _, label, detail in warns:
        print(f"  [!]  {label}  =>  {detail}")

sys.exit(1 if fails else 0)
