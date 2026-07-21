# ABCEL — ABG Vibes Analytics Platform
## Complete Project Overview

---

## 1. Business Context & Use Case

### Who is the client?
**Aditya Birla Group (ABG)** — one of India's largest conglomerates with 22 subsidiary businesses operating across metals, cement, textiles, chemicals, financial services, and more. The group employs tens of thousands of people across India and internationally.

### What is ABG Vibes?
ABG Vibes is the group's annual employee engagement survey. In 2026, **55,457 employees** across all 22 businesses participated. The survey measures how employees feel about their work, leadership, growth, and the organisation across 47–50 Likert-scale questions (scored 1–5).

The raw output from the survey vendor (Willis Towers Watson / WTW) is a large Excel file with:
- Per-employee responses to every question
- Demographics (age, gender, generation, tenure, job level, country, business unit)
- Pre-aggregated category scores per respondent (Engagement, Leadership, Performance Culture, Development & Career, Manager Effectiveness)

### The Problem
After every survey cycle, the Group HR team receives this Excel file and has to:
- Manually build PowerPoint decks for each of the 22 businesses
- Run pivot tables to compare business units, demographics, cohorts
- Interpret patterns and flag at-risk areas manually
- Spend weeks preparing insights before they can act

There was no single platform where HR leaders could explore the data interactively, drill down into any business or demographic segment, and get AI-generated insights in plain English — without being a data analyst.

### What ABCEL Solves
ABCEL is a **web-based analytics platform** built specifically around the ABG Vibes survey data. It transforms the raw Excel into an interactive dashboard with:

1. **Instant visibility** — Group HR sees every business ranked, clustered, and scored the moment data is uploaded
2. **Drill-down** — Click any company → see its business units → see which cohorts (Gen Z, Female, Senior Mgmt etc.) are driving scores up or down
3. **AI Chat** — Ask questions in plain English: *"Show me the bottom 5 Gen Y responses in Birla Carbon"* → get real individual employee records with every OP score
4. **Statistical rigor** — Hypothesis testing, correlation analysis, significance badges — so HR leaders can make evidence-based decisions, not gut-feel ones
5. **Persona Builder** — Dynamically define any employee segment (e.g. Female + Gen Z + India + Junior Management) and compare their scores against the group average and other cohorts
6. **Focus Spotlight** — Surface which demographic segments are most at-risk on any given theme
7. **Reports & Benchmarks** — Exportable insights and cross-survey trend tracking

### Who Uses It
| Role | Access | Use Case |
|------|--------|----------|
| **Group HR** (e.g. Niranjan) | All 22 businesses | Group-wide comparisons, cluster analysis, cross-company patterns |
| **Company HR** (e.g. UltraTech, Novelis) | Own company only | Deep-dive into their business units and demographics |
| **Admin** | All 22 businesses | Platform management and demo access |

---

## 2. Technical Architecture

### Overview
```
Browser (React SPA)
       │
       ▼
FastAPI Server (Python, port 3001)
       │
       ├── Serves frontend/dist/ as static files
       ├── REST API endpoints (/api/*)
       ├── Streams AI responses (SSE)
       │
       ├── LLM Providers
       │     ├── Mistral (mistral-small-latest) — primary
       │     └── Cerebras (gpt-oss-120b) — fallback
       │
       └── Data Layer
             └── backend/server/data/*.json (pre-processed, loaded at startup)
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast SPA, component-based UI |
| Charts | Chart.js + react-chartjs-2 | Heatmaps, bar/line charts, scatter |
| Backend | Python FastAPI | Async, fast, easy LLM streaming via SSE |
| Server | Uvicorn on port 3001 | ASGI server for FastAPI |
| AI — Primary | Mistral (`mistral-small-latest`) | 32K context, good at structured JSON, fast |
| AI — Fallback | Cerebras (`gpt-oss-120b`) | Used when Mistral is rate-limited (429) |
| Data Pipeline | Python + Pandas + OpenPyXL | Parses WTW Excel format into JSON |
| Auth | Bearer token (Base64 encoded) | Lightweight, stateless, demo-appropriate |
| Hosting | Local / Azure VM | Served on port 3001 |

---

## 3. Data Pipeline — How Excel Becomes the Platform

### Step 1: Upload
An HR admin uploads the WTW Vibes Excel file via the Upload page (`/upload`). The backend receives it at `POST /api/upload`.

### Step 2: Extract & Parse (`backend/preprocess/extract.py`)
This is the core data processing script. It:

1. **Classifies sheets** — Identifies which sheets are raw data, lookup tables, summary tabs, or metadata
2. **Parses WTW format** — WTW uses a proprietary structure with:
   - `CQ` codes for questions (e.g. CQ2, CQ5–CQ10 meaning a range of questions)
   - Hierarchical business/unit structure
   - Favorability scoring (raw scores converted: `score = 6 - raw_likert`)
3. **Builds per-employee records** — Each of 55,457 records gets:
   - Demographics: business, age_group, generation, gender, job_level, tenure, country, is_manager, abglp
   - Category scores: engagement, leadership, performance_culture, development_and_career, manager_effectiveness, overall
   - Per-question scores: OP1 through OP48 (the actual Likert responses 1–5)
4. **Computes aggregates** — Builds businesses.json, units.json, cohorts.json from the individual records
5. **Clusters** — Assigns each unit/business to a quadrant based on engagement score × variance:
   - **Thriving** — High engagement, low variance (consistently happy)
   - **Polarised** — High engagement, high variance (split opinions)
   - **At Risk** — Low engagement, low variance (consistently unhappy — needs action)
   - **Critical** — Low engagement, high variance (severe and divided)

### Output Files (in `backend/server/data/`)

| File | Size | Contents |
|------|------|----------|
| `responses.json` | ~79 MB | 55,457 individual employee records with all demographics + OP1–OP48 scores |
| `questions.json` | 11 KB | 47 question definitions: ID (OP1–OP48), full text, category |
| `businesses.json` | 8 KB | 22 companies: name, overall score, 5 category scores, variance, respondent count, rank |
| `units.json` | 175 KB | All 415 business units under the 22 companies |
| `clusters.json` | 189 KB | 4 clusters with all units pre-assigned |
| `cohorts.json` | 27 KB | Demographic cohorts (Gen Z, Female, India, etc.) with scores |
| `users.json` | 1 KB | Login credentials and role assignments |
| `spotlight_segments.json` | 114 KB | Pre-computed focus spotlight analysis per segment |
| `question_bu_scores.json` | 33 KB | Per-question scores broken down by business unit |

---

## 4. Backend — API Reference

All endpoints live under `/api/`. The server is at `http://localhost:3001`.

### Authentication (`/api/auth/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Email + password → Bearer token |
| `/auth/me` | GET | Validate token, return user info |

**How it works:** Login reads `backend/server/data/users.json`. On success returns a Base64-encoded Bearer token containing `{email, role, company}`. All subsequent requests send this token in the `Authorization` header. The server decodes it on each request — no session state, no database.

**Roles:**
- `group_hr` — sees all 22 companies' data
- `company` — server scopes all queries to their company only

### Core Data (`/api/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Is data loaded and ready? |
| `/meta` | GET | Group-level summary (total respondents, overall score, top/lowest performers) |
| `/businesses` | GET | All 22 companies with scores |
| `/units` | GET | All 415 business units |
| `/clusters` | GET | 4 clusters with their members |
| `/cohorts` | GET | All demographic cohorts |
| `/upload` | POST | Upload Excel, trigger full pipeline |
| `/load-sample` | POST | Load demo/sample data |
| `/reset` | POST | Clear all data |

### AI & Chat (`/api/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Main AI chat — streams SSE response |
| `/summary` | POST | AI-generated group summary (right panel) |
| `/insights` | POST | AI insights for the right panel |
| `/business-insight` | POST | Single business AI narrative |
| `/focus-areas` | POST | Top focus areas AI analysis |
| `/skill-analysis` | POST | Skill gap analysis |

### Statistical Analysis (`/api/statistical/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/questions` | GET | All questions with scores |
| `/correlations/{id}` | GET | Correlation matrix for a dimension |
| `/correlogram/{id}` | GET | Visual correlogram data |
| `/network/{id}` | GET | Network graph of question relationships |
| `/insights/{id}` | GET | AI-generated statistical insights |

### Persona Builder (`/api/persona/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Run a persona query with filters, get theme scores + significance |
| `/dimensions` | GET | All filterable dimensions and their values |
| `/top5` | GET | Auto-suggested top 5 interesting personas |
| `/cohorts` | GET | Built-in + saved cohorts for comparison |
| `/takeaways` | POST | AI-generated takeaways for a persona comparison |
| `/save` | POST | Save a custom persona |

### Hypothesis Testing (`/api/hypothesis/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/parse` | POST | Parse a plain-English hypothesis into a structured test |
| `/test` | POST | Run the statistical test (Z-test / t-test) |
| `/templates` | GET | Pre-built hypothesis templates |
| `/history` | GET / DELETE | Saved hypothesis test history |

### Focus Spotlight (`/api/focus-spotlight/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/filters` | GET | Available filter dimensions |
| `/results` | POST | Run focus spotlight for a segment |
| `/precompute` | POST | Pre-compute all segments |
| `/insight` | POST | AI insight for a focus spotlight result |

### Sentiment Analysis (`/api/sentiment/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/overview` | GET | Sentiment distribution overview |
| `/over-time` | GET | Sentiment trend over time |
| `/samples` | GET | Sample responses by sentiment |
| `/classify` | POST | Classify a text segment |

---

## 5. Frontend — Pages & Features

The frontend is a **React 18 SPA** built with Vite, served from `frontend/dist/` by the FastAPI server. Navigation is handled entirely in React (no page reloads).

### Page Map

| Page | Route Key | What It Shows |
|------|-----------|---------------|
| **Upload** | `upload` | File upload, data status, continue to dashboard |
| **Overview** | `overview` | Group-wide KPIs, engagement heatmap, cluster cards, decomposition tree, top/bottom performers, AI summary |
| **Business Overview** | `business-overview` | All 22 companies ranked, filterable, with score bands |
| **Business Detail** | `business-detail` | Single company deep-dive: BU breakdown, cohort analysis, AI narrative |
| **BU Detail** | `bu-detail` | Single business unit: question-level scores, demographic breakdowns |
| **BU Explorer** | `bu-explorer` | Cross-company BU comparison with filters |
| **Cluster Detail** | `cluster-detail` | One of the 4 clusters: all members, what they have in common |
| **AI Insights** | `ai-insights` | AI-generated group-level insights and recommendations |
| **Outliers & Alerts** | `outliers` | BUs and questions with extreme scores or high variance |
| **Insights Studio** | `insights-studio` | Free-form AI analysis workspace |
| **Trends** | `trends` | Score trends over survey cycles |
| **Employee Voice** | `employee-voice` | Cohort-level voice analysis |
| **Reports** | `reports` | Downloadable reports |
| **Benchmarks** | `benchmarks` | External benchmark comparisons |
| **Hypothesis Testing** | `hypothesis-testing` | Plain-English hypothesis → statistical test → result |
| **Statistical Analysis** | `statistical-analysis` | Correlation matrix, network graph, correlogram |
| **Sentiment Analysis** | `sentiment-analysis` | Sentiment distribution and sample analysis |
| **Dynamic Persona Builder** | `dynamic-persona-builder` | Build any employee segment, compare against cohorts, statistical significance |
| **Focus Spotlight** | `focus-spotlight` | Surface at-risk demographic segments by theme |
| **Settings** | `settings` | User preferences, theme, account |

### Key UI Components
- **AppHeader** — Logo, user info, logout
- **Sidebar** — Navigation between all pages
- **TopBar** — Dimension switcher (Overall / Engagement / Leadership etc.), filter trigger
- **RightPanel** — Collapsible AI insights panel
- **FilterDrawer** — Slide-out global filters (cluster, min score)
- **ChatWithData** — Floating AI chat panel (see Section 6)

---

## 6. AI Chat — How It Works

The chat is the most complex part of the system. Here's the full flow:

### Frontend (`ChatWithData.jsx`)
- User types a message → POST to `/api/chat` with:
  - `message` — the user's question
  - `history` — last 10 messages for context
  - `dimension` — active dimension (overall, engagement, etc.)
  - `focusArea` — optional focus filter
  - `companyFilter` — optional company filter
  - `active_context` — current tab + any selected business/BU/cluster info
- Response streams as **Server-Sent Events (SSE)** — text appears token by token
- Tab context: the currently active page is always sent so the AI knows what the user is looking at

### Backend (`backend/server/routes/ai.py`)

#### 1. Context Building
The system assembles a rich system prompt including:
- All 22 businesses with scores
- All business units
- Cluster assignments
- Cohort scores
- Current screen context (which tab, which business, etc.)
- Question text map (OP1 → full question)

#### 2. Entity & Demographic Detection
Before calling the LLM, the backend detects:
- **Company/BU mentions** — word-based fuzzy matching with substring tolerance ("birla estate" → "Birla Estates", "novel jewel" → "Novel Jewels Ltd.")
- **Demographic mentions** — keyword detection: "gen z", "gen y", "female", "baby boomer", "millennial" etc.
- **Combined** — "top 5 Birla Carbon Gen Y responses" → company AND demographic both detected
- **Overall** — "top 5 overall responses" → full 55,457 dataset

#### 3. Individual Response Records (Direct Python Streaming)
When a user asks for top/bottom N responses, the backend:
1. Filters `responses.json` to matching records (company + demographic if both specified)
2. Sorts by overall score (ascending for bottom, descending for top)
3. Builds a compact formatted response **in Python** — bypassing the LLM entirely for this section
4. Streams directly as SSE

**Format shown to user:**
```
[Scope: Birla Carbon — Gen Y] — Top 3 responses (241 total)

#1 · overall 4.80
  Gen Y · Female · Junior Management · 2-5yr · India
  Gaps:
  OP19 [Promotion and growth processes in..]: 3.0 | OP43 [My manager actively..]: 3.0

#2 · overall 4.79
  ...

Follow-up options:
1. "bottom 3 Birla Carbon Gen Y responses"
2. "show all scores for respondent 1"
3. "top 3 [company] Gen Y responses"
```

Why direct Python streaming? The LLM was summarising, abbreviating question text, and collapsing 47 OP scores into 5 category averages despite instructions. Python guarantees exact output.

#### 4. LLM Calls (for non-record queries)
For everything else (analysis questions, comparisons, tab explanations):
- **Primary**: Mistral (`mistral-small-latest`) — streaming, temperature 0.3, max 6000 tokens
- **Fallback**: Cerebras (`gpt-oss-120b`) — used when Mistral returns 429 (rate limit)
- **Retry**: Mistral again if Cerebras also fails

#### 5. Context & Follow-up Handling
- **Tab context**: AI always knows which page is open ("you're on Persona Builder")
- **Follow-up detection**: Last AI response is injected as a context reminder before the next user message
- **Screen-reference detection**: "what is this tab?", "explain this page" → strips history, answers about current tab only
- **Typo tolerance**: "bottome 5 gen y" → still correctly detected as "bottom 5 Gen Y"
- **"yes" handling**: If user says "yes" after numbered options → asks "Which option? 1, 2, or 3?"

---

## 7. Authentication & Users

### How Login Works
1. User POSTs `{email, password}` to `/api/auth/login`
2. Server reads `backend/server/data/users.json`
3. If match found: returns a Base64-encoded Bearer token containing user object
4. All subsequent API calls send: `Authorization: Bearer <token>`
5. Server decodes the token on each request (no database lookup, fully stateless)
6. Token contains: `{email, name, role, company, theme}`

### Current Users

| Name | Email | Role | Access |
|------|-------|------|--------|
| Niranjan | niranjan@adityabirla.com | group_hr | All 22 companies |
| Admin | admin@login.com | group_hr | All 22 companies |
| Kranthi | hr@ultratechcement.com | company | UltraTech Cement only |
| Shashank | hr@novelis.com | company | Novelis only |

### Role Scoping
- `group_hr`: No filter applied — sees full dataset across all businesses
- `company`: All data queries automatically filtered to `WHERE business = <their company>`

### Theme
Each user has a `theme` field (`abg`, `ultratech`, `novelis`) that controls the UI colour scheme.

---

## 8. Statistical Features

### Hypothesis Testing
Users write a plain-English hypothesis: *"Gen Z employees score lower on leadership than Gen X"*

The backend:
1. Parses the hypothesis using the LLM to extract groups, metric, and direction
2. Runs a **two-sample Z-test** on the actual data
3. Returns: test statistic, p-value, significance badge (p < 0.05 / p < 0.01 / n.s.)
4. Shows confidence intervals and effect size

### Persona Builder
Dynamic segment comparison tool:
- Define a persona with any combination of filters (generation + gender + country + job level)
- Compare their 5 theme scores against: overall average, any built-in cohort (Gen Z, Female, Managers, etc.), any saved persona
- Every comparison shows Z-test significance with badges
- Segments with fewer than 10 respondents are excluded from statistical comparisons

### Statistical Analysis Page
- **Correlation matrix** — which OP questions move together
- **Correlogram** — visual heatmap of pairwise correlations
- **Network graph** — questions as nodes, strong correlations as edges; reveals which questions are "hubs"

---

## 9. Survey Data Details

### The 5 Engagement Themes

| Theme | What It Measures | Key Questions |
|-------|-----------------|---------------|
| **Engagement** | Pride, commitment, willingness to recommend | OP1 (Pride), OP2 (2-year intent), OP48 (Recommend) |
| **Leadership** | Senior leader effectiveness, communication, values | OP5–OP13 |
| **Performance Culture** | Empowerment, idea adoption, pay fairness, recognition | OP14–OP23 |
| **Development & Career** | Learning, career clarity, growth opportunities | OP29–OP35 |
| **Manager Effectiveness** | Direct manager support, feedback, development help | OP36–OP47 |

### Scoring
- Raw scores: 1 (Strongly Disagree) → 5 (Strongly Agree)
- Favorability: Score of 4 or 5 = Favorable
- Category scores = mean of all questions in that category for a respondent
- Overall = mean of all category scores

### Cluster Classification
Units are placed into clusters based on two dimensions:
- **Engagement score** (above/below group median)
- **Variance** (spread of scores — high variance = polarised opinions)

```
              Low Variance    High Variance
High Score  │  Thriving      │  Polarised   │
Low Score   │  At Risk       │  Critical    │
```

---

## 10. Running the Platform

### Prerequisites
- Python 3.10+
- Node.js 18+
- Mistral API key
- Cerebras API key

### Environment Variables (`.env` in project root)
```
MISTRAL_API_KEY=<your key>
MISTRAL_MODEL=mistral-small-latest
CEREBRAS_API_KEY=<your key>
CEREBRAS_MODEL=gpt-oss-120b
PORT=3001
```

### Start the Server
```bash
cd backend/server
uvicorn main:app --reload --port 3001
```

The server serves both the API and the frontend (from `frontend/dist/`).

### Build the Frontend (after any frontend changes)
```bash
cd frontend
npm install
npm run build
```

### Upload Data
1. Open browser → `http://localhost:3001`
2. Log in with any valid user
3. Upload page → upload the WTW Vibes Excel file
4. Wait for processing (~30–60 seconds for 55K records)
5. Platform loads automatically

### Using Sample Data (without Excel)
```
POST /api/load-sample
```
Loads pre-processed sample data from `backend/data/sample/`.

---

## 11. Repository Structure

```
ABCEL/
├── backend/
│   ├── server/
│   │   ├── main.py                 # FastAPI app, mounts all routers
│   │   ├── routes/
│   │   │   ├── ai.py               # Chat, insights, LLM calls
│   │   │   ├── auth.py             # Login, token validation
│   │   │   ├── data.py             # businesses, units, clusters, cohorts
│   │   │   ├── upload.py           # File upload handler
│   │   │   ├── statistical.py      # Correlations, network analysis
│   │   │   ├── sentiment.py        # Sentiment analysis
│   │   │   ├── persona.py          # Persona builder
│   │   │   ├── hypothesis.py       # Hypothesis testing
│   │   │   └── focus_spotlight.py  # Focus spotlight
│   │   ├── lib/
│   │   │   ├── llm.py              # call_llm(), call_mistral(), call_cerebras()
│   │   │   ├── stats.py            # Z-test, std_dev, significance_badge
│   │   │   └── cache.py            # load_responses() with in-memory cache
│   │   ├── middleware/
│   │   │   └── auth.js             # Auth middleware
│   │   └── data/
│   │       └── users.json          # User credentials & roles
│   ├── preprocess/
│   │   └── extract.py              # WTW Excel → JSON pipeline
│   └── data/                       # Pre-processed JSON data files
├── frontend/
│   ├── src/
│   │   ├── pages/                  # 20 page components
│   │   ├── components/
│   │   │   ├── layout/             # AppHeader, Sidebar, TopBar, RightPanel
│   │   │   ├── chat/               # ChatWithData.jsx
│   │   │   └── shared/             # Reusable UI components
│   │   ├── context/
│   │   │   └── AppContext.jsx      # Global state (page, selected business, filters)
│   │   └── utils/
│   │       └── api.js              # apiFetch() with auth headers
│   └── dist/                       # Built frontend (served by FastAPI)
├── docs/
│   └── PROJECT_OVERVIEW.md         # This document
└── .env                            # API keys and config
```

---

## 12. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **FastAPI serves frontend** | Single deployment — no separate web server needed. One port, one process. |
| **Pre-process to JSON** | 55K records in JSON loads into memory in ~2s. No database latency for every query. |
| **Direct Python streaming for individual records** | LLM models abbreviate and summarise despite instructions. Python guarantees exact output for data-heavy responses. |
| **Mistral primary, Cerebras fallback** | Mistral has best quality for structured analytics. Cerebras handles rate-limit spikes during demos. |
| **Stateless auth (Bearer token)** | No session store needed. Works across restarts. Appropriate for demo/MVP scale. |
| **Word-based fuzzy entity matching** | Users type company names with typos ("birla estate", "novel jewel", "birl carbon"). Substring matching catches all variants without a rigid alias dictionary. |
| **Cluster classification at extract time** | Pre-computing clusters means the Overview page loads instantly with no runtime computation. |

---

*Document covers the ABCEL platform as of the ABG Vibes 2026 survey cycle.*
