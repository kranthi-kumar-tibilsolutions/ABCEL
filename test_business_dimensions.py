"""
Business + BU Dimension Follow-Up Test
========================================
For EACH of the 22 businesses:
  1. Establish context: "tell me about [Business]"
  2. Gender follow-up:     "how do male vs female employees compare?"
  3. Age group follow-up:  "what is the age group breakdown?"  (synonym -> generation)
  4. Drill to top BU:      "tell me about [top BU] in [Business]"
  5. BU generation follow: "how do the different generations score in this BU?"
  6. BU tenure follow:     "what about by years of service in this BU?"

Total: 22 businesses x 5 calls = 110 API calls
"""

import urllib.request
import json
import time
import sys

BASE     = "http://localhost:8000"
ENDPOINT = f"{BASE}/api/chat"
TOKEN    = None

DATA_PATH = "d:/ABCEL/backend/data"


def load_data():
    businesses = json.load(open(f"{DATA_PATH}/businesses.json", encoding="utf-8"))
    try:
        units = json.load(open(f"{DATA_PATH}/units.json", encoding="utf-8"))
    except Exception:
        units = []

    # Map: business name -> list of BUs sorted by score desc
    from collections import defaultdict
    biz_units = defaultdict(list)
    for u in units:
        bname = u.get("business") or u.get("name", "")
        if bname:
            biz_units[bname].append(u)
    for bname in biz_units:
        biz_units[bname].sort(key=lambda u: u.get("overall") or u.get("score") or 0, reverse=True)

    return sorted(businesses, key=lambda b: b["name"]), dict(biz_units)


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
    print("[AUTH] OK\n")


def ask(message, history=None):
    payload = json.dumps({
        "message":   message,
        "history":   history or [],
        "dimension": "Business Unit",
    }).encode()
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"}
    req = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")
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


def normalize(text):
    return (text
        .replace(" ", " ")
        .replace("‑", "-")
        .replace("–", "-")
        .replace("—", "-")
        .replace("‘", "'")
        .replace("’", "'")
    )


pass_count = 0
fail_count = 0
results    = []


def check(label, response, must_contain=None, must_not_contain=None, scope_words=None):
    global pass_count, fail_count
    resp = normalize(response)
    passed   = True
    fail_why = []

    if "ai unavailable" in resp.lower() or resp.startswith("[ERROR"):
        passed = False
        fail_why.append("AI unavailable / error")
    else:
        if scope_words:
            if not any(w.lower() in resp.lower() for w in scope_words):
                passed = False
                fail_why.append(f"not scoped — none of {scope_words[:3]} in response")

        if must_contain:
            for tg in must_contain:
                terms = tg if isinstance(tg, list) else [tg]
                if not any(t.lower() in resp.lower() for t in terms):
                    passed = False
                    fail_why.append(f"missing any of {terms}")

        if must_not_contain:
            for bad in must_not_contain:
                if bad.lower() in resp.lower():
                    passed = False
                    fail_why.append(f"contains banned '{bad}'")

    if passed:
        pass_count += 1
    else:
        fail_count += 1
    results.append(("PASS" if passed else "FAIL", label, "; ".join(fail_why), resp[:100]))

    icon = "OK" if passed else "XX"
    print(f"    {icon} [{passed and 'PASS' or 'FAIL'}] {label}")
    if not passed:
        for w in fail_why:
            print(f"         Why: {w}")
        print(f"         Got: {resp[:110]}")
    return passed, resp


def run_business(biz, top_bu):
    biz_name = biz["name"]
    short_biz = biz_name[:30]
    scope_biz = [w for w in biz_name.replace(".", "").split() if len(w) > 4][:3]

    print(f"\n  [BUSINESS] {biz_name}")

    # --- Step 1: Establish business context ---
    q1 = f"tell me about {biz_name}"
    r1 = ask(q1)
    time.sleep(3)

    if "ai unavailable" in r1.lower() or r1.startswith("[ERROR"):
        print(f"    XX context call failed — skipping {biz_name}")
        n = 4 if top_bu else 2
        for _ in range(n):
            results.append(("SKIP", biz_name, "AI unavailable for context", ""))
        return

    h1 = [{"role": "user", "content": q1}, {"role": "assistant", "content": r1[:600]}]

    # --- Step 2: Gender follow-up ---
    q2 = "how do male vs female employees compare in engagement scores here?"
    r2 = ask(q2, history=h1)
    check(f"{short_biz} | gender follow-up",   r2,
          must_contain=[[" Male", "Female", "male", "female"]],
          scope_words=scope_biz)
    time.sleep(3)

    # --- Step 3: Age group follow-up (synonym -> generation) ---
    h2 = h1 + [{"role": "user", "content": q2}, {"role": "assistant", "content": r2[:400]}]
    q3 = "what is the age group breakdown of engagement scores here?"
    r3 = ask(q3, history=h2)
    check(f"{short_biz} | age group (->generation)",   r3,
          must_contain=[["Gen Y", "Gen Z", "Gen X", "Baby Boomer"]],
          scope_words=scope_biz)
    time.sleep(3)

    # --- BU drill-down (if BUs available) ---
    if not top_bu:
        print(f"    -- No BU data for {biz_name}, skipping BU drill-down")
        return

    bu_name  = top_bu.get("name", "")
    short_bu = bu_name[:25]
    scope_bu = [w for w in bu_name.replace(".", "").split() if len(w) > 3][:3]

    print(f"\n    [BU DRILL-DOWN] {bu_name}")

    # --- Step 4: Ask about specific BU ---
    q4 = f"tell me about {bu_name}"
    # Fresh history just mentioning the business first so context is clear
    h4 = [{"role": "user", "content": f"I'm looking at {biz_name}"},
          {"role": "assistant", "content": r1[:300]}]
    r4 = ask(q4, history=h4)
    time.sleep(3)

    if "ai unavailable" in r4.lower() or r4.startswith("[ERROR"):
        print(f"    XX BU context call failed — skipping BU follow-ups")
        results.append(("SKIP", f"{biz_name} / {bu_name}", "AI unavailable for BU context", ""))
        results.append(("SKIP", f"{biz_name} / {bu_name}", "skipped", ""))
        return

    h5 = [{"role": "user", "content": q4}, {"role": "assistant", "content": r4[:600]}]

    # --- Step 5: BU generation follow-up ---
    q5 = "how do the different generations score in this business unit?"
    r5 = ask(q5, history=h5)
    check(f"{short_biz}/{short_bu} | generation follow-up",   r5,
          must_contain=[["Gen Y", "Gen Z", "Gen X", "Baby Boomer"]],
          scope_words=scope_bu)
    time.sleep(3)

    # --- Step 6: BU tenure follow-up ---
    h6 = h5 + [{"role": "user", "content": q5}, {"role": "assistant", "content": r5[:400]}]
    q6 = "what about engagement by years of service in this unit?"
    r6 = ask(q6, history=h6)
    check(f"{short_biz}/{short_bu} | tenure follow-up",   r6,
          must_contain=[["0-2", "2-5", "5-10", "10-15", "15-20", "25"]],
          scope_words=scope_bu)
    time.sleep(3)


if __name__ == "__main__":
    login()

    businesses, biz_units = load_data()
    print(f"Loaded {len(businesses)} businesses")

    total_checks = len(businesses) * 4  # 2 biz + 2 BU per business
    print(f"Running: {len(businesses)} businesses x 4 dimension checks = ~{total_checks} checks")
    print(f"Estimated time: ~{total_checks * 6 // 60} minutes\n")
    print("=" * 65)

    for biz in businesses:
        bname = biz["name"]
        bus   = biz_units.get(bname, [])
        top_bu = bus[0] if bus else None
        run_business(biz, top_bu)

    total = pass_count + fail_count
    pct   = round(pass_count / total * 100) if total else 0

    print("\n" + "=" * 65)
    print("  FINAL REPORT — Business + BU Dimension Follow-Up")
    print("=" * 65)
    print(f"  PASS : {pass_count}/{total}  ({pct}%)")
    print(f"  FAIL : {fail_count}/{total}")

    failures = [(label, why, got) for st, label, why, got in results if st in ("FAIL", "SKIP")]
    if failures:
        print(f"\n  FAILURES ({len(failures)}):")
        for label, why, got in failures:
            print(f"\n  {label}")
            print(f"    Why: {why}")
            if got:
                print(f"    Got: {got[:120]}")
    else:
        print("\n  All tests passed!")
    print("=" * 65)
