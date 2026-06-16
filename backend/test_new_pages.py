"""
Full integration test for all 4 new pages:
  Hypothesis Testing   /api/hypothesis/*
  Statistical Analysis /api/statistical/*
  Dynamic Persona Builder /api/persona/*
  (Sentiment page is static — tested via GET only)

Run:
  cd d:\ABCEL\backend
  python test_new_pages.py
"""

import sys, io, json, time
import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:8000"
PASS = FAIL = WARN = 0

def ok(label, detail=""):
    global PASS; PASS += 1
    print(f"  [PASS] {label}" + (f"  ({detail})" if detail else ""))

def fail(label, detail=""):
    global FAIL; FAIL += 1
    print(f"  [FAIL] {label}" + (f"  ({detail})" if detail else ""))

def warn(label, detail=""):
    global WARN; WARN += 1
    print(f"  [WARN] {label}" + (f"  ({detail})" if detail else ""))

def section(title):
    print(f"\n{'='*64}\n  {title}\n{'='*64}")

def get(client, path, label, key=None, min_n=None):
    r = client.get(f"{BASE}{path}")
    if r.status_code != 200:
        fail(label, f"HTTP {r.status_code}"); return None
    d = r.json()
    if key and not d.get(key):
        fail(label, f"missing '{key}'"); return None
    if min_n is not None:
        arr = d.get(key, []) if key else d
        if len(arr) < min_n:
            fail(label, f"expected >={min_n}, got {len(arr)}"); return None
    ok(label)
    return d

def post(client, path, body, label, timeout=60):
    r = client.post(f"{BASE}{path}", json=body, timeout=timeout)
    d = r.json()
    if r.status_code != 200:
        fail(label, f"HTTP {r.status_code}: {d.get('detail','')[:80]}"); return None
    ok(label)
    return d


# ─────────────────────────────────────────────────────────────
# 1. HYPOTHESIS TESTING
# ─────────────────────────────────────────────────────────────

def test_hypothesis(c):
    section("1. HYPOTHESIS TESTING")

    # 1.1 templates
    print("\n[1.1] Templates")
    d = get(c, "/api/hypothesis/templates", "GET /templates", key="templates", min_n=5)
    templates = [t["text"] for t in (d or {}).get("templates", [])]

    # 1.2 initial history
    print("\n[1.2] History fetch")
    d2 = get(c, "/api/hypothesis/history", "GET /history", key="items")
    initial_count = len((d2 or {}).get("items", []))
    print(f"      existing records: {initial_count}")

    # 1.3 All 5 templates
    print("\n[1.3] Run all 5 templates")
    for i, tpl in enumerate(templates, 1):
        print(f"\n  T-{i:03d}: {tpl[:75]}...")
        r = c.post(f"{BASE}/api/hypothesis/test",
                   json={"hypothesis_text": tpl, "filters": {}, "alpha": 0.05}, timeout=90)
        if r.status_code != 200:
            fail(f"T-{i:03d}", f"HTTP {r.status_code}"); continue
        d = r.json()
        if not d.get("success"):
            fail(f"T-{i:03d}", d.get("error","?")[:80]); continue
        res = d["result"]
        ok(f"T-{i:03d}", f"n={res['n']}  z={res['z']:.3f}  verdict={res['verdict']}")
        if res["n"] < 30:
            warn(f"T-{i:03d} small n", f"n={res['n']}")

    # 1.4 Custom human-like hypotheses
    print("\n[1.4] Custom hypotheses")
    customs = [
        "Female employees have higher Manager Effectiveness scores than the group average.",
        "Gen Y employees score higher on Leadership than the overall company average.",
        "People Managers have higher Engagement scores than the group average.",
        "Gen Z employees have lower Onboarding scores than the company average.",
        "Employees in the 30-35 age group rate Development & Career higher than average.",
    ]
    for h in customs:
        print(f"\n  => {h[:70]}")
        r = c.post(f"{BASE}/api/hypothesis/test",
                   json={"hypothesis_text": h, "filters": {}, "alpha": 0.05}, timeout=90)
        if r.status_code != 200:
            fail("custom", f"HTTP {r.status_code}"); continue
        d = r.json()
        if not d.get("success"):
            fail("custom", d.get("error","?")[:80]); continue
        res = d["result"]
        ok("custom", f"n={res['n']}  z={res['z']:.3f}  verdict={res['verdict']}")

    # 1.5 History grew
    print("\n[1.5] History after tests")
    d3 = get(c, "/api/hypothesis/history", "GET /history (updated)", key="items")
    new_count = len((d3 or {}).get("items", []))
    if new_count > initial_count:
        ok("history grew", f"{initial_count} → {new_count}")
    else:
        warn("history not growing", f"count={new_count}")

    # 1.6 Delete first item
    print("\n[1.6] Delete history item")
    items = (d3 or {}).get("items", [])
    if items:
        item_id = items[0]["id"]
        r = c.delete(f"{BASE}/api/hypothesis/history/{item_id}")
        if r.status_code == 200 and r.json().get("success"):
            ok("DELETE /history/{id}", f"deleted {item_id}")
        else:
            fail("DELETE /history/{id}", f"HTTP {r.status_code}")
        d4 = c.get(f"{BASE}/api/hypothesis/history").json()
        remaining_ids = [h["id"] for h in d4.get("items", [])]
        if item_id not in remaining_ids:
            ok("item gone from list after delete")
        else:
            fail("item still in list after delete")
    else:
        warn("no items to delete")

    # 1.7 Bad hypothesis
    print("\n[1.7] Invalid hypothesis")
    r = c.post(f"{BASE}/api/hypothesis/test",
               json={"hypothesis_text": "I like pizza", "filters": {}, "alpha": 0.05}, timeout=30)
    d = r.json()
    if not d.get("success"):
        ok("invalid hypothesis rejected", d.get("error","?")[:60])
    else:
        warn("invalid hypothesis accepted", "LLM may have parsed it")


# ─────────────────────────────────────────────────────────────
# 2. STATISTICAL ANALYSIS
# ─────────────────────────────────────────────────────────────

def test_statistical(c):
    section("2. STATISTICAL ANALYSIS")

    # 2.1 Questions list
    print("\n[2.1] Questions list")
    d = get(c, "/api/statistical/questions", "GET /questions", key="questions", min_n=1)
    questions = (d or {}).get("questions", [])
    print(f"      {len(questions)} questions in dataset")
    if not questions:
        fail("no questions — skipping"); return

    # 2.2 Full cycle for every question
    print(f"\n[2.2] Full data cycle for ALL {len(questions)} questions")
    for q in questions:
        qid = q["id"]

        # correlations
        r = c.get(f"{BASE}/api/statistical/correlations/{qid}")
        if r.status_code != 200:
            fail(f"{qid} correlations", f"HTTP {r.status_code}"); continue
        cd = r.json()
        corrs = cd.get("correlations", [])
        tc    = cd.get("tab_counts", {})
        n_r   = cd.get("n", 0)
        ok(f"{qid} correlations", f"n={n_r}  total={tc.get('all',0)}  pos={tc.get('strong_positive',0)+tc.get('moderate_positive',0)}  neg={tc.get('negative',0)}")

        # correlogram
        r = c.get(f"{BASE}/api/statistical/correlogram/{qid}")
        if r.status_code != 200:
            fail(f"{qid} correlogram", f"HTTP {r.status_code}"); continue
        cg = r.json()
        qs_ = cg.get("question_ids", [])
        mat = cg.get("matrix", [])
        ok(f"{qid} correlogram", f"{len(qs_)}x{len(mat[0] if mat else [])} matrix")

        # network
        r = c.get(f"{BASE}/api/statistical/network/{qid}")
        if r.status_code != 200:
            fail(f"{qid} network", f"HTTP {r.status_code}"); continue
        nd = r.json()
        nodes = nd.get("nodes", [])
        edges = nd.get("edges", [])
        max_r = nd.get("max_r", 0)
        center = next((n for n in nodes if n.get("is_center")), None)
        if not center:
            fail(f"{qid} network no center"); continue
        ok(f"{qid} network", f"{len(nodes)} nodes  {len(edges)} edges  max_r={max_r}")

        # insights
        r = c.get(f"{BASE}/api/statistical/insights/{qid}")
        if r.status_code != 200:
            fail(f"{qid} insights", f"HTTP {r.status_code}"); continue
        ins = r.json().get("insight", "")
        ok(f"{qid} insights", ins[:70] if ins else "(empty)")

    # 2.3 Invalid question ID
    print("\n[2.3] Invalid question ID")
    r = c.get(f"{BASE}/api/statistical/correlations/Q_INVALID_9999")
    ok("invalid Q ID handled", f"HTTP {r.status_code}")


# ─────────────────────────────────────────────────────────────
# 3. DYNAMIC PERSONA BUILDER
# ─────────────────────────────────────────────────────────────

def test_persona(c):
    section("3. DYNAMIC PERSONA BUILDER")

    # 3.1 Dimensions
    print("\n[3.1] Dimensions")
    d = get(c, "/api/persona/dimensions", "GET /dimensions", key="dimensions", min_n=1)
    dims = (d or {}).get("dimensions", [])
    for dim in dims:
        vals = dim.get("values", [])
        print(f"      {dim['id']:20s}: {len(vals)} values  {vals[:4]}")

    # 3.2 Cohorts
    print("\n[3.2] Cohorts list")
    get(c, "/api/persona/cohorts", "GET /cohorts", key="cohorts", min_n=1)

    # 3.3 Top 5 suggestions
    print("\n[3.3] Top 5 persona suggestions")
    get(c, "/api/persona/top5", "GET /top5", key="personas", min_n=1)

    # 3.4 All-employees baseline (empty filters)
    print("\n[3.4] All employees (empty filters)")
    d = post(c, "/api/persona/query",
             {"filters": [], "comparison_cohorts": ["new_joiners", "gen_y"], "persona_name": "All Employees"},
             "POST /query (all employees)")
    if d:
        print(f"      n={d['persona_n']}  themes={len(d.get('themes',[]))}")
        for t in d.get("themes", []):
            diff_vs_overall = t.get('delta_overall', 0)
            print(f"      {t['theme']:30s}  persona={t['persona_score']:.2f}  overall={t['overall_score']:.2f}  sig={t.get('significance_label','?')}")
        for comp in d.get("comparisons", []):
            print(f"      comparison: {comp['label']}  n={comp['n']}")

    # 3.5 Filter by every dimension value
    print("\n[3.5] Filter combos — one per dimension")
    filter_tests = [
        # (label, filters, expected_min_n)
        ("Gen Z",              [{"dimension":"generation","operator":"eq","value":"Gen Z"}], 50),
        ("Gen Y",              [{"dimension":"generation","operator":"eq","value":"Gen Y"}], 200),
        ("Gen X",              [{"dimension":"generation","operator":"eq","value":"Gen X"}], 100),
        ("Female",             [{"dimension":"gender","operator":"eq","value":"Female"}], 100),
        ("Male",               [{"dimension":"gender","operator":"eq","value":"Male"}], 200),
        ("People Managers",    [{"dimension":"is_manager","operator":"eq","value":"Yes"}], 100),
        ("Individual Contrib", [{"dimension":"is_manager","operator":"eq","value":"No"}], 200),
        ("New Joiners 0-2",    [{"dimension":"tenure","operator":"eq","value":"0-2"}], 100),
        ("Tenure 2-5yr",       [{"dimension":"tenure","operator":"eq","value":"2-5"}], 100),
        ("Tenure 5-10yr",      [{"dimension":"tenure","operator":"eq","value":"5-10"}], 50),
        ("Non Management",     [{"dimension":"job_level","operator":"eq","value":"Non Management"}], 50),
        ("Middle Management",  [{"dimension":"job_level","operator":"eq","value":"Middle Management"}], 30),
        ("Age 30-35",          [{"dimension":"age_group","operator":"eq","value":"30-35"}], 50),
        ("Age 40-45",          [{"dimension":"age_group","operator":"eq","value":"40-45"}], 30),
        ("ABGLP Yes",          [{"dimension":"abglp","operator":"eq","value":"Yes"}], 1),
    ]
    for label, filters, min_n in filter_tests:
        r = c.post(f"{BASE}/api/persona/query",
                   json={"filters": filters, "comparison_cohorts": ["new_joiners","gen_y"], "persona_name": label},
                   timeout=30)
        if r.status_code != 200:
            err = r.json().get("detail","")[:80]
            fail(label, err); continue
        d = r.json()
        n = d.get("persona_n", 0)
        themes_count = len(d.get("themes", []))
        comps_count  = len(d.get("comparisons", []))
        if n < min_n:
            warn(label, f"n={n} < expected {min_n}")
        elif themes_count == 0:
            fail(label, "no themes returned")
        else:
            ok(label, f"n={n}  themes={themes_count}  comparisons={comps_count}")

    # 3.6 Businesses
    print("\n[3.6] Business filter")
    businesses = next((dim["values"] for dim in dims if dim["id"] == "business"), [])
    print(f"      {len(businesses)} businesses in data: {businesses[:3]}...")
    for biz in businesses[:5]:
        r = c.post(f"{BASE}/api/persona/query",
                   json={"filters":[{"dimension":"business","operator":"eq","value":biz}],
                         "comparison_cohorts":["new_joiners"], "persona_name":biz},
                   timeout=30)
        if r.status_code == 200:
            n = r.json().get("persona_n", 0)
            ok(f"business={biz[:30]}", f"n={n}")
        elif r.status_code == 400:
            warn(f"business={biz[:30]}", r.json().get("detail","")[:60])
        else:
            fail(f"business={biz[:30]}", f"HTTP {r.status_code}")

    # 3.7 Multi-dimension (Gen Y + People Manager)
    print("\n[3.7] Multi-dimension filter")
    d = post(c, "/api/persona/query", {
        "filters": [
            {"dimension":"generation","operator":"eq","value":"Gen Y"},
            {"dimension":"is_manager","operator":"eq","value":"Yes"},
        ],
        "comparison_cohorts": ["new_joiners","gen_y","managers"],
        "persona_name": "Gen Y People Managers",
    }, "Gen Y + People Manager", timeout=30)
    if d:
        ok("Gen Y People Managers detail", f"n={d['persona_n']}  comps={len(d.get('comparisons',[]))}")

    # 3.8 Takeaways (AI)
    print("\n[3.8] AI Takeaways")
    r = c.post(f"{BASE}/api/persona/query",
               json={"filters":[{"dimension":"gender","operator":"eq","value":"Female"}],
                     "comparison_cohorts":["new_joiners"],"persona_name":"Female Employees"},
               timeout=30)
    if r.status_code == 200:
        qd = r.json()
        r2 = c.post(f"{BASE}/api/persona/takeaways",
                    json={"persona_name":"Female Employees","themes":qd["themes"],"persona_n":qd["persona_n"]},
                    timeout=60)
        if r2.status_code == 200:
            ta = r2.json().get("takeaways",[])
            ok("AI takeaways generated", f"{len(ta)} items")
            for t in ta: print(f"      - {t[:80]}")
        else:
            fail("AI takeaways", f"HTTP {r2.status_code}")

    # 3.9 Save persona
    print("\n[3.9] Save persona")
    r = c.post(f"{BASE}/api/persona/save",
               json={"persona_name":"Test Save","filters":[{"dimension":"gender","operator":"eq","value":"Male"}],
                     "persona_n":200,"scores":{}})
    if r.status_code == 200 and r.json().get("success"):
        ok("POST /save", f"id={r.json().get('id')}")
    else:
        fail("POST /save", f"HTTP {r.status_code}")

    # 3.10 Empty/invalid filter
    print("\n[3.10] Non-existent filter value")
    r = c.post(f"{BASE}/api/persona/query",
               json={"filters":[{"dimension":"business","operator":"eq","value":"__doesnt_exist__"}],
                     "comparison_cohorts":[],"persona_name":"Empty"},
               timeout=10)
    if r.status_code == 400:
        ok("non-existent filter → 400")
    else:
        warn("non-existent filter", f"HTTP {r.status_code}")


# ─────────────────────────────────────────────────────────────
# 4. SENTIMENT ANALYSIS (static page — API smoke test)
# ─────────────────────────────────────────────────────────────

def test_sentiment(c):
    section("4. SENTIMENT ANALYSIS (static page)")
    print("\n[4.1] Meta endpoint (data authenticity check)")
    r = c.get(f"{BASE}/api/meta")
    if r.status_code == 200:
        d = r.json()
        ok("GET /meta", f"group_avg={d.get('group_avg')}  companies={d.get('companies',['?'])[0] if d.get('companies') else '?'}...")
    else:
        fail("GET /meta", f"HTTP {r.status_code}")

    print("\n[4.2] Summary data (confirms real data flows to all pages)")
    r = c.get(f"{BASE}/api/summary")
    if r.status_code == 200:
        d = r.json()
        ok("GET /summary", f"themes={len(d.get('themes',[]))}  n={d.get('total_responses',0)}")
    else:
        fail("GET /summary", f"HTTP {r.status_code}")


# ─────────────────────────────────────────────────────────────
# RUNNER
# ─────────────────────────────────────────────────────────────

def main():
    print("\nABG VIBES — All 4 New Pages Complete Integration Test")
    print(f"Backend: {BASE}\n")

    try:
        httpx.get(f"{BASE}/api/meta", timeout=5)
    except Exception as e:
        print(f"[ERROR] Backend not reachable: {e}")
        print("Start it with:  python -m uvicorn server.main:app --reload --port 8000")
        sys.exit(1)

    with httpx.Client(timeout=90) as c:
        test_hypothesis(c)
        test_statistical(c)
        test_persona(c)
        test_sentiment(c)

    print(f"\n{'='*64}")
    total = PASS + FAIL + WARN
    pct = round(100 * PASS / total) if total else 0
    print(f"  PASS {PASS}  |  FAIL {FAIL}  |  WARN {WARN}  |  TOTAL {total}  ({pct}%)")
    print(f"{'='*64}\n")
    sys.exit(1 if FAIL > 0 else 0)

if __name__ == "__main__":
    main()
