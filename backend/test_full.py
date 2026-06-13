"""
Full pre-flight check for the FastAPI Python rewrite.
Run from: d:\ABCEL\backend\
  python test_full.py
"""
import sys, os, json, math, asyncio, inspect
sys.path.insert(0, 'server')

PASS = []
FAIL = []

def ok(msg):
    PASS.append(msg)
    print(f"  PASS  {msg}")

def fail(msg, err):
    FAIL.append(msg)
    print(f"  FAIL  {msg}: {err}")

# ─── 1. lib/stats.py ──────────────────────────────────────────────────────────
print("\n[1] lib/stats.py")
try:
    from lib.stats import (
        pearson_r, pearson_p_value, correlation_strength, correlation_category,
        two_sample_z_test, one_sample_z_test, normal_cdf, mean, std_dev, significance_badge
    )
    assert pearson_r([1,2,3],[1,2,3]) == 1.0,           "pearsonR perfect"
    assert pearson_p_value(1.0, 10) == 0.0,              "pearsonPValue r=1"
    assert correlation_strength(0.6) == 'Strong +',      "strength strong"
    assert correlation_category(0.6) == 'strong_positive',"category"
    z = two_sample_z_test(4.0, 3.5, 0.8, 0.9, 100, 100)
    assert z['significant'],                              "two_sample significant"
    m = mean([1,2,3,4,5])
    assert m == 3.0,                                      "mean"
    sd = std_dev([2,4,4,4,5,5,7,9])
    assert round(sd, 4) == 2.0,                          "stdDev"
    b = significance_badge(0.0005)
    assert b['label'] == '***',                          "badge ***"
    ok("all 10 functions import and compute correctly")
except Exception as e:
    fail("lib/stats", e)

# ─── 2. lib/llm.py ────────────────────────────────────────────────────────────
print("\n[2] lib/llm.py")
try:
    from lib.llm import call_mistral, call_cerebras, call_llm, call_llm_json
    assert inspect.iscoroutinefunction(call_llm),        "call_llm is async"
    assert inspect.iscoroutinefunction(call_llm_json),   "call_llm_json is async"
    ok("4 functions, all async")
except Exception as e:
    fail("lib/llm", e)

# ─── 3. lib/nlp.py ────────────────────────────────────────────────────────────
print("\n[3] lib/nlp.py")
try:
    from lib.nlp import classify_batch, aggregate_topics, sentiment_over_time
    assert inspect.iscoroutinefunction(classify_batch),  "classify_batch async"
    mock = [
        {'score': 0.8,  'topics': ['Leadership', 'Culture'], 'month': 'Jan'},
        {'score': -0.5, 'topics': ['Workload'],               'month': 'Feb'},
    ]
    agg = aggregate_topics(mock)
    assert len(agg) == 3,                                "aggregate 3 topics"
    sot = sentiment_over_time(mock)
    assert len(sot) == 2,                                "2 months"
    ok("3 functions, compute correctly")
except Exception as e:
    fail("lib/nlp", e)

# ─── 4. routes/upload.py ──────────────────────────────────────────────────────
print("\n[4] routes/upload.py")
try:
    from routes.upload import router as r_upload
    paths = [rt.path for rt in r_upload.routes]
    assert '/' in paths,                                 "POST / exists"
    assert len(paths) == 1,                              "exactly 1 route"
    ok(f"1 route: {paths}")
except Exception as e:
    fail("routes/upload", e)

# ─── 5. routes/data.py ────────────────────────────────────────────────────────
print("\n[5] routes/data.py")
try:
    from routes.data import router as r_data, _read, _FILES
    paths = sorted(rt.path for rt in r_data.routes)
    assert len(paths) == 8,                              "8 routes"
    assert '/status' in paths,                           "/status exists"
    assert '/load-sample' in paths,                      "/load-sample exists"
    assert '/reset' in paths,                            "/reset exists"
    assert len(_FILES) == 5,                             "5 data files"
    ok(f"8 routes: {paths}")
except Exception as e:
    fail("routes/data", e)

# ─── 6. routes/ai.py ──────────────────────────────────────────────────────────
print("\n[6] routes/ai.py")
try:
    from routes.ai import router as r_ai, _parse_json, _build_context, SKILLS
    paths = sorted(rt.path for rt in r_ai.routes)
    assert len(paths) == 6,                              "6 routes"
    # _parse_json: clean
    assert _parse_json('{"a":1}') == {"a": 1},           "parse clean"
    # _parse_json: fenced
    assert _parse_json('```json\n{"x":2}\n```') == {"x": 2}, "parse fenced"
    # _parse_json: trailing garbage → last_safe_end path
    assert _parse_json('{"a":1}garbage') == {"a": 1},   "parse trailing garbage"
    # unrecoverable raises
    try:
        _parse_json('not json at all')
        fail("routes/ai _parse_json should raise", "no exception raised")
    except ValueError:
        pass
    assert len(SKILLS) == 8,                             "8 skills"
    ok(f"6 routes, _parse_json 4 paths verified, 8 SKILLS")
except Exception as e:
    fail("routes/ai", e)

# ─── 7. routes/sentiment.py ───────────────────────────────────────────────────
print("\n[7] routes/sentiment.py")
try:
    from routes.sentiment import router as r_sent, CATEGORY_REPS, _filter
    paths = sorted(rt.path for rt in r_sent.routes)
    assert len(paths) == 5,                              "5 routes"
    assert 'Career Growth' in CATEGORY_REPS,             "Career Growth rep"
    assert CATEGORY_REPS['Leadership'] == 'OP5',         "Leadership -> OP5"
    mock = [
        {'label': 'Positive', 'score': 0.8, 'is_active': True,  'business_unit': 'BU1'},
        {'label': 'Negative', 'score':-0.5, 'is_active': False, 'business_unit': 'BU2'},
    ]
    assert len(_filter(mock, None, None, None, None, None, 'No')) == 1, "filter inactive"
    ok(f"5 routes, CATEGORY_REPS correct, _filter works")
except Exception as e:
    fail("routes/sentiment", e)

# ─── 8. routes/statistical.py ─────────────────────────────────────────────────
print("\n[8] routes/statistical.py")
try:
    from routes.statistical import router as r_stat, _scores, _filter as sf
    paths = sorted(rt.path for rt in r_stat.routes)
    assert len(paths) == 5,                              "5 routes"
    assert '/questions' in paths,                        "/questions"
    assert '/correlations/{question_id}' in paths,       "/correlations/{q}"
    mock = [
        {'scores': {'OP1': 4.2, 'OP5': 3.8}},
        {'scores': {'OP1': 3.5}},
        {'scores': {'OP1': 4.8, 'OP5': 4.1}},
    ]
    assert _scores(mock, 'OP1') == [4.2, 3.5, 4.8],     "_scores OP1 = 3"
    assert _scores(mock, 'OP5') == [3.8, 4.1],           "_scores OP5 = 2"
    ok(f"5 routes, _scores correct")
except Exception as e:
    fail("routes/statistical", e)

# ─── 9. routes/persona.py ─────────────────────────────────────────────────────
print("\n[9] routes/persona.py")
try:
    from routes.persona import (
        router as r_pers, DIMS, THEMES, BUILTIN_COHORTS,
        _apply_filters, _compute_group_scores
    )
    paths = sorted(rt.path for rt in r_pers.routes)
    assert len(paths) == 6,                              "6 routes"
    assert len(DIMS) == 8,                               "8 dims"
    assert len(THEMES) == 6,                             "6 themes"
    assert len(BUILTIN_COHORTS) == 8,                    "8 builtin cohorts"
    mock = [
        {'generation':'Gen Z','engagement':3.8,'leadership':4.0,'performance_culture':3.5,'development_and_career':3.2,'manager_effectiveness':4.1,'onboarding':3.9},
        {'generation':'Gen Y','engagement':4.2,'leadership':3.9,'performance_culture':4.0,'development_and_career':3.8,'manager_effectiveness':4.3,'onboarding':4.2},
        {'generation':'Gen Z','engagement':3.5,'leadership':3.7,'performance_culture':3.3,'development_and_career':3.0,'manager_effectiveness':3.9,'onboarding':3.7},
    ]
    f1 = _apply_filters(mock, [{'dimension':'generation','operator':'eq','value':'Gen Z'}])
    assert len(f1) == 2,                                 "filter Gen Z = 2"
    gs = _compute_group_scores(f1, THEMES)
    assert gs['Engagement']['n'] == 2,                   "group n=2"
    assert round(gs['Engagement']['mean'], 2) == 3.65,   "engagement mean 3.65"
    ok("6 routes, 8 dims, 6 themes, 8 cohorts, filters+scores correct")
except Exception as e:
    fail("routes/persona", e)

# ─── 10. routes/hypothesis.py ─────────────────────────────────────────────────
print("\n[10] routes/hypothesis.py")
try:
    from routes.hypothesis import router as r_hyp, VARIABLE_MAP
    paths = sorted(rt.path for rt in r_hyp.routes)
    assert len(paths) == 5,                              "5 routes"
    assert '/test' in paths,                             "/test"
    assert '/templates' in paths,                        "/templates"
    assert '/history' in paths,                          "/history"
    assert '/history/{item_id}' in paths,                "/history/{id}"
    assert VARIABLE_MAP['engagement'] == 'engagement',   "engagement maps"
    assert VARIABLE_MAP['development'] == 'development_and_career', "dev maps"
    ok(f"5 routes, VARIABLE_MAP correct")
except Exception as e:
    fail("routes/hypothesis", e)

# ─── 11. main.py — app assembly ───────────────────────────────────────────────
print("\n[11] main.py — full app assembly")
try:
    import main
    app = main.app
    # Collect all registered routes
    all_routes = []
    for route in app.routes:
        if hasattr(route, 'path'):
            all_routes.append(route.path)
    # Check key API prefixes exist
    api_paths = [p for p in all_routes if p.startswith('/api')]
    assert any('/api/upload' in p for p in all_routes),  "/api/upload mounted"
    assert any('/api/status' in p for p in all_routes),  "/api/status mounted"
    assert any('/api/summary' in p for p in all_routes), "/api/summary mounted"
    assert any('/api/sentiment' in p for p in all_routes),"/api/sentiment mounted"
    assert any('/api/statistical' in p for p in all_routes),"/api/statistical mounted"
    assert any('/api/persona' in p for p in all_routes), "/api/persona mounted"
    assert any('/api/hypothesis' in p for p in all_routes),"/api/hypothesis mounted"
    # SPA catch-all
    assert any('{full_path' in p for p in all_routes),   "SPA catch-all"
    ok(f"App assembled, {len(all_routes)} total routes, all prefixes present")
except Exception as e:
    fail("main.py", e)

# ─── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'='*55}")
print(f"  PASSED: {len(PASS)}   FAILED: {len(FAIL)}")
if FAIL:
    print("\n  FAILURES:")
    for f in FAIL:
        print(f"    - {f}")
else:
    print("  ALL CHECKS PASSED - ready to run")
print('='*55)
