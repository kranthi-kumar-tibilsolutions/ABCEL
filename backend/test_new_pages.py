"""
Full integration test for the 3 new pages:
  - Hypothesis Testing   (/api/hypothesis/*)
  - Statistical Analysis (/api/statistical/*)
  - Dynamic Persona Builder (/api/persona/*)

Run with backend on http://localhost:8000:
  cd d:\ABCEL\backend
  python test_new_pages.py
"""

import sys
import io
import json
import time
import asyncio
import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0
WARN = 0

# ── helpers ──────────────────────────────────────────────────────────────────

def ok(label, detail=""):
    global PASS
    PASS += 1
    d = f"  ({detail})" if detail else ""
    print(f"  [PASS] {label}{d}")

def fail(label, detail=""):
    global FAIL
    FAIL += 1
    d = f"  ({detail})" if detail else ""
    print(f"  [FAIL] {label}{d}")

def warn(label, detail=""):
    global WARN
    WARN += 1
    d = f"  ({detail})" if detail else ""
    print(f"  [WARN] {label}{d}")

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def check(r, label, key=None, min_n=None, nonempty=False):
    if r.status_code != 200:
        fail(label, f"HTTP {r.status_code}: {r.text[:120]}")
        return None
    try:
        d = r.json()
    except Exception as e:
        fail(label, f"JSON parse error: {e}")
        return None
    if key and not d.get(key):
        fail(label, f"missing key '{key}'")
        return None
    if min_n is not None:
        arr = d.get(key, d) if key else d
        n = len(arr) if isinstance(arr, (list, dict)) else 0
        if n < min_n:
            fail(label, f"expected >= {min_n} items, got {n}")
            return None
    if nonempty:
        val = d.get(key) if key else d
        if not val:
            fail(label, "empty result")
            return None
    ok(label)
    return d


# ── Section 1: Hypothesis Testing ────────────────────────────────────────────

def test_hypothesis(client: httpx.Client):
    section("1. HYPOTHESIS TESTING")

    # 1.1 templates
    print("\n  [1.1] GET /api/hypothesis/templates")
    d = check(client.get(f"{BASE}/api/hypothesis/templates"), "fetch templates", key="templates", min_n=5)
    templates = [t["text"] for t in (d or {}).get("templates", [])]

    # 1.2 history (initially empty or existing)
    print("\n  [1.2] GET /api/hypothesis/history")
    d2 = check(client.get(f"{BASE}/api/hypothesis/history"), "fetch history", key="items")
    initial_count = len((d2 or {}).get("items", []))
    print(f"        existing history records: {initial_count}")

    # 1.3 run each template
    print("\n  [1.3] POST /api/hypothesis/test  (all 5 templates)")
    saved_ids = []
    for i, tpl in enumerate(templates, 1):
        print(f"\n    Template T-{i:03d}: {tpl[:70]}...")
        r = client.post(
            f"{BASE}/api/hypothesis/test",
            json={"hypothesis_text": tpl, "filters": {}, "alpha": 0.05},
            timeout=60,
        )
        if r.status_code != 200:
            fail(f"T-{i:03d} HTTP error", f"{r.status_code}: {r.text[:120]}")
            continue
        d = r.json()
        if not d.get("success"):
            fail(f"T-{i:03d} failed", d.get("error", "unknown"))
            continue
        res = d.get("result", {})
        n = res.get("n", 0)
        z = res.get("z", 0)
        verdict = res.get("verdict", "?")
        ok(f"T-{i:03d} result", f"n={n}  z={z:.3f}  verdict={verdict}")
        if n < 30:
            warn(f"T-{i:03d} small sample", f"n={n}")

    # 1.4 custom hypothesis with demographic filter
    print("\n  [1.4] Custom hypotheses")

    custom_tests = [
        {
            "text": "Gen Z employees have lower Engagement scores than the group average.",
            "filters": {},
            "label": "Gen Z engagement vs average",
        },
        {
            "text": "People Managers have higher Leadership scores than the group average.",
            "filters": {},
            "label": "People managers vs avg leadership",
        },
        {
            "text": "Female employees rate Manager Effectiveness higher than the group average.",
            "filters": {},
            "label": "Female vs avg manager effectiveness",
        },
        {
            "text": "New Joiners (tenure 0-2 years) have lower Performance Culture scores than average.",
            "filters": {},
            "label": "New joiners vs avg performance culture",
        },
    ]

    for ct in custom_tests:
        r = client.post(
            f"{BASE}/api/hypothesis/test",
            json={"hypothesis_text": ct["text"], "filters": ct["filters"], "alpha": 0.05},
            timeout=60,
        )
        if r.status_code != 200:
            fail(ct["label"], f"HTTP {r.status_code}")
            continue
        d = r.json()
        if not d.get("success"):
            fail(ct["label"], d.get("error", "?")[:80])
            continue
        res = d.get("result", {})
        ok(ct["label"], f"n={res.get('n')}  verdict={res.get('verdict')}")

    # 1.5 fetch updated history
    print("\n  [1.5] History after tests")
    d3 = check(client.get(f"{BASE}/api/hypothesis/history"), "history updated", key="items")
    new_count = len((d3 or {}).get("items", []))
    if new_count > initial_count:
        ok("history grew", f"{initial_count} -> {new_count}")
    else:
        warn("history not growing", f"count={new_count}")

    # 1.6 delete first history item
    print("\n  [1.6] DELETE history item")
    items = (d3 or {}).get("items", [])
    if items:
        item_id = items[0]["id"]
        r = client.delete(f"{BASE}/api/hypothesis/history/{item_id}")
        if r.status_code == 200 and r.json().get("success"):
            ok("delete history item", f"deleted {item_id}")
        else:
            fail("delete history item", f"HTTP {r.status_code}")
        # verify deleted
        r2 = client.get(f"{BASE}/api/hypothesis/history")
        remaining = r2.json().get("items", [])
        ids = [h["id"] for h in remaining]
        if item_id not in ids:
            ok("item removed from list")
        else:
            fail("item still in list after delete")
    else:
        warn("no items to delete")

    # 1.7 invalid hypothesis
    print("\n  [1.7] Invalid / unparseable hypothesis")
    r = client.post(
        f"{BASE}/api/hypothesis/test",
        json={"hypothesis_text": "I like pizza and dogs", "filters": {}, "alpha": 0.05},
        timeout=30,
    )
    d = r.json()
    if not d.get("success"):
        ok("invalid hypothesis rejected gracefully", d.get("error", "")[:60])
    else:
        warn("invalid hypothesis accepted", "LLM still parsed it — may be OK")


# ── Section 2: Statistical Analysis ──────────────────────────────────────────

def test_statistical(client: httpx.Client):
    section("2. STATISTICAL ANALYSIS")

    # 2.1 questions list
    print("\n  [2.1] GET /api/statistical/questions")
    d = check(client.get(f"{BASE}/api/statistical/questions"), "fetch questions list", key="questions", min_n=1)
    questions = (d or {}).get("questions", [])
    print(f"        {len(questions)} questions available")
    if not questions:
        warn("no questions — skipping downstream tests")
        return

    # 2.2 test first 5 questions fully (correlations + correlogram + network + insights)
    test_qs = questions[:5]
    print(f"\n  [2.2] Full data cycle for first {len(test_qs)} questions")
    for q in test_qs:
        qid   = q["id"]
        qtext = q.get("text", "")[:55]
        print(f"\n    Q {qid}: {qtext}...")

        # correlations
        r = client.get(f"{BASE}/api/statistical/correlations/{qid}")
        if r.status_code == 200:
            d = r.json()
            corrs = d.get("correlations", [])
            tc    = d.get("tab_counts", {})
            ok(f"{qid} correlations", f"{len(corrs)} correlations  tab_counts={tc}")
            if len(corrs) == 0:
                warn(f"{qid} zero correlations")
        else:
            fail(f"{qid} correlations", f"HTTP {r.status_code}")

        # correlogram
        r = client.get(f"{BASE}/api/statistical/correlogram/{qid}")
        if r.status_code == 200:
            d = r.json()
            matrix = d.get("matrix", [])
            qs_    = d.get("question_ids", [])
            ok(f"{qid} correlogram", f"{len(qs_)}x{len(qs_)} matrix")
        else:
            fail(f"{qid} correlogram", f"HTTP {r.status_code}")

        # network
        r = client.get(f"{BASE}/api/statistical/network/{qid}")
        if r.status_code == 200:
            d = r.json()
            nodes = d.get("nodes", [])
            edges = d.get("edges", [])
            center = next((n for n in nodes if n.get("is_center")), None)
            ok(f"{qid} network", f"{len(nodes)} nodes  {len(edges)} edges  center={'yes' if center else 'NO'}")
            if not center:
                warn(f"{qid} no center node")
        else:
            fail(f"{qid} network", f"HTTP {r.status_code}")

        # insights
        r = client.get(f"{BASE}/api/statistical/insights/{qid}")
        if r.status_code == 200:
            d   = r.json()
            ins = d.get("insight", "")[:60]
            ok(f"{qid} insights", ins or "(empty)")
            if not ins:
                warn(f"{qid} empty insight")
        else:
            fail(f"{qid} insights", f"HTTP {r.status_code}")

    # 2.3 Spot-check remaining questions (correlations only)
    if len(questions) > 5:
        remaining = questions[5:]
        print(f"\n  [2.3] Spot-check {len(remaining)} remaining questions (correlations only)")
        for q in remaining:
            qid = q["id"]
            r = client.get(f"{BASE}/api/statistical/correlations/{qid}")
            if r.status_code == 200:
                d = r.json()
                corrs = d.get("correlations", [])
                ok(f"{qid}", f"{len(corrs)} correlations")
            else:
                fail(f"{qid}", f"HTTP {r.status_code}")

    # 2.4 Invalid question ID
    print("\n  [2.4] Invalid question ID")
    r = client.get(f"{BASE}/api/statistical/correlations/Q9999")
    if r.status_code in (404, 400, 200):
        ok("invalid Q ID handled", f"HTTP {r.status_code}")
    else:
        fail("invalid Q ID", f"HTTP {r.status_code}")


# ── Section 3: Persona Builder ────────────────────────────────────────────────

def test_persona(client: httpx.Client):
    section("3. DYNAMIC PERSONA BUILDER")

    # 3.1 dimensions
    print("\n  [3.1] GET /api/persona/dimensions")
    d = check(client.get(f"{BASE}/api/persona/dimensions"), "fetch dimensions", key="dimensions", min_n=1)
    dims = (d or {}).get("dimensions", [])
    print(f"        {len(dims)} dimensions available:")
    for dim in dims:
        vals = dim.get("values", [])
        print(f"          {dim['id']:20s} ({len(vals)} values)  e.g. {vals[:3]}")

    # 3.2 cohorts
    print("\n  [3.2] GET /api/persona/cohorts")
    check(client.get(f"{BASE}/api/persona/cohorts"), "fetch cohorts", key="cohorts", min_n=1)

    # 3.3 query — empty filters (all employees)
    print("\n  [3.3] POST /api/persona/query  (no filters = all employees)")
    r = client.post(f"{BASE}/api/persona/query",
        json={"filters": [], "comparison_cohorts": ["new_joiners", "gen_y"], "persona_name": "All Employees"},
        timeout=30)
    if r.status_code == 200:
        d = r.json()
        themes_ = d.get("themes", [])
        n = d.get("persona_n", 0)
        ok("all-employees query", f"n={n}  themes={len(themes_)}")
        for t in themes_:
            print(f"          {t['theme']:30s} persona={t['persona_score']:.2f}  overall={t['overall_score']:.2f}  sig={t['significance_label']}")
    else:
        fail("all-employees query", f"HTTP {r.status_code}: {r.text[:120]}")

    # 3.4 filter combos — one per dimension
    print("\n  [3.4] Single-dimension filter queries")
    filter_combos = [
        {"filters": [{"dimension": "generation", "operator": "eq", "value": "Gen Z"}],    "label": "Gen Z"},
        {"filters": [{"dimension": "generation", "operator": "eq", "value": "Gen Y"}],    "label": "Gen Y (Millennials)"},
        {"filters": [{"dimension": "gender",     "operator": "eq", "value": "Female"}],   "label": "Female employees"},
        {"filters": [{"dimension": "is_manager", "operator": "eq", "value": "Yes"}],      "label": "People Managers"},
        {"filters": [{"dimension": "is_manager", "operator": "eq", "value": "No"}],       "label": "Individual Contributors"},
        {"filters": [{"dimension": "abglp",      "operator": "eq", "value": "Yes"}],      "label": "ABGLP Talent Pool"},
        {"filters": [{"dimension": "tenure",     "operator": "eq", "value": "0-2 years"}],"label": "New Joiners (0-2yr)"},
    ]
    for fc in filter_combos:
        r = client.post(f"{BASE}/api/persona/query",
            json={"filters": fc["filters"], "comparison_cohorts": ["new_joiners"], "persona_name": fc["label"]},
            timeout=30)
        if r.status_code == 200:
            d = r.json()
            n  = d.get("persona_n", 0)
            ds = d.get("diff_summary", {}).get("vs_overall", 0)
            ok(fc["label"], f"n={n}  sig_themes={ds}/{len(d.get('themes',[])) }")
            if n < 30:
                warn(f"{fc['label']} small n", f"n={n}")
        else:
            try:
                err = r.json().get("detail", r.text[:80])
            except Exception:
                err = r.text[:80]
            fail(fc["label"], err)

    # 3.5 multi-dimension filter
    print("\n  [3.5] Multi-dimension filter query")
    r = client.post(f"{BASE}/api/persona/query",
        json={
            "filters": [
                {"dimension": "generation", "operator": "eq", "value": "Gen Y"},
                {"dimension": "is_manager", "operator": "eq", "value": "Yes"},
            ],
            "comparison_cohorts": ["new_joiners", "gen_y", "managers"],
            "persona_name": "Gen Y People Managers",
        },
        timeout=30)
    if r.status_code == 200:
        d = r.json()
        ok("Gen Y People Managers", f"n={d.get('persona_n')}  comparisons={len(d.get('comparisons',[]))}")
    else:
        try:
            err = r.json().get("detail", r.text[:80])
        except Exception:
            err = r.text[:80]
        fail("Gen Y People Managers multi-filter", err)

    # 3.6 business dimension (from real data)
    print("\n  [3.6] Business dimension queries")
    businesses = next((dim["values"] for dim in dims if dim["id"] == "business"), [])
    for biz in businesses[:4]:
        r = client.post(f"{BASE}/api/persona/query",
            json={"filters": [{"dimension": "business", "operator": "eq", "value": biz}],
                  "comparison_cohorts": [], "persona_name": biz},
            timeout=30)
        if r.status_code == 200:
            d = r.json()
            ok(f"business={biz}", f"n={d.get('persona_n')}")
        else:
            try:
                err = r.json().get("detail", r.text[:80])
            except Exception:
                err = r.text[:80]
            if "at least 30" in err or "No employees" in err:
                warn(f"business={biz}", err[:60])
            else:
                fail(f"business={biz}", err)

    # 3.7 takeaways
    print("\n  [3.7] POST /api/persona/takeaways")
    r0 = client.post(f"{BASE}/api/persona/query",
        json={"filters": [{"dimension": "gender", "operator": "eq", "value": "Female"}],
              "comparison_cohorts": ["new_joiners"], "persona_name": "Female Employees"},
        timeout=30)
    if r0.status_code == 200:
        d0  = r0.json()
        r_ta = client.post(f"{BASE}/api/persona/takeaways",
            json={"persona_name": "Female Employees", "themes": d0["themes"], "persona_n": d0["persona_n"]},
            timeout=60)
        if r_ta.status_code == 200:
            ta = r_ta.json().get("takeaways", [])
            ok("AI takeaways", f"{len(ta)} takeaways")
            for t in ta:
                print(f"          - {t[:80]}")
        else:
            fail("AI takeaways", f"HTTP {r_ta.status_code}")
    else:
        warn("takeaways skipped (query failed)")

    # 3.8 save persona
    print("\n  [3.8] POST /api/persona/save")
    r = client.post(f"{BASE}/api/persona/save",
        json={"persona_name": "Test Persona Save", "filters": [{"dimension": "gender","operator":"eq","value":"Male"}],
              "persona_n": 100, "scores": {}})
    if r.status_code == 200 and r.json().get("success"):
        pid = r.json().get("id", "?")
        ok("save persona", f"id={pid}")
    else:
        fail("save persona", f"HTTP {r.status_code}")

    # 3.9 invalid / too-narrow filter
    print("\n  [3.9] Empty result filter (expect 400)")
    r = client.post(f"{BASE}/api/persona/query",
        json={"filters": [{"dimension": "business","operator":"eq","value":"__nonexistent__"}],
              "comparison_cohorts": [], "persona_name": "Empty"},
        timeout=10)
    if r.status_code == 400:
        ok("too-narrow filter → 400")
    elif r.status_code == 200:
        d = r.json()
        warn("narrow filter returned 200", f"n={d.get('persona_n')}")
    else:
        fail("narrow filter unexpected error", f"HTTP {r.status_code}")

    # 3.10 top5 suggestions
    print("\n  [3.10] GET /api/persona/top5")
    check(client.get(f"{BASE}/api/persona/top5"), "top5 persona suggestions", key="personas", min_n=1)


# ── Run all ───────────────────────────────────────────────────────────────────

def main():
    print("\nABG VIBES — New Pages Integration Test")
    print("Testing: Hypothesis  |  Statistical Analysis  |  Persona Builder")
    print(f"Backend: {BASE}\n")

    try:
        with httpx.Client(timeout=90) as client:
            client.get(f"{BASE}/api/meta")   # warm up
    except Exception as e:
        print(f"[ERROR] Cannot reach backend at {BASE}: {e}")
        print("Make sure the FastAPI server is running.")
        sys.exit(1)

    with httpx.Client(timeout=90) as client:
        test_hypothesis(client)
        test_statistical(client)
        test_persona(client)

    print(f"\n{'='*60}")
    total = PASS + FAIL + WARN
    print(f"  RESULTS: {PASS} PASS  |  {FAIL} FAIL  |  {WARN} WARN  |  {total} total")
    print(f"{'='*60}\n")
    sys.exit(1 if FAIL > 0 else 0)


if __name__ == "__main__":
    main()
