# LLM Reasoning — Where It's Used Today

All LLM calls in the existing system. Source of truth: `backend/server/routes/`.

---

## 1. ARIA Chat — `/api/chat` (ai.py)

**Type:** Freeform conversational Q&A, streaming SSE  
**Handles "why" questions:** Yes — directly. User can ask anything including causal questions.  
**Data fed to LLM:** All 22 businesses with scores, all 415 BUs, generation/gender/tenure/job-level breakdowns, per-business cohort data, active screen context (what tab the user is on).  
**Output:** Streamed plain-English answer, token by token.

---

## 2. Executive Summary — `/api/summary` (ai.py)

**Type:** Structured JSON, non-streaming  
**Trigger:** Overview page on load  
**Data fed to LLM:** `_build_context()` — all businesses, clusters, cohorts, group averages  
**Output:**
```json
{
  "bullets":    ["finding 1 with numbers", "..."],
  "takeaway":   "one actionable sentence for HR leadership",
  "whyMatters": "one sentence on business impact"
}
```

---

## 3. Right Panel AI Insights — `/api/insights` (ai.py)

**Type:** Structured JSON, non-streaming  
**Trigger:** Loaded silently after login, shown in the right panel  
**Data fed to LLM:** Same `_build_context()` as summary  
**Output:**
```json
{
  "topTrends": [{ "direction": "up|down", "text": "..." }],
  "outliers":  [{ "direction": "up|down", "text": "..." }],
  "summary":   "2-sentence overall summary"
}
```

---

## 4. Business Drill-Down — `/api/business-insight` (ai.py)

**Type:** Structured JSON, non-streaming  
**Trigger:** Business Detail page  
**Data fed to LLM:** Single business — overall score, all category scores, band, rank vs group average  
**Output:**
```json
{
  "strength":       "what this business does best (with score)",
  "risk":           "biggest risk area (with score)",
  "cohortToWatch":  "which cohort needs attention",
  "recommendation": "top HR action"
}
```

---

## 5. Statistical Correlation Insight — `/api/statistical/insights/{qId}` (statistical.py)

**Type:** Structured JSON, non-streaming  
**Trigger:** Statistical Analysis page — after correlations load, non-blocking  
**Data fed to LLM:** Selected question text, strongest positive correlation (r value + question text), strongest negative correlation (r value + question text)  
**Prompt ask:** "Write a 2-sentence insight about these Pearson correlation findings."  
**Output:**
```json
{ "insight": "2-sentence plain English explanation of the correlation pattern" }
```

---

## 6. Hypothesis Test Interpretation — `/api/hypothesis/test` (hypothesis.py)

**Type:** Structured JSON, non-streaming (part of the test result)  
**Trigger:** After hypothesis test runs (one-sample Z, two-sample Z, or Pearson)  
**Data fed to LLM:** Hypothesis text + test stats (Z score, p-value, means, n, effect size, verdict)  
**Prompt ask:** "Write a 1–2 sentence plain English interpretation for an HR director."  
**Output** (embedded in test result):
```json
{ "interpretation": "1-2 sentences saying what the result means for HR decision-making" }
```

---

## 7. Hypothesis Parse — `/api/hypothesis/parse` (hypothesis.py)

**Type:** Structured JSON, non-streaming  
**Trigger:** User types a natural-language hypothesis and clicks Analyze  
**Data fed to LLM:** The hypothesis text + list of available survey fields and known dimension values  
**Prompt ask:** Classify the hypothesis type (group_comparison / relationship / one_sample) and map variables to real data fields  
**Output:**
```json
{
  "hypothesis_type": "one_sample",
  "group":   { "field": "generation", "value": "Gen Y" },
  "outcome": { "field": "engagement" },
  "h0": "...", "h1": "...",
  "baseline_value": 4.44
}
```
*Note: This is the only LLM call used for reasoning about structure, not explanation.*

---

## 8. Persona Takeaways — `/api/persona/takeaways` (persona.py)

**Type:** Structured JSON, non-streaming  
**Trigger:** Dynamic Persona Builder — after query runs, user clicks "Get Takeaways"  
**Data fed to LLM:** Persona name, n, and a theme comparison table (persona score vs overall score + delta + significance per theme)  
**Prompt ask:** "Generate 3 concise key takeaways for this persona comparison report."  
**Output:**
```json
{ "takeaways": ["takeaway 1 with numbers", "takeaway 2", "takeaway 3"] }
```

---

## 9. Focus Spotlight Insight — `/api/focus-spotlight/insight` (focus_spotlight.py)

**Type:** Plain text, streaming SSE  
**Trigger:** Focus Spotlight page — "Generate Insight" button  
**Data fed to LLM:** Top 8 outlier segments — label, score, deviation from mean, SD band, n, p-value  
**Prompt ask:** "Write 3–5 sentences summarising the key patterns. Identify which groups need attention and which are thriving."  
**Output:** Streamed prose narrative, no JSON structure.

---

## Summary Table

| # | Endpoint | Route file | Output type | Streaming | "Why" capable |
|---|---|---|---|---|---|
| 1 | `/api/chat` | ai.py | Freeform prose | Yes (SSE) | Yes — directly |
| 2 | `/api/summary` | ai.py | Structured JSON | No | Partial (`whyMatters` field) |
| 3 | `/api/insights` | ai.py | Structured JSON | No | No |
| 4 | `/api/business-insight` | ai.py | Structured JSON | No | Partial (`risk`, `recommendation`) |
| 5 | `/api/statistical/insights/{qId}` | statistical.py | Structured JSON | No | Partial (explains correlation) |
| 6 | `/api/hypothesis/test` | hypothesis.py | Structured JSON | No | Yes (interprets the result) |
| 7 | `/api/hypothesis/parse` | hypothesis.py | Structured JSON | No | No (structural mapping only) |
| 8 | `/api/persona/takeaways` | persona.py | Structured JSON | No | Partial (explains score gap) |
| 9 | `/api/focus-spotlight/insight` | focus_spotlight.py | Prose | Yes (SSE) | Partial (summarises outliers) |
