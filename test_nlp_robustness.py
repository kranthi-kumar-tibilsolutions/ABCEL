"""
NLP Robustness Test Suite for ARIA Chat
========================================
Tests 6 categories based on NLP chatbot testing best practices:
  1. Synonym / Paraphrase Robustness  - same intent, different words
  2. Intent Classification            - follow-up vs data vs tab boundary
  3. Entity Disambiguation            - ambiguous / abbreviated names
  4. Context Chaining                 - multi-turn, pronouns, filter inheritance
  5. Scope Boundary                   - in-scope HR vs out-of-scope refusal
  6. Edge Cases                       - typos, very short, combined questions
"""

import urllib.request
import json
import time
import sys

BASE     = "http://localhost:8000"
ENDPOINT = f"{BASE}/api/chat"
TOKEN    = None


def login():
    global TOKEN
    data = json.dumps({"email": "niranjan@adityabirla.com", "password": "abg2026"}).encode()
    req  = urllib.request.Request(f"{BASE}/api/auth/login", data=data,
                                  headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read())
            TOKEN = body.get("token") or body.get("access_token")
    except Exception as e:
        print(f"[AUTH] Login failed: {e}")
        sys.exit(1)
    print("[AUTH] OK - token acquired\n")


def ask(message, history=None, active_context=None):
    payload = json.dumps({
        "message":        message,
        "history":        history or [],
        "dimension":      "Business Unit",
        "active_context": active_context,
    }).encode()
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"}
    req  = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")
    full = ""
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            for line in r:
                line = line.decode("utf-8", errors="replace").strip()
                if line.startswith("data: ") and line != "data: [DONE]":
                    try:
                        full += json.loads(line[6:]).get("text", "")
                    except Exception:
                        pass
    except Exception as e:
        full = f"[ERROR: {e}]"
    return full.strip()


results   = []
cat_stats = {}


def check(label, category, response, must_contain=None, must_not_contain=None):
    # Normalize: replace non-breaking spaces with regular spaces before checking
    # then strip remaining non-ASCII (curly quotes, dashes) — but keep spaces between words
    response = response.replace(' ', ' ')  # non-breaking space
    response = response.replace('‑', '-')  # non-breaking hyphen
    response = response.replace('–', '-')  # en dash
    response = response.replace('—', '-')  # em dash
    response = response.replace('‘', "'")  # left single quote
    response = response.replace('’', "'")  # right single quote
    response = response.replace('“', '"')  # left double quote
    response = response.replace('”', '"')  # right double quote
    passed   = True
    fail_why = []

    if must_contain:
        for term in must_contain:
            terms = term if isinstance(term, list) else [term]
            if not any(t.lower() in response.lower() for t in terms):
                passed = False
                fail_why.append(f"missing any of {terms}")

    if must_not_contain:
        for bad in must_not_contain:
            if bad.lower() in response.lower():
                passed = False
                fail_why.append(f"contains banned: '{bad}'")

    status = "PASS" if passed else "FAIL"
    cat_stats.setdefault(category, {"pass": 0, "fail": 0})
    cat_stats[category]["pass" if passed else "fail"] += 1
    results.append((category, label, status, fail_why, response[:150]))

    icon = "OK" if passed else "XX"
    print(f"  {icon} [{status}] {label}")
    if not passed:
        for w in fail_why:
            print(f"       Reason: {w}")
        print(f"       Got   : {response[:120]}")
    return passed


# =============================================================================
# CATEGORY 1 - SYNONYM / PARAPHRASE ROBUSTNESS
# =============================================================================

def cat1_synonym():
    print("\n--- CATEGORY 1: Synonym / Paraphrase Robustness ---")

    r = ask("which age group has the highest engagement score?")
    check("age group -> generation (highest)", "Synonym", r,
          must_contain=[["Gen Y", "Gen Z", "Gen X", "Baby Boomer"]],
          must_not_contain=["don't have age group", "not a metric", "age group data not available"])
    time.sleep(2.5)

    r = ask("which age bracket is least engaged?")
    check("age bracket -> generation (least)", "Synonym", r,
          must_contain=[["Gen Y", "Gen Z", "Gen X", "Baby Boomer"]],
          must_not_contain=["don't have", "not tracked", "age bracket data"])
    time.sleep(2.5)

    r = ask("give me an age-wise breakdown of engagement scores")
    check("age-wise breakdown -> generation data", "Synonym", r,
          must_contain=[["Gen Y", "Gen Z", "Gen X"]],
          must_not_contain=["not available", "don't have"])
    time.sleep(2.5)

    r = ask("is there a difference in scores between different sex?")
    check("sex -> gender", "Synonym", r,
          must_contain=[["Male", "Female"]],
          must_not_contain=["not tracked", "sex data", "don't have"])
    time.sleep(2.5)

    r = ask("which grade of employees is least satisfied?")
    check("grade -> job level", "Synonym", r,
          must_contain=[["Management", "Junior", "Middle", "Senior"]],
          must_not_contain=["don't have grade", "not a metric"])
    time.sleep(2.5)

    r = ask("which years of service bracket has the lowest engagement?")
    check("years of service -> tenure", "Synonym", r,
          must_contain=[["0-2", "2-5", "5-10", "10-15", "15-20", "25"]],
          must_not_contain=["don't have", "not tracked"])
    time.sleep(2.5)

    r = ask("which business has the worst comms scores?")
    check("comms -> Communication category", "Synonym", r,
          must_contain=[["Communication", "Comm"]],
          must_not_contain=["don't have comms", "not a metric"])
    time.sleep(2.5)

    r = ask("what is the overall vibe of the organization?")
    check("vibe -> engagement", "Synonym", r,
          must_contain=[["4.", "engagement", "score"]],
          must_not_contain=["vibe is not a metric", "don't track vibe"])
    time.sleep(2.5)

    r = ask("which company has the lowest employee morale?")
    check("morale -> engagement (lowest scorer)", "Synonym", r,
          must_contain=[["4.", "score", "lowest"]],
          must_not_contain=["morale is not tracked", "don't have morale"])
    time.sleep(2.5)

    r = ask("show me the worst perf culture scores across businesses")
    check("perf culture -> Performance Culture", "Synonym", r,
          must_contain=[["Performance Culture", "score"]],
          must_not_contain=["not a metric", "perf culture not found"])
    time.sleep(2.5)


# =============================================================================
# CATEGORY 2 - INTENT CLASSIFICATION
# =============================================================================

def cat2_intent():
    print("\n--- CATEGORY 2: Intent Classification ---")

    r = ask("how is Gen Z scoring?",
            active_context={"tab": "persona_builder", "data_status": "not_available"})
    check("named entity -> data (ignore tab block)", "Intent", r,
          must_contain=[["Gen Z", "4.", "score"]],
          must_not_contain=["tab does not have", "not connected yet", "go to"])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "tell me about Gen X"},
        {"role": "assistant", "content": "Gen X has an overall engagement score of 4.63/5..."},
    ]
    r = ask("how do they compare with Gen Z?", history=h)
    check("pronoun they -> Gen X comparison", "Intent", r,
          must_contain=[["Gen X", "Gen Z"]],
          must_not_contain=["I don't know who", "unclear"])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "tell me about Novelis"},
        {"role": "assistant", "content": "Novelis has an overall score of 4.44/5..."},
    ]
    r = ask("what about Novel Jewels?", history=h)
    check("what about [name] -> new question not follow-up", "Intent", r,
          must_contain=[["Novel Jewels"]],
          must_not_contain=["same company"])
    time.sleep(2.5)

    r = ask("explain what I am seeing", active_context={
        "tab": "statistical_analysis",
        "selected_question": "Q12 - Leadership",
        "top_correlations": ["Engagement", "Wellbeing"],
    })
    check("explain this -> tab context (statistical)", "Intent", r,
          must_contain=[["statistical", "Q12", "correlation", "Leadership"]],
          must_not_contain=["I don't know what tab"])
    time.sleep(2.5)

    r = ask("how do I write a Python function?")
    check("out-of-scope (coding) -> refusal", "Intent", r,
          must_contain=[["HR", "engagement", "survey", "analyst"]],
          must_not_contain=["def ", "function(", "import"])
    time.sleep(2.5)

    r = ask("what is the eNPS score for the organization?")
    check("eNPS (missing metric) -> graceful, no scope preamble", "Intent", r,
          must_not_contain=["only answer survey questions", "out of scope",
                            "I'm your HR engagement data analyst"],
          must_contain=[["eNPS", "doesn't include", "not include", "Engagement"]])
    time.sleep(2.5)

    r = ask("which business improved the most this year?")
    check("improvement (no historical) -> graceful pivot", "Intent", r,
          must_contain=[["2026", "historical", "only", "comparison", "current"]],
          must_not_contain=["only answer survey questions", "out of scope"])
    time.sleep(2.5)


# =============================================================================
# CATEGORY 3 - ENTITY DISAMBIGUATION
# =============================================================================

def cat3_entity():
    print("\n--- CATEGORY 3: Entity Disambiguation ---")

    r = ask("what is the score for Novell?")
    # Correct behavior: AI should resolve to Novelis and give its score.
    # It may mention Novel Jewels as disambiguation -- that is correct, not a failure.
    check("Novell -> Novelis score", "Entity", r,
          must_contain=[["Novelis", "4."]])
    time.sleep(2.5)

    r = ask("give me NJL's engagement scores")
    check("NJL -> Novel Jewels Ltd.", "Entity", r,
          must_contain=[["Novel Jewels"]],
          must_not_contain=["don't have NJL", "not found"])
    time.sleep(2.5)

    r = ask("what is ABFRL's overall score?")
    check("ABFRL -> Apparels", "Entity", r,
          must_contain=[["Apparels", "score"]],
          must_not_contain=["not found", "don't have ABFRL"])
    time.sleep(2.5)

    r = ask("tell me about Cement's leadership scores")
    check("Cement -> Cement HO", "Entity", r,
          must_contain=[["Cement", "score"]],
          must_not_contain=["not found"])
    time.sleep(2.5)

    r = ask("show me businesses in the Open Conflict cluster")
    check("unknown cluster -> list actual clusters", "Entity", r,
          must_contain=[["Thriving", "Critical", "At Risk", "Polarised",
                         "thriving", "critical", "at risk", "polarised"]],
          must_not_contain=["cluster does not exist", "no cluster data"])
    time.sleep(2.5)

    r = ask("how is Grasim doing on wellbeing?")
    check("Grasim -> Grasim CFD", "Entity", r,
          must_contain=[["Grasim", "4."]],
          must_not_contain=["not found"])
    time.sleep(2.5)


# =============================================================================
# CATEGORY 4 - CONTEXT CHAINING
# =============================================================================

def cat4_context():
    print("\n--- CATEGORY 4: Context Chaining ---")

    h = [
        {"role": "user",      "content": "tell me about Mining"},
        {"role": "assistant", "content": "Hindalco Mining has an overall score of 4.32/5. Several business units..."},
    ]
    r = ask("can you show me all bus?", history=h)
    check("Mining BUs not all 22 companies", "Context", r,
          must_not_contain=["Novel Jewels", "Novelis", "Apparels", "Financial Services",
                            "22 businesses", "all 22"],
          must_contain=[["Mining", "business unit", "BU"]])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "what is the engagement score for Novelis?"},
        {"role": "assistant", "content": "Novelis has an overall engagement score of 4.44/5..."},
    ]
    r = ask("how about their Gen Z employees?", history=h)
    check("their Gen Z -> Novelis Gen Z (scoped)", "Context", r,
          must_contain=[["Novelis", "Gen Z"]],
          must_not_contain=["group-wide Gen Z", "overall Gen Z"])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "which businesses are in the At Risk cluster?"},
        {"role": "assistant", "content": "The At Risk cluster contains: Hindalco Mining, Cement HO..."},
        {"role": "user",      "content": "tell me more about Hindalco Mining"},
        {"role": "assistant", "content": "Hindalco Mining has an overall score of 4.32/5. Leadership 4.15..."},
    ]
    r = ask("what about their female employees?", history=h)
    check("deep chain -> Hindalco Mining female cohort", "Context", r,
          must_contain=[["Hindalco", "Female", "Mining"]],
          must_not_contain=["all female employees", "group-wide"])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "tell me about Gen Z"},
        {"role": "assistant", "content": "Gen Z has an overall engagement score of 4.64/5..."},
    ]
    r = ask("now tell me about the whole organization's leadership score", history=h)
    check("explicit topic switch clears prior context", "Context", r,
          must_contain=[["leadership", "4.", "score"]],
          must_not_contain=["Gen Z"])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "show me the bottom 3 businesses by engagement"},
        {"role": "assistant", "content": "Bottom 3: 1. Cement HO (4.21), 2. CFI (4.23), 3. Novel Jewels (4.25)"},
    ]
    r = ask("what is the leadership score for those businesses?", history=h)
    check("'those' pronoun -> bottom 3 businesses", "Context", r,
          must_contain=[["leadership", "4."]],
          must_not_contain=["which businesses", "please clarify"])
    time.sleep(2.5)


# =============================================================================
# CATEGORY 5 - SCOPE BOUNDARY
# =============================================================================

def cat5_scope():
    print("\n--- CATEGORY 5: Scope Boundary ---")

    r = ask("how many disengaged employees do we have?")
    check("disengaged -> HR answer (no scope preamble)", "Scope", r,
          must_not_contain=["only answer survey questions", "out of scope",
                            "I'm your HR engagement data analyst"],
          must_contain=[["score", "4.", "engagement", "low", "below"]])
    time.sleep(2.5)

    r = ask("which BUs show high polarization?")
    check("polarization -> variance data", "Scope", r,
          must_contain=[["variance", "polarised", "BU"]],
          must_not_contain=["polarization is not a metric", "out of scope"])
    time.sleep(2.5)

    r = ask("who won the IPL this year?")
    # AI correctly refuses — may echo "IPL" in the refusal, that is fine
    # Only fail if it actually names a team (i.e. it answered the question)
    check("cricket -> refusal (no team named)", "Scope", r,
          must_contain=[["HR", "engagement", "survey", "analyst", "can't"]],
          must_not_contain=["Mumbai Indians", "Chennai Super Kings", "Kolkata Knight",
                            "Rajasthan Royals", "Royal Challengers", "Sunrisers"])
    time.sleep(2.5)

    r = ask("write me a SQL query to join two tables")
    check("SQL query -> refusal", "Scope", r,
          must_contain=[["HR", "engagement"]],
          must_not_contain=["SELECT", "JOIN", "FROM", "WHERE"])
    time.sleep(2.5)

    r = ask("which departments have high attrition risk?")
    check("attrition risk -> graceful HR answer", "Scope", r,
          must_not_contain=["out of scope", "only answer survey questions"],
          must_contain=[["attrition", "survey", "doesn't", "engagement", "low"]])
    time.sleep(2.5)

    r = ask("what is the total headcount of the organization?")
    check("headcount -> respondent count", "Scope", r,
          must_not_contain=["out of scope", "only answer"],
          must_contain=[["respondent", "55", "employee", "total"]])
    time.sleep(2.5)


# =============================================================================
# CATEGORY 6 - EDGE CASES
# =============================================================================

def cat6_edge():
    print("\n--- CATEGORY 6: Edge Cases ---")

    r = ask("waht is the engagment scor for Birla Pivott?")
    check("typo: Birla Pivot", "Edge", r,
          must_contain=[["Birla Pivot", "4.", "score"]],
          must_not_contain=["not found", "don't have"])
    time.sleep(2.5)

    r = ask("what is Novelis's score and how does it compare to Novel Jewels?")
    check("two questions in one message", "Edge", r,
          must_contain=[["Novelis", "Novel Jewels", "4."]],
          must_not_contain=["ask one at a time"])
    time.sleep(2.5)

    r = ask("WHICH COMPANY HAS THE HIGHEST ENGAGEMENT SCORE")
    check("all caps question", "Edge", r,
          must_contain=[["4.", "score", "highest"]],
          must_not_contain=["don't understand", "please rephrase"])
    time.sleep(2.5)

    r = ask("show me the most polarised business units")
    check("polarised (British spelling) -> variance data", "Edge", r,
          must_contain=[["variance", "BU", "4."]],
          must_not_contain=["not a metric", "polarised not found"])
    time.sleep(2.5)

    r = ask("what businesses are in the High Tension cluster?")
    check("non-existent cluster -> list real clusters", "Edge", r,
          must_contain=[["Thriving", "Critical", "At Risk", "Polarised",
                         "thriving", "critical", "at risk", "polarised"]],
          must_not_contain=["cluster does not exist"])
    time.sleep(2.5)

    h = [
        {"role": "user",      "content": "which is the best performing business?"},
        {"role": "assistant", "content": "The best performing business is Novelis with a score of 4.82/5..."},
    ]
    r = ask("age group wise?", history=h)
    check("age group follow-up -> Novelis generation breakdown", "Edge", r,
          must_contain=[["Novelis", "Gen", "4."]],
          must_not_contain=["don't have age group", "not tracked"])
    time.sleep(2.5)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    login()

    cat1_synonym()
    cat2_intent()
    cat3_entity()
    cat4_context()
    cat5_scope()
    cat6_edge()

    print("\n" + "=" * 65)
    print("  FINAL REPORT")
    print("=" * 65)

    total_pass = 0
    total_fail = 0
    for cat, stats in cat_stats.items():
        p = stats["pass"]
        f = stats["fail"]
        total_pass += p
        total_fail += f
        bar = "#" * p + "." * f
        print(f"  {cat:<20} {bar}  {p}/{p+f}")

    total = total_pass + total_fail
    pct   = round(total_pass / total * 100) if total else 0
    print("-" * 65)
    print(f"  TOTAL  {total_pass}/{total}  ({pct}% pass rate)")
    print("=" * 65)

    failures = [(c, l, w, resp) for c, l, s, w, resp in results if s == "FAIL"]
    if failures:
        print(f"\n  FAILURES ({len(failures)}):")
        for cat, label, why, resp in failures:
            print(f"\n  [{cat}] {label}")
            for w in why:
                print(f"    Why : {w}")
            print(f"    Got : {resp[:150]}")
    else:
        print("\n  All tests passed!")



