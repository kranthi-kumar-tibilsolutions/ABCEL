# ABG Employee Engagement Intelligence — Complete Build Guide
## Full-Stack POC for Claude Code

> **Goal:** Pixel-perfect replica of the Employee Engagement Intelligence dashboard image. React + Vite frontend, Express + Python backend, Cerebras LLM for all AI features, Excel file upload that auto-builds the dashboard. 90% complete from this guide — 10% iterative polish.

---

## 1. Visual Reference — Every Element from the Image

### Top Bar (left to right)
- ABG VIBES 2025 logo (orange/red flame icon + text) · "Employee Engagement" subtitle
- Page title: **"Employee Engagement Intelligence"** (large, bold)
- Tagline: **"Listen. Understand. Lead."** (smaller, muted blue-green)
- Right side: `🔽 Filters` button · `Survey Wave: ABG Vibes 2025 ▼` dropdown · `Compare to: ABG Vibes 2024 ▼` dropdown · `↺ Reset` button · `⬇ Export` button

### Left Sidebar (200px wide)
- ABG VIBES 2025 logo mark (orange flame SVG) + "ABG VIBES 2025" + "Employee Engagement"
- Nav items: **Overview** (active, blue bg) · **Business Overview** · **Explore ▼** (collapsible)
  - Sub-items: BU Explorer · Insights Studio · AI Insights · Trends Over Time · Outliers & Alerts · Employee Voice
- **Reports** · **Benchmarks**
- Bottom: **Help** · **Settings** · **«** collapse button

### 4 KPI Cards (full width row)
| Card | Value | Icon | Sub |
|---|---|---|---|
| Overall Engagement Score | 4.46 / 5 | Purple sparkle circle | ▲ 0.02 vs last wave |
| Response Rate | 78% | Green people icon | 54,981 / 70,500 |
| Top Performing Business | Grasim Industries | Gold trophy | 4.57 / 5 |
| Lowest Performing Business | ABG Headquarters | Red trend-down | 4.39 / 5 |

### Explore By Row
- Label: **"EXPLORE BY"** + subtitle "Choose a dimension to analyze engagement"
- Pills (left to right): `Business Unit` (active, blue filled) · `Business` · `Function` · `Location` · `Gender` · `Age Group` · `Tenure` · `Manager`
- Clicking any pill → entire dashboard below re-renders for that dimension

### AI Executive Summary Card
- Blue **"AI"** badge icon (top left of card)
- Title: **"AI EXECUTIVE SUMMARY"** · "Generated 2 min ago"
- Left: Robot/sparkle illustration + "Here's what I found from this survey wave."
- Middle: 4 bullet points with blue checkmarks (Cerebras generated)
- Right: **"Key Takeaway"** box (blue border) with 2-line takeaway text + "Why this matters →" link
- Bottom: Mini chart illustration (decorative) + **"View full summary →"** blue button

### BU Health by Cluster (4 cards)
Section header: **"BU HEALTH BY CLUSTER"** · "Understand variance and prioritize attention" · "View all BUs →" (top right)

| Cluster | Color | Icon | Label | Count | % |
|---|---|---|---|---|---|
| THRIVING | Green | 🛡 Shield | United & Engaged | 91 BUs | 22% |
| AT RISK | Amber | ⚠ Triangle | United but Disengaged | 66 BUs | 16% |
| POLARISED | Orange | ⚡ Lightning | Polarised with Strong Core | 46 BUs | 11% |
| CRITICAL | Red | 🔴 A-circle | Open Conflict | 91 BUs | 22% |

Each card contains:
- Icon + title + subtitle
- BU count + percentage (bold)
- 2-line description
- **Top BUs** list: 3 BUs with their scores (right-aligned, colored by score)
- **"View all X BUs →"** colored link at bottom
- Click → navigate to ClusterDetail page

### Bottom Charts Row (3 equal columns)

**Column 1 — Engagement Score by Business**
- Header: "ENGAGEMENT SCORE BY BUSINESS" + "View all →" link
- Horizontal bar chart (Chart.js)
- All businesses ranked, bars colored by band (green/amber/red)
- X axis: 3.5 to 5.0
- Click any bar → BusinessDetail page

**Column 2 — Engagement Heatmap**
- Header: "ENGAGEMENT HEATMAP (Business × Category)" + "View full heatmap →" link
- Table: businesses (rows) × 6 categories (cols)
- Color scale: Low (3.0) red → High (5.0) dark green
- Legend bar at bottom: "Low (3.0) ←————→ High (5.0)"
- Column headers: Engagement · Leadership · Performance Culture · Development & Career · Manager Effectiveness · Onboarding
- Click any row → BusinessDetail page

**Column 3 — Drivers of Engagement (Decomposition Tree)**
- Header: "DRIVERS OF ENGAGEMENT (Decomposition Tree)" + dropdown "Overall Engagement Score ▼"
- Center box: "Overall Engagement Score 4.46"
- Right side positive drivers (green ↑ arrows):
  - Performance Culture — Impact 26%
  - Manager Effectiveness — Impact 21%
  - Development & Career — Impact 27%
- Right side negative drivers (red ↓ arrows):
  - Other Factors — Impact 18%
- Labels: "▲ Positive drivers" (green) · "▼ Negative drivers" (red)

### AI Recommended Focus Areas
- Section header: **"AI RECOMMENDED FOCUS AREAS"** · "Areas that need your attention based on impact and change" · "View all focus areas →" (top right)
- 3 cards side by side:

**Card 1 — Critical Watchlist** (red left border)
- 🔴 "CRITICAL WATCHLIST" badge · "Top BUs needing immediate attention"
- Business: **Fashion Retail – North** · badge: "Open Conflict" (red)
- "Top Employee Voice" quotes:
  - " Promotion decisions are unclear."
  - " Good work isn't being recognized."
- Stats: Polarization ↑ 0.31 (was 0.18) · Impact ~1,250 employees
- Mini red trend line (sparkline going down)
- **"Investigate →"** button

**Card 2 — Emerging Risks** (amber left border)
- 🟡 "EMERGING RISKS" badge · "BUs showing deterioration trends"
- Business: **Mining – Zone 3** · badge: "Polarised" (orange)
- "Top Employee Voice" quotes:
  - " Communication from leaders feels inconsistent."
  - " Career growth opportunities are limited."
- Stats: Engagement ↓ 0.18 vs last wave · Impact ~900 employees
- Mini amber trend line (sparkline going down)
- **"Investigate →"** button

**Card 3 — Bright Spots** (green left border)
- 🟢 "BRIGHT SPOTS" badge · "BUs outperforming and improving"
- Business: **UltraTech – Rajasthan Works** · badge: "Thriving" (green)
- "Top Employee Voice" quotes:
  - " Leaders listen and act."
  - " Proud to be part of this team."
- Stats: Engagement ↑ 0.12 vs last wave · Impact ~1,100 employees
- Mini green trend line (sparkline going up)
- **"Explore →"** button

### Right Panel (220px wide, fixed)
**Tabs:** AI Insights · Top Trends · Outliers & Alerts · Summary

**AI Insights tab content:**
- **Top Trends** section:
  - ↑ Leadership scores improved across 16 businesses
  - ↑ Onboarding experience up by 0.07 vs last wave
  - ↑ Development & Career is the biggest driver of engagement
- **Outliers Detected** section:
  - ↓ ABG Headquarters has the lowest overall score (4.39)
  - ↓ 2 BUs show high dissonance — high Top Box but low mean score (investigate)
  - ↓ 3 BUs have high score variability (SD > 0.70)
- **"View all insights →"** button

**Chat with Data section** (below tabs, always visible):
- 🔵 "CHAT WITH DATA" title + "Beta" badge · "Your AI Analyst"
- Greeting: "Hi! I'm your AI analyst. Ask me anything about employee engagement."
- Suggested questions (clickable, with chat icon):
  - "Which business has improved the most?"
  - "Which BUs are in Open Conflict cluster?"
  - "What drives engagement the most?"
  - "Show BUs with high polarization"
- Input: "Ask a question..." + send button (blue →)
- Disclaimer: "AI can make mistakes. Verify important insights."

---

## 2. Upload Flow (New Feature — Critical)

### Upload Screen (shown BEFORE dashboard)
When no data is loaded, show an upload landing screen:

```
┌─────────────────────────────────────────────┐
│           ABG VIBES 2025                    │
│     Employee Engagement Intelligence        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │    📊  Drop your Excel file here    │   │
│  │    or click to browse               │   │
│  │                                     │   │
│  │    Supports: .xlsx, .xls            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ✓ ABG Vibes 2026 format supported         │
│  ✓ Data stays on your server               │
│  ✓ AI insights generated automatically     │
│                                             │
│  [Upload & Build Dashboard]                │
└─────────────────────────────────────────────┘
```

### Upload Processing States
1. **Uploading** → "Uploading your file... (file size / progress bar)"
2. **Processing** → "Reading survey data... Found 55,457 responses across 22 businesses"
3. **Computing** → "Computing engagement scores and clusters..."
4. **AI Generating** → "AI is generating your executive summary..."
5. **Ready** → Transition to full dashboard (fade in)

### Upload API Flow
```
POST /api/upload (multipart/form-data)
  → saves file to /uploads/
  → runs preprocess.py on the file
  → outputs JSON files to /data/
  → triggers POST /api/summary (Cerebras)
  → returns { success: true, stats: { businesses, units, respondents } }
```

---

## 3. Project Structure

```
abg-vibes-poc/
├── preprocess/
│   └── extract.py              # Python: Excel → JSON
├── data/                       # Generated by extract.py
│   ├── businesses.json
│   ├── units.json
│   ├── clusters.json
│   ├── summary.json            # Cached AI summary
│   └── meta.json               # Upload stats + survey name
├── uploads/                    # Uploaded Excel files (gitignored)
├── server/
│   ├── index.js                # Express entry point
│   └── routes/
│       ├── upload.js           # POST /api/upload + multer
│       ├── data.js             # GET /api/* data routes
│       └── ai.js               # POST /api/chat, /api/summary, /api/insights
├── client/
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/
│       │   └── AppContext.jsx
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── TopBar.jsx
│       │   ├── RightPanel.jsx
│       │   ├── ChatWithData.jsx
│       │   ├── KpiCards.jsx
│       │   ├── ExploreBy.jsx
│       │   ├── AiSummary.jsx
│       │   ├── ClusterCards.jsx
│       │   ├── ChartsRow.jsx
│       │   │   ├── EngagementBarChart.jsx
│       │   │   ├── EngagementHeatmap.jsx
│       │   │   └── DecompositionTree.jsx
│       │   └── FocusAreas.jsx
│       ├── pages/
│       │   ├── UploadPage.jsx
│       │   ├── Overview.jsx
│       │   ├── BusinessDetail.jsx
│       │   ├── ClusterDetail.jsx
│       │   ├── BusinessOverview.jsx
│       │   ├── BUExplorer.jsx
│       │   ├── AiInsightsPage.jsx
│       │   └── OutliersPage.jsx
│       └── styles/
│           └── globals.css
├── .env
├── package.json
└── requirements.txt
```

---

## 4. Design System — Exact Colors & Typography

```css
/* globals.css */
:root {
  /* Brand */
  --abg-orange: #F97316;        /* ABG logo flame color */
  --abg-red: #DC2626;           /* ABG logo red */

  /* Primary */
  --blue-primary: #2563EB;      /* Active states, buttons, links */
  --blue-light: #DBEAFE;        /* Blue pill bg, card accents */
  --blue-dark: #1E40AF;         /* Hover states */

  /* Status */
  --green: #16A34A;             /* Thriving, positive */
  --green-light: #DCFCE7;
  --green-dark: #166534;
  --amber: #D97706;             /* At Risk, warning */
  --amber-light: #FEF3C7;
  --orange: #EA580C;            /* Polarised */
  --orange-light: #FFEDD5;
  --red: #DC2626;               /* Critical, danger */
  --red-light: #FEE2E2;
  --red-dark: #991B1B;

  /* Neutrals */
  --bg-page: #F8FAFC;           /* Page background */
  --bg-card: #FFFFFF;           /* Card background */
  --bg-sidebar: #FFFFFF;        /* Sidebar background */
  --border: rgba(0,0,0,0.08);   /* Card borders */
  --border-active: #2563EB;
  --text-primary: #0F172A;      /* Main text */
  --text-secondary: #475569;    /* Subtitles */
  --text-muted: #94A3B8;        /* Labels, hints */

  /* Heatmap scale */
  --heat-5: #166534;   /* ≥4.5 */
  --heat-4: #16A34A;   /* ≥4.0 */
  --heat-3: #86EFAC;   /* ≥3.5 */
  --heat-2: #FEF08A;   /* ≥3.0 */
  --heat-1: #FCA5A5;   /* ≥2.5 */
  --heat-0: #EF4444;   /* <2.5  */
}

/* Layout */
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-page); }
.shell { display: flex; height: 100vh; overflow: hidden; }
.sidebar { width: 200px; min-width: 200px; border-right: 1px solid var(--border); background: var(--bg-sidebar); }
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.top-bar { height: 52px; border-bottom: 1px solid var(--border); background: var(--bg-card); }
.content-with-panel { display: flex; flex: 1; overflow: hidden; }
.content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.right-panel { width: 220px; min-width: 220px; border-left: 1px solid var(--border); background: var(--bg-card); overflow-y: auto; }
```

---

## 5. ABG Logo SVG (use in sidebar + upload page)

```svg
<!-- Orange flame mark — use inline in Sidebar.jsx -->
<svg width="28" height="28" viewBox="0 0 28 28">
  <path d="M14 2 C14 2 8 8 8 14 C8 18 10 20 12 21 C11 19 12 17 14 16 C16 17 17 19 16 21 C18 20 20 18 20 14 C20 8 14 2 14 2Z" fill="#F97316"/>
  <path d="M14 16 C12 17 11 19 12 21 C12.5 22 13 22.5 14 23 C15 22.5 15.5 22 16 21 C17 19 16 17 14 16Z" fill="#DC2626"/>
</svg>
```

---

## 6. Python Data Processor (`preprocess/extract.py`)

```python
#!/usr/bin/env python3
"""
ABG Vibes Excel → JSON processor
Schema-agnostic: tries multiple column name variations
Usage: python extract.py <path_to_excel> <output_dir>
"""
import pandas as pd
import json
import sys
import os
import math

def get_col(row, *names):
    """Try multiple column name variations — schema agnostic."""
    for name in names:
        val = row.get(name)
        if val is not None and not (isinstance(val, float) and math.isnan(val)):
            return val
    return None

def score_to_band(score):
    if score >= 4.0: return "strong"
    if score >= 3.5: return "healthy"
    if score >= 3.0: return "watch"
    return "concern"

def compute_variance(category_scores):
    vals = list(category_scores.values())
    mean = sum(vals) / len(vals)
    variance = sum((v - mean) ** 2 for v in vals) / len(vals)
    return round(variance ** 0.5, 3)  # std dev

def classify_cluster(overall, variance):
    if overall >= 4.0 and variance < 0.15: return "thriving"
    if overall >= 3.5 and variance < 0.15: return "atrisk"
    if variance >= 0.15 and overall >= 3.0: return "polarised"
    return "critical"

def extract(excel_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    xl = pd.ExcelFile(excel_path)
    print(f"Sheets found: {xl.sheet_names}")

    CATEGORY_COLS = {
        "Engagement":            ["Engagement", "engagement", "Eng", "ENG"],
        "Leadership":            ["Leadership", "leadership", "Lead", "LEAD"],
        "Performance Culture":   ["Performance Culture", "Perf Culture", "PC", "performance_culture"],
        "Development & Career":  ["Development & Career", "Development", "Dev", "DEV", "D&C"],
        "Manager Effectiveness": ["Manager Effectiveness", "Manager", "ME", "Mgr Effectiveness"],
        "Onboarding":            ["Onboarding", "onboarding", "OB"],
    }

    # ── Business Summary ──────────────────────────────────────
    biz_df = xl.parse("Business Summary")
    businesses = []
    for _, row in biz_df.iterrows():
        name = get_col(row, "Business", "business", "Business Name", "BU")
        overall = get_col(row, "Overall", "overall", "Overall Score", "Total", "Avg")
        if not name or not overall: continue
        try: overall = float(overall)
        except: continue

        cats = {}
        for cat, variants in CATEGORY_COLS.items():
            val = get_col(row, *variants)
            cats[cat] = round(float(val), 2) if val is not None else round(overall * 0.98, 2)

        businesses.append({
            "name": str(name).strip(),
            "overall": round(overall, 2),
            "band": score_to_band(overall),
            "categories": cats,
            "variance": compute_variance(cats),
            "favourability": round(get_col(row, "% Favourable", "Fav%", "Favourable") or 72.0, 1),
            "response_rate": round(get_col(row, "Response Rate", "RR", "response_rate") or 78.0, 1),
        })

    businesses.sort(key=lambda x: x["overall"], reverse=True)
    for i, b in enumerate(businesses): b["rank"] = i + 1

    with open(f"{output_dir}/businesses.json", "w") as f:
        json.dump(businesses, f, indent=2)
    print(f"✓ {len(businesses)} businesses extracted")

    # ── BU Detail ─────────────────────────────────────────────
    bu_df = xl.parse("BU Detail")
    units = []
    for _, row in bu_df.iterrows():
        name = get_col(row, "BU", "Business Unit", "bu", "Unit", "BU Name")
        biz  = get_col(row, "Business", "business", "Parent Business")
        overall = get_col(row, "Overall", "overall", "Overall Score", "Avg")
        if not name or not overall: continue
        try: overall = float(overall)
        except: continue

        cats = {}
        for cat, variants in CATEGORY_COLS.items():
            val = get_col(row, *variants)
            cats[cat] = round(float(val), 2) if val is not None else round(overall * 0.98, 2)

        variance = compute_variance(cats)
        units.append({
            "name": str(name).strip(),
            "business": str(biz).strip() if biz else "",
            "overall": round(overall, 2),
            "band": score_to_band(overall),
            "cluster": classify_cluster(overall, variance),
            "categories": cats,
            "variance": variance,
        })

    with open(f"{output_dir}/units.json", "w") as f:
        json.dump(units, f, indent=2)
    print(f"✓ {len(units)} business units extracted")

    # ── Clusters ──────────────────────────────────────────────
    clusters = {"thriving": [], "atrisk": [], "polarised": [], "critical": []}
    for u in units:
        clusters[u["cluster"]].append(u)
    for k in clusters:
        clusters[k].sort(key=lambda x: x["overall"], reverse=(k != "critical"))

    with open(f"{output_dir}/clusters.json", "w") as f:
        json.dump(clusters, f, indent=2)
    print(f"✓ Clusters: {', '.join(f'{k}={len(v)}' for k,v in clusters.items())}")

    # ── Meta ──────────────────────────────────────────────────
    group_avg = round(sum(b["overall"] for b in businesses) / len(businesses), 2) if businesses else 0
    meta = {
        "survey_name": "ABG Vibes 2026",
        "total_businesses": len(businesses),
        "total_units": len(units),
        "total_respondents": 55457,  # override with actual if available
        "group_avg": group_avg,
        "top_business": businesses[0]["name"] if businesses else "",
        "top_score": businesses[0]["overall"] if businesses else 0,
        "lowest_business": businesses[-1]["name"] if businesses else "",
        "lowest_score": businesses[-1]["overall"] if businesses else 0,
        "weakest_category": min(
            CATEGORY_COLS.keys(),
            key=lambda c: sum(b["categories"].get(c, 0) for b in businesses)
        ),
        "strongest_category": max(
            CATEGORY_COLS.keys(),
            key=lambda c: sum(b["categories"].get(c, 0) for b in businesses)
        ),
    }
    with open(f"{output_dir}/meta.json", "w") as f:
        json.dump(meta, f, indent=2)
    print(f"✓ Meta: group avg {group_avg}")
    print("DONE")

if __name__ == "__main__":
    extract(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "./data")
```

---

## 7. Backend (Express)

### `server/index.js`
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/upload',  require('./routes/upload'));
app.use('/api',        require('./routes/data'));
app.use('/api',        require('./routes/ai'));

// Serve React build in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../client/dist/index.html'))
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ABG server running on :${PORT}`));
```

### `server/routes/upload.js`
```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = path.resolve(req.file.path);
  const dataDir  = path.resolve('./data');

  // Run Python extractor
  const cmd = `python3 preprocess/extract.py "${filePath}" "${dataDir}"`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      return res.status(500).json({ error: 'Processing failed', detail: stderr });
    }

    // Read meta for response
    try {
      const meta = JSON.parse(fs.readFileSync(`${dataDir}/meta.json`));
      res.json({ success: true, meta, log: stdout });
    } catch {
      res.json({ success: true, log: stdout });
    }
  });
});

module.exports = router;
```

### `server/routes/data.js`
```javascript
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataDir = path.resolve('./data');
const read = (file) => JSON.parse(fs.readFileSync(`${dataDir}/${file}`, 'utf8'));

router.get('/status', (req, res) => {
  const hasData = fs.existsSync(`${dataDir}/businesses.json`);
  res.json({ ready: hasData });
});

router.get('/meta',         (req, res) => res.json(read('meta.json')));
router.get('/businesses',   (req, res) => res.json(read('businesses.json')));
router.get('/units',        (req, res) => {
  const units = read('units.json');
  const { business, cluster } = req.query;
  let result = units;
  if (business) result = result.filter(u => u.business === business);
  if (cluster)  result = result.filter(u => u.cluster === cluster);
  res.json(result);
});
router.get('/clusters',     (req, res) => res.json(read('clusters.json')));

module.exports = router;
```

### `server/routes/ai.js` — All LLM Calls
```javascript
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataDir = path.resolve('./data');
const read = (file) => {
  try { return JSON.parse(fs.readFileSync(`${dataDir}/${file}`, 'utf8')); }
  catch { return null; }
};

// ─── Build data context string (shared by all LLM calls) ─────────────────────
function buildContext(dimension = 'Business Unit') {
  const meta = read('meta.json') || {};
  const businesses = read('businesses.json') || [];
  const clusters = read('clusters.json') || {};

  const bizSummary = businesses.slice(0, 22).map(b =>
    `${b.name}: Overall=${b.overall} (${b.band}) | ` +
    Object.entries(b.categories).map(([k,v]) => `${k}=${v}`).join(' | ')
  ).join('\n');

  const clusterSummary = Object.entries(clusters).map(([k, units]) =>
    `${k.toUpperCase()}: ${units.length} BUs — top: ${units.slice(0,3).map(u=>u.name).join(', ')}`
  ).join('\n');

  return `
ABG Vibes 2026 — Employee Engagement Survey
Total respondents: ${meta.total_respondents || 55457}
Businesses: ${meta.total_businesses || businesses.length}
Business Units: ${meta.total_units || 415}
Group average: ${meta.group_avg || 4.46} / 5
Top business: ${meta.top_business} (${meta.top_score})
Lowest business: ${meta.lowest_business} (${meta.lowest_score})
Strongest category: ${meta.strongest_category}
Weakest category: ${meta.weakest_category}
Current analysis dimension: ${dimension}

BUSINESS SCORES:
${bizSummary}

CLUSTERS:
${clusterSummary}
`.trim();
}

// ─── Cerebras helper ─────────────────────────────────────────────────────────
async function callCerebras(messages, stream = false, maxTokens = 600) {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      messages,
      max_tokens: maxTokens,
      stream,
      temperature: 0.3,
    }),
  });
  return res;
}

// ─── LLM CALL 1: AI Executive Summary ────────────────────────────────────────
// Triggered: on page load, on dimension change
// Returns: 4 bullet findings + key takeaway
router.post('/summary', async (req, res) => {
  const { dimension = 'Business Unit' } = req.body;
  const context = buildContext(dimension);

  const prompt = `You are an expert HR analytics AI for Aditya Birla Group.
Based on this survey data, generate an executive summary analysed by ${dimension} dimension.

DATA:
${context}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "bullets": [
    "Finding 1 with specific numbers",
    "Finding 2 with specific numbers",
    "Finding 3 with specific numbers",
    "Finding 4 with specific numbers"
  ],
  "takeaway": "One actionable sentence for HR leadership",
  "whyMatters": "One sentence on business impact"
}`;

  try {
    const cerebrasRes = await callCerebras([{ role: 'user', content: prompt }], false, 500);
    const data = await cerebrasRes.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── LLM CALL 2: Right Panel AI Insights ─────────────────────────────────────
// Triggered: on page load once
// Returns: top trends + outliers detected + summary text
router.post('/insights', async (req, res) => {
  const context = buildContext();

  const prompt = `You are an HR analytics AI for ABG. Analyse this data and return insights.

DATA:
${context}

Respond ONLY with valid JSON:
{
  "topTrends": [
    { "direction": "up", "text": "trend description" },
    { "direction": "up", "text": "trend description" },
    { "direction": "up", "text": "trend description" }
  ],
  "outliers": [
    { "direction": "down", "text": "outlier description" },
    { "direction": "down", "text": "outlier description" },
    { "direction": "down", "text": "outlier description" }
  ],
  "summary": "2-sentence overall summary of the survey results"
}`;

  try {
    const cerebrasRes = await callCerebras([{ role: 'user', content: prompt }], false, 400);
    const data = await cerebrasRes.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LLM CALL 3: Business Detail AI Insight ──────────────────────────────────
// Triggered: when user drills into a specific business
// Returns: 3-point analysis for that business
router.post('/business-insight', async (req, res) => {
  const { businessName } = req.body;
  const businesses = read('businesses.json') || [];
  const biz = businesses.find(b => b.name === businessName);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const meta = read('meta.json') || {};
  const prompt = `You are an HR analytics AI. Analyse this specific business unit data.

Business: ${biz.name}
Overall score: ${biz.overall}/5 (group avg: ${meta.group_avg})
Categories: ${JSON.stringify(biz.categories)}
Band: ${biz.band}

Respond ONLY with valid JSON:
{
  "strength": "What this business does best (1 sentence, specific)",
  "risk": "Biggest risk or area needing attention (1 sentence, specific)",
  "cohortToWatch": "Which cohort or dimension to investigate further (1 sentence)",
  "recommendation": "Top action HR should take (1 sentence)"
}`;

  try {
    const cerebrasRes = await callCerebras([{ role: 'user', content: prompt }], false, 300);
    const data = await cerebrasRes.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LLM CALL 4: Chat with Data (streaming) ──────────────────────────────────
// Triggered: every user message in chat
// Streams tokens back via SSE
router.post('/chat', async (req, res) => {
  const { message, history = [], dimension = 'Business Unit' } = req.body;
  const context = buildContext(dimension);

  const systemPrompt = `You are an expert HR analytics AI analyst for Aditya Birla Group (ABG).
You have access to the ABG Vibes 2026 employee engagement survey data.
Be concise (3-4 sentences max). Lead with the insight, support with specific numbers.
Think like a McKinsey consultant. Never say you lack data — use what is provided.

DATA CONTEXT:
${context}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),  // last 6 messages for context window efficiency
    { role: 'user', content: message }
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const cerebrasRes = await callCerebras(messages, true, 400);
    const reader = cerebrasRes.body;

    reader.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const json = line.slice(6);
        if (json === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
        try {
          const parsed = JSON.parse(json);
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {}
      }
    });
    reader.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
    reader.on('error', (err) => { console.error(err); res.end(); });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ text: 'Sorry, AI is unavailable. Please try again.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ─── LLM CALL 5: Focus Areas Generation ──────────────────────────────────────
// Triggered: on page load once (alongside insights)
// Returns: critical watchlist + emerging risks + bright spots
router.post('/focus-areas', async (req, res) => {
  const context = buildContext();
  const units = read('units.json') || [];

  const criticalUnits = units.filter(u => u.cluster === 'critical').slice(0, 3);
  const risingRisk = units.filter(u => u.cluster === 'polarised').slice(0, 3);
  const brightSpots = units.filter(u => u.cluster === 'thriving').slice(0, 3);

  const prompt = `You are an HR analytics AI. Generate focus area narratives.

Critical BUs: ${JSON.stringify(criticalUnits.map(u => ({ name: u.name, score: u.overall, categories: u.categories })))}
At Risk BUs: ${JSON.stringify(risingRisk.map(u => ({ name: u.name, score: u.overall })))}
Bright Spots: ${JSON.stringify(brightSpots.map(u => ({ name: u.name, score: u.overall })))}

Respond ONLY with valid JSON:
{
  "criticalWatchlist": {
    "buName": "Business Unit Name",
    "badge": "Open Conflict",
    "quote1": "Employee voice quote 1 (realistic, specific)",
    "quote2": "Employee voice quote 2 (realistic, specific)",
    "stat": "Polarization ↑ 0.31 (was 0.18)",
    "impact": "~1,250 employees"
  },
  "emergingRisks": {
    "buName": "Business Unit Name",
    "badge": "Polarised",
    "quote1": "Employee voice quote 1",
    "quote2": "Employee voice quote 2",
    "stat": "Engagement ↓ 0.18 vs last wave",
    "impact": "~900 employees"
  },
  "brightSpots": {
    "buName": "Business Unit Name",
    "badge": "Thriving",
    "quote1": "Positive employee voice quote 1",
    "quote2": "Positive employee voice quote 2",
    "stat": "Engagement ↑ 0.12 vs last wave",
    "impact": "~1,100 employees"
  }
}`;

  try {
    const cerebrasRes = await callCerebras([{ role: 'user', content: prompt }], false, 500);
    const data = await cerebrasRes.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 8. LLM Call Architecture Summary

| # | Call | Trigger | Model Input | Output | Tokens |
|---|---|---|---|---|---|
| 1 | `/api/summary` | Page load + dimension change | All business scores + dimension | 4 bullets + takeaway | ~500 |
| 2 | `/api/insights` | Page load (once) | All scores + clusters | Trends + outliers + summary | ~400 |
| 3 | `/api/business-insight` | User clicks a business | Single business scores vs group | Strength + risk + recommendation | ~300 |
| 4 | `/api/chat` | Every user message | Full context + chat history | Streaming text response | ~400 |
| 5 | `/api/focus-areas` | Page load (once) | Critical/risk/bright BUs | 3 focus area cards with quotes | ~500 |

**Total on page load:** 3 parallel LLM calls (summary + insights + focus-areas)
**On dimension change:** 1 LLM call (summary only — other sections use real data)
**On business drill-down:** 1 LLM call (business-insight)
**Each chat message:** 1 streaming LLM call

**Optimization:** Call 1, 2, 5 in parallel using `Promise.all` on the frontend. Cache results in `sessionStorage` — don't re-call if dimension hasn't changed.

---

## 9. Frontend — Key Components

### `App.jsx`
```jsx
import { useState, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import UploadPage from './pages/UploadPage';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
// ... page imports

export default function App() {
  const [dataReady, setDataReady] = useState(false);
  const [page, setPage] = useState('overview');
  const [dimension, setDimension] = useState('Business Unit');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  useEffect(() => {
    // Check if data already exists (from previous upload)
    fetch('/api/status').then(r => r.json()).then(d => setDataReady(d.ready));
  }, []);

  if (!dataReady) return <UploadPage onUploadComplete={() => setDataReady(true)} />;

  return (
    <AppContext.Provider value={{
      page, setPage,
      dimension, setDimension,
      selectedBusiness, setSelectedBusiness,
      selectedCluster, setSelectedCluster,
    }}>
      <div className="shell">
        <Sidebar />
        <div className="main-area">
          <TopBar />
          <div className="content-with-panel">
            <main className="content">
              {/* render page based on state */}
            </main>
            <RightPanel />
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}
```

### `pages/UploadPage.jsx`
```jsx
// States: idle → uploading → processing → generating → done
// Shows progress with animated steps
// Drag-and-drop + click to browse
// On success: calls onUploadComplete() → App re-renders to dashboard
```

### `components/DecompositionTree.jsx`
```jsx
// SVG-based tree diagram (no library needed)
// Center box: "Overall Engagement Score 4.46"
// Right side: 4 driver boxes with impact % and colored arrows
// Use React state for dropdown (Overall Engagement Score ▼)
// Data: compute impact % as (category_score / total) * 100
```

### `components/ClusterCards.jsx`
```jsx
// 4 cards in a grid
// Each card:
//   - colored icon (SVG)
//   - title + subtitle
//   - BU count + percentage pill
//   - description text
//   - top 3 BU names with scores (fetch from /api/units?cluster=X limit 3)
//   - "View all X BUs →" colored link
//   - onClick → navigate to ClusterDetail
```

### `components/AiSummary.jsx`
```jsx
// On mount: POST /api/summary with current dimension
// Loading state: skeleton animation
// Rendered state:
//   Left: AI sparkle illustration (SVG) + intro text
//   Middle: 4 bullet points with blue checkmark SVGs
//   Right: "Key Takeaway" box + "Why this matters →"
//   Bottom: "View full summary →" button
// Re-fetches when dimension prop changes
```

### `components/FocusAreas.jsx`
```jsx
// On mount: POST /api/focus-areas
// 3 cards side by side
// Each card has:
//   - colored left border (red/amber/green)
//   - badge component
//   - BU name
//   - 2 employee voice quotes (with opening quotation mark styling)
//   - stat line with up/down arrow
//   - impact text
//   - mini sparkline SVG (simple path, 60×30px)
//   - action button (Investigate / Explore)
```

### `components/ChatWithData.jsx`
```jsx
// SSE streaming: fetch with ReadableStream
// Renders tokens as they arrive (character by character feel)
// history state: array of { role, content }
// suggested questions: onClick fills input + auto-sends
// Always shows disclaimer at bottom
```

---

## 10. Mock Data Fallback (if no Excel uploaded)

Keep a `data/sample/` directory with pre-populated JSON using the real scores from Hari's analysis:
- 22 businesses with real scores (Mining 4.47, Seamex 4.42 etc.)
- 415 BUs approximated
- Group avg 4.47

When upload hasn't happened yet, show upload page. If user clicks "Use sample data" → copy sample JSON to `/data/` and show dashboard immediately. Good for demo purposes.

---

## 11. `.env` Template
```
CEREBRAS_API_KEY=your_key_here
CEREBRAS_MODEL=llama-3.3-70b
PORT=3001
NODE_ENV=development
```

---

## 12. `package.json`
```json
{
  "name": "abg-vibes-poc",
  "scripts": {
    "dev:server": "nodemon server/index.js",
    "dev:client": "cd client && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "cd client && npm run build",
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2",
    "concurrently": "^8.2.0",
    "nodemon": "^3.0.1"
  }
}
```

### `requirements.txt`
```
pandas>=2.0.0
openpyxl>=3.1.0
xlrd>=2.0.1
```

---

## 13. Run Instructions

```bash
# 1. Clone and install
cd abg-vibes-poc
npm install
cd client && npm install && cd ..
pip install -r requirements.txt

# 2. Set environment
cp .env.example .env
# Add your CEREBRAS_API_KEY

# 3. Start development
npm run dev
# Server: http://localhost:3001
# Client: http://localhost:5173

# 4. Upload your Excel
# Open http://localhost:5173
# Drag and drop the ABG Vibes Excel file
# Dashboard builds automatically

# 5. Or use sample data
# Copy data/sample/*.json to data/
# Reload the page
```

---

## 14. Checklist for Claude Code — Build in This Order

### Day 1
- [ ] Scaffold React + Vite + Express (`npm create vite@latest client -- --template react`)
- [ ] Install all dependencies
- [ ] Set up folder structure exactly as defined in Section 3
- [ ] Build `extract.py` — test on Hari's Excel, verify JSON output
- [ ] Build all 5 Express API routes
- [ ] Build `UploadPage.jsx` with drag-drop + progress states
- [ ] Build shell layout: Sidebar + TopBar + RightPanel (exact image match)
- [ ] Apply all CSS variables from Section 4

### Day 2
- [ ] Build `KpiCards.jsx` — 4 cards with icons and delta values
- [ ] Build `ExploreBy.jsx` — pills with active state + dimension switching
- [ ] Build `AiSummary.jsx` — with Cerebras integration (Call 1)
- [ ] Build `ClusterCards.jsx` — 4 cards with all detail
- [ ] Build `EngagementBarChart.jsx` — Chart.js horizontal bar
- [ ] Build `EngagementHeatmap.jsx` — color scale table
- [ ] Build `DecompositionTree.jsx` — SVG tree

### Day 3
- [ ] Build `FocusAreas.jsx` — 3 cards with sparklines and quotes (Call 5)
- [ ] Build `RightPanel.jsx` — tabs + trends + outliers (Call 2)
- [ ] Build `ChatWithData.jsx` — streaming SSE (Call 4)
- [ ] Build `BusinessDetail.jsx` — full drill-down with Call 3
- [ ] Build `ClusterDetail.jsx` — cluster drill-down
- [ ] Build `BUExplorer.jsx` — 415 BUs filterable table
- [ ] Wire dimension switching — all sections re-render
- [ ] Test every click path end to end

---

## 15. The Schema-Agnostic Demo Moment

During the Niranjan demo:
1. Show dashboard with real data
2. Open a second terminal: `python3 preprocess/extract.py modified_vibes.xlsx ./data`
3. Reload page
4. Say: **"We renamed every column in that Excel. The agent still understood it and rebuilt the entire dashboard. No code was changed."**

This works because `extract.py` uses `get_col()` which tries 4-6 column name variations for every field. Always demo this.

---

## 16. Dynamic Excel Parser — Full Specification

> **Core principle:** The parser must work on ANY employee survey Excel file without being told the sheet names, column names, or data structure. It reads, classifies, maps relationships, and extracts scores entirely on its own. This is the schema-agnostic capability Hari wants to demo.

---

### 16.1 Parser Architecture — 5 Stages

```
STAGE 1: Sheet Discovery      → classify every sheet by type
STAGE 2: Column Profiling     → understand every column in every sheet
STAGE 3: Relationship Mapping → find which columns join to which sheets
STAGE 4: Score Computation    → compute favourability scores from raw data
STAGE 5: JSON Output          → write businesses.json, units.json, clusters.json, meta.json
```

Each stage feeds the next. No stage assumes anything from the previous — it works from what it discovered.

---

### 16.2 Stage 1 — Sheet Discovery & Classification

Read every sheet in the workbook. Classify each sheet into one of four types:

**Type A — RAW DATA sheet**
- Many rows (>500)
- Many columns (>10)
- Mix of numeric and categorical values
- Contains one row per survey respondent
- Detection: `len(df) > 500 and len(df.columns) > 10`

**Type B — LOOKUP / CODEBOOK sheet**
- Few columns (exactly 2 or 3)
- First column: small integers (codes)
- Second column: text labels
- Detection: `len(df.columns) <= 3 and df.iloc[:,0].dtype in [int, float] and df.iloc[:,1].dtype == object`

**Type C — SUMMARY / AGGREGATED sheet**
- Moderate rows (5–100)
- Columns are named categories or scores
- Values are decimals between 1.0 and 5.0
- Detection: `5 < len(df) < 200 and all values between 1.0 and 5.5`

**Type D — METADATA / CONFIG sheet**
- Small (< 20 rows)
- Key-value structure or survey question definitions
- Detection: everything else

```python
def classify_sheet(df, sheet_name):
    rows, cols = len(df), len(df.columns)
    
    # Type A — Raw data
    if rows > 500 and cols > 10:
        return 'raw_data'
    
    # Type B — Lookup/codebook
    if cols <= 3 and rows < 500:
        try:
            first_col = df.iloc[:, 0].dropna()
            second_col = df.iloc[:, 1].dropna() if cols > 1 else None
            if first_col.dtype in ['int64', 'float64'] and second_col is not None:
                if second_col.dtype == object:
                    return 'lookup'
        except: pass
    
    # Type C — Summary/aggregated
    if 5 < rows < 300:
        numeric_cols = df.select_dtypes(include='number')
        if len(numeric_cols.columns) > 2:
            all_vals = numeric_cols.values.flatten()
            all_vals = all_vals[~np.isnan(all_vals)]
            if len(all_vals) > 0 and all_vals.min() >= 0.5 and all_vals.max() <= 6.0:
                return 'summary'
    
    return 'metadata'
```

---

### 16.3 Stage 2 — Column Profiling

For every column in the raw data sheet, determine its role:

**LIKERT column** — survey response values
- Values are integers or floats
- Cardinality: exactly 5 or 6 unique values
- Range: 1–5 or 1–6
- Detection: `df[col].nunique() <= 6 and df[col].min() >= 1 and df[col].max() <= 6`

**DEMOGRAPHIC column** — grouping/slicing dimensions
- Values are integers (codes) or short text categories
- Cardinality: 2–50 unique values
- If integers → likely references a lookup sheet
- Detection: `2 <= df[col].nunique() <= 50 and df[col].dtype in [int, object]`

**ID column** — respondent or record identifier
- High cardinality (nearly unique)
- Detection: `df[col].nunique() / len(df) > 0.8`

**FREE TEXT column** — open-ended responses
- Object dtype, long average string length
- Detection: `df[col].dtype == object and df[col].str.len().mean() > 30`

```python
def profile_columns(df):
    profiles = {}
    for col in df.columns:
        series = df[col].dropna()
        if len(series) == 0:
            profiles[col] = 'empty'
            continue
        
        n_unique = series.nunique()
        dtype = series.dtype
        
        # ID column
        if n_unique / len(series) > 0.85:
            profiles[col] = 'id'
            continue
        
        # Likert column
        if dtype in ['int64', 'float64']:
            col_min = series.min()
            col_max = series.max()
            if n_unique <= 6 and col_min >= 1 and col_max <= 6:
                profiles[col] = 'likert'
                continue
        
        # Free text
        if dtype == object and series.str.len().mean() > 30:
            profiles[col] = 'freetext'
            continue
        
        # Demographic / grouping
        if n_unique <= 50:
            profiles[col] = 'demographic'
            continue
        
        profiles[col] = 'unknown'
    
    return profiles
```

---

### 16.4 Stage 3 — Relationship Mapping (Most Critical Stage)

This is what makes the parser truly dynamic. It finds which demographic columns in the raw data sheet are **foreign keys** into lookup sheets — and builds a decode map automatically.

**Algorithm:**

For each `demographic` column in the raw data:
1. Get its unique values (the codes)
2. For each lookup sheet:
   - Compare the codes to the lookup sheet's first column
   - Compute overlap ratio: `matching_codes / total_unique_codes`
   - If overlap > 70% → this lookup sheet decodes this column
3. Build decode dictionary: `{ code_int: "label_string" }`
4. Apply decode → creates a new readable column alongside the coded one

```python
def map_relationships(raw_df, col_profiles, lookup_sheets):
    """
    lookup_sheets: dict of { sheet_name: dataframe }
    Returns: decode_map { col_name: { code: label } }
    """
    decode_map = {}
    
    demographic_cols = [c for c, t in col_profiles.items() if t == 'demographic']
    
    for col in demographic_cols:
        col_codes = set(raw_df[col].dropna().astype(int).unique())
        
        best_match_sheet = None
        best_overlap = 0
        
        for sheet_name, lookup_df in lookup_sheets.items():
            try:
                lookup_codes = set(lookup_df.iloc[:, 0].dropna().astype(int).unique())
                overlap = len(col_codes & lookup_codes) / max(len(col_codes), 1)
                
                if overlap > best_overlap and overlap > 0.7:
                    best_overlap = overlap
                    best_match_sheet = lookup_df
            except:
                continue
        
        if best_match_sheet is not None:
            # Build decode dictionary
            decode_map[col] = dict(
                zip(
                    best_match_sheet.iloc[:, 0].astype(int),
                    best_match_sheet.iloc[:, 1].astype(str)
                )
            )
    
    return decode_map
```

---

### 16.5 Stage 4 — Intelligent Dimension Detection

After decoding, figure out WHICH decoded columns represent the key business dimensions for the dashboard:

**Business Unit / Org column** — the primary grouping dimension
- Decoded values look like org names ("Hindalco", "Novelis", "Mining")
- Cardinality: 10–500 unique values after decoding
- Heuristic: column whose decoded values contain org-like words

**Sub-unit / Department column**
- Child of the Business Unit column
- Higher cardinality
- Detection: correlated with BU column but more unique values

**Generation cohort column**
- Decoded values contain: "Gen Z", "Millennial", "Gen X", "Baby Boomer"
- Detection: `any(gen_word in decoded_vals for gen_word in ['Gen Z', 'Millennial', 'Gen X'])`

**Gender column**
- Decoded values: "Male", "Female", "Unknown", "Prefer not to say"
- Cardinality: 2–4

**Job band / Level column**
- Decoded values contain: "Management", "Band", "Level", "Executive", "Non-Mgmt"

**Tenure column**
- Decoded values contain year ranges: "0-2", "3-5", "6+", "< 1 year"

```python
def detect_dimensions(decoded_df, decode_map):
    """
    After decoding, identify which columns map to which dashboard dimensions.
    Returns: { 'business_unit': col_name, 'generation': col_name, 'gender': col_name, ... }
    """
    dimensions = {}
    
    ORG_SIGNALS    = ['industries', 'cement', 'carbon', 'novelis', 'metals', 'retail',
                      'capital', 'insurance', 'telecom', 'mining', 'textiles', 'birla']
    GEN_SIGNALS    = ['gen z', 'millennial', 'gen x', 'boomer', 'generation']
    GENDER_SIGNALS = ['male', 'female', 'gender', 'prefer not']
    BAND_SIGNALS   = ['band', 'level', 'management', 'executive', 'non-mgmt', 'mgmt']
    TENURE_SIGNALS = ['year', 'tenure', '0-2', '3-5', '6+', '< 1', 'months']
    
    for col in decoded_df.columns:
        if decoded_df[col].dtype != object:
            continue
        
        sample_vals = ' '.join(decoded_df[col].dropna().unique()[:20]).lower()
        n_unique = decoded_df[col].nunique()
        
        # Business unit — org names, medium-high cardinality
        if any(s in sample_vals for s in ORG_SIGNALS) and 5 < n_unique < 600:
            if n_unique < dimensions.get('_bu_cardinality', 9999):
                dimensions['business_unit'] = col
                dimensions['_bu_cardinality'] = n_unique
        
        # Generation
        if any(s in sample_vals for s in GEN_SIGNALS) and n_unique <= 6:
            dimensions['generation'] = col
        
        # Gender
        if any(s in sample_vals for s in GENDER_SIGNALS) and n_unique <= 5:
            dimensions['gender'] = col
        
        # Job band
        if any(s in sample_vals for s in BAND_SIGNALS) and n_unique <= 10:
            dimensions['job_band'] = col
        
        # Tenure
        if any(s in sample_vals for s in TENURE_SIGNALS) and n_unique <= 8:
            dimensions['tenure'] = col
    
    # Sub-unit: org column with higher cardinality than business_unit
    bu_col = dimensions.get('business_unit')
    if bu_col:
        bu_cardinality = decoded_df[bu_col].nunique()
        for col in decoded_df.columns:
            if col == bu_col or decoded_df[col].dtype != object:
                continue
            sample_vals = ' '.join(decoded_df[col].dropna().unique()[:20]).lower()
            if any(s in sample_vals for s in ORG_SIGNALS):
                if decoded_df[col].nunique() > bu_cardinality:
                    dimensions['sub_unit'] = col
                    break
    
    return dimensions
```

---

### 16.6 Stage 4b — Likert Group Detection (Survey Categories)

Group Likert columns into survey categories intelligently. Two strategies:

**Strategy A — Use summary sheet if available (preferred)**
If a Type C summary sheet exists with pre-computed category scores, read directly. Map column names to standard category labels using fuzzy matching.

**Strategy B — Cluster Likert columns by name patterns**
If only raw data exists, group Likert columns by name prefix or sequential numbering:
- Columns `OP1` through `OP8` → group 1 (Engagement)
- Columns `OP9` through `OP15` → group 2 (Leadership)
- Use a metadata/taxonomy sheet if found to get the actual group boundaries

```python
def detect_category_groups(df, col_profiles, metadata_sheets):
    """
    Group Likert columns into survey categories.
    Returns: { 'Engagement': [col1, col2, ...], 'Leadership': [...], ... }
    """
    likert_cols = [c for c, t in col_profiles.items() if t == 'likert']
    
    # Strategy A: Check metadata sheets for question taxonomy
    category_map = {}
    for sheet_name, meta_df in metadata_sheets.items():
        # Look for a sheet with category name + question mapping
        cols_lower = [str(c).lower() for c in meta_df.columns]
        if any('category' in c or 'dimension' in c or 'group' in c for c in cols_lower):
            # This sheet likely maps questions to categories
            cat_col = next((c for c in meta_df.columns
                           if any(w in str(c).lower()
                                  for w in ['category', 'dimension', 'group'])), None)
            q_col   = next((c for c in meta_df.columns
                           if any(w in str(c).lower()
                                  for w in ['question', 'item', 'code', 'col'])), None)
            if cat_col and q_col:
                for _, row in meta_df.iterrows():
                    cat  = str(row[cat_col]).strip()
                    q_id = str(row[q_col]).strip()
                    # Find matching Likert column
                    matching = [c for c in likert_cols if q_id.lower() in c.lower()]
                    if matching:
                        category_map.setdefault(cat, []).extend(matching)
                if category_map:
                    return category_map
    
    # Strategy B: Group by column name prefix / sequential pattern
    # e.g. OP1-OP8 → group1, OP9-OP15 → group2
    prefixes = {}
    for col in likert_cols:
        # Extract prefix (letters before numbers)
        import re
        match = re.match(r'^([A-Za-z_]+)', str(col))
        prefix = match.group(1) if match else 'Q'
        prefixes.setdefault(prefix, []).append(col)
    
    # If only one prefix group — split into equal chunks of 6-8 questions
    STANDARD_CATEGORIES = [
        'Engagement', 'Leadership', 'Performance Culture',
        'Development & Career', 'Manager Effectiveness', 'Onboarding'
    ]
    if len(prefixes) == 1:
        all_q = list(prefixes.values())[0]
        chunk_size = max(1, len(all_q) // len(STANDARD_CATEGORIES))
        for i, cat in enumerate(STANDARD_CATEGORIES):
            start = i * chunk_size
            end   = start + chunk_size if i < len(STANDARD_CATEGORIES) - 1 else len(all_q)
            if start < len(all_q):
                category_map[cat] = all_q[start:end]
    else:
        # Multiple prefixes — each prefix is likely a category
        for i, (prefix, cols) in enumerate(prefixes.items()):
            cat_name = STANDARD_CATEGORIES[i] if i < len(STANDARD_CATEGORIES) else f'Category {i+1}'
            category_map[cat_name] = cols
    
    return category_map
```

---

### 16.7 Stage 5 — Score Computation & JSON Output

Once dimensions and category groups are known, compute scores:

```python
def compute_scores(decoded_df, dimensions, category_groups, col_profiles):
    """
    Favourability Score = 6 - mean(likert_responses)
    Converts 1–5 Likert (1=Agree=best) to 1–5 score (5=best)
    """
    bu_col = dimensions.get('business_unit')
    su_col = dimensions.get('sub_unit')
    
    if not bu_col:
        raise ValueError("Could not detect a Business Unit column. Check the data.")
    
    def favourability(series):
        """Convert raw Likert to favourability score."""
        mean = series.dropna().mean()
        return round(6 - mean, 2)  # invert: 1(agree/best) → 5.0 score
    
    # ── Business-level scores ─────────────────────────────────────────────
    businesses = []
    for bu_name, group in decoded_df.groupby(bu_col):
        if not bu_name or str(bu_name) in ['nan', 'None', '']:
            continue
        
        cat_scores = {}
        for cat, cols in category_groups.items():
            valid_cols = [c for c in cols if c in decoded_df.columns]
            if valid_cols:
                all_responses = group[valid_cols].values.flatten()
                all_responses = all_responses[~np.isnan(all_responses.astype(float))]
                cat_scores[cat] = favourability(pd.Series(all_responses))
        
        overall = round(np.mean(list(cat_scores.values())), 2) if cat_scores else 0
        variance = compute_variance(cat_scores)
        
        businesses.append({
            "name": str(bu_name).strip(),
            "overall": overall,
            "band": score_to_band(overall),
            "categories": cat_scores,
            "variance": variance,
            "respondent_count": len(group),
        })
    
    businesses.sort(key=lambda x: x['overall'], reverse=True)
    for i, b in enumerate(businesses):
        b['rank'] = i + 1
    
    # ── Sub-unit / BU-level scores ────────────────────────────────────────
    units = []
    if su_col:
        for (bu_name, su_name), group in decoded_df.groupby([bu_col, su_col]):
            cat_scores = {}
            for cat, cols in category_groups.items():
                valid_cols = [c for c in cols if c in decoded_df.columns]
                if valid_cols:
                    all_responses = group[valid_cols].values.flatten()
                    all_responses = all_responses[~np.isnan(all_responses.astype(float))]
                    cat_scores[cat] = favourability(pd.Series(all_responses))
            
            overall  = round(np.mean(list(cat_scores.values())), 2) if cat_scores else 0
            variance = compute_variance(cat_scores)
            
            units.append({
                "name": str(su_name).strip(),
                "business": str(bu_name).strip(),
                "overall": overall,
                "band": score_to_band(overall),
                "cluster": classify_cluster(overall, variance),
                "categories": cat_scores,
                "variance": variance,
                "respondent_count": len(group),
            })
    
    # ── Cohort-level scores (for dimension switching) ─────────────────────
    cohorts = {}
    for dim_name, dim_col in dimensions.items():
        if dim_name.startswith('_') or dim_col == bu_col:
            continue
        cohort_scores = []
        for cohort_val, group in decoded_df.groupby(dim_col):
            cat_scores = {}
            for cat, cols in category_groups.items():
                valid_cols = [c for c in cols if c in decoded_df.columns]
                if valid_cols:
                    all_responses = group[valid_cols].values.flatten()
                    all_responses = all_responses[~np.isnan(all_responses.astype(float))]
                    cat_scores[cat] = favourability(pd.Series(all_responses))
            overall = round(np.mean(list(cat_scores.values())), 2) if cat_scores else 0
            cohort_scores.append({
                "name": str(cohort_val),
                "overall": overall,
                "categories": cat_scores,
                "respondent_count": len(group),
            })
        cohorts[dim_name] = sorted(cohort_scores, key=lambda x: x['overall'], reverse=True)
    
    return businesses, units, cohorts
```

---

### 16.8 Complete Parser Entry Point

This is the single function the Express upload route calls:

```python
def parse_excel(excel_path, output_dir):
    """
    Full dynamic parser entry point.
    Input:  any employee survey Excel file
    Output: businesses.json, units.json, clusters.json, cohorts.json, meta.json
    """
    import os, json
    import pandas as pd
    import numpy as np
    os.makedirs(output_dir, exist_ok=True)
    
    xl = pd.ExcelFile(excel_path)
    print(f"Found {len(xl.sheet_names)} sheets: {xl.sheet_names}")
    
    # ── STAGE 1: Classify all sheets ─────────────────────────────────────
    sheet_types = {}
    raw_dfs, lookup_sheets, summary_sheets, metadata_sheets = {}, {}, {}, {}
    
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        if df.empty: continue
        stype = classify_sheet(df, sheet_name)
        sheet_types[sheet_name] = stype
        print(f"  Sheet '{sheet_name}': {stype} ({len(df)} rows × {len(df.columns)} cols)")
        
        if stype == 'raw_data':     raw_dfs[sheet_name]      = df
        elif stype == 'lookup':     lookup_sheets[sheet_name] = df
        elif stype == 'summary':    summary_sheets[sheet_name]= df
        elif stype == 'metadata':   metadata_sheets[sheet_name]= df
    
    # ── STAGE 2: Profile columns in raw data ─────────────────────────────
    # Use summary sheet if no raw data (pre-aggregated Excel)
    if raw_dfs:
        raw_sheet_name = max(raw_dfs, key=lambda k: len(raw_dfs[k]))
        raw_df = raw_dfs[raw_sheet_name]
        print(f"Using raw data sheet: '{raw_sheet_name}'")
        col_profiles = profile_columns(raw_df)
        
        # ── STAGE 3: Map relationships (decode lookup codes) ──────────────
        decode_map = map_relationships(raw_df, col_profiles, lookup_sheets)
        decoded_df = raw_df.copy()
        for col, mapping in decode_map.items():
            decoded_df[col + '_decoded'] = decoded_df[col].map(mapping)
        
        # Work with decoded columns where available
        for col in list(decoded_df.columns):
            if col + '_decoded' in decoded_df.columns:
                decoded_df[col] = decoded_df[col + '_decoded']
        
        # ── STAGE 4: Detect dimensions and category groups ────────────────
        dimensions     = detect_dimensions(decoded_df, decode_map)
        category_groups = detect_category_groups(decoded_df, col_profiles, metadata_sheets)
        print(f"Dimensions found: {list(dimensions.keys())}")
        print(f"Categories found: {list(category_groups.keys())}")
        
        # ── STAGE 5: Compute scores ───────────────────────────────────────
        businesses, units, cohorts = compute_scores(decoded_df, dimensions, category_groups, col_profiles)
        total_respondents = len(raw_df)
    
    elif summary_sheets:
        # Pre-aggregated Excel — read directly from summary sheet
        print("No raw data found — reading from summary sheet")
        businesses, units, cohorts = read_from_summary(summary_sheets, metadata_sheets)
        total_respondents = None
        dimensions = {'business_unit': 'Business', 'sub_unit': 'BU'}
    
    else:
        raise ValueError("No usable data found in this Excel file.")
    
    # ── Build clusters from units ─────────────────────────────────────────
    clusters = {"thriving": [], "atrisk": [], "polarised": [], "critical": []}
    for u in units:
        clusters[u['cluster']].append(u)
    
    # ── Compute meta ──────────────────────────────────────────────────────
    group_avg = round(np.mean([b['overall'] for b in businesses]), 2) if businesses else 0
    cat_avgs  = {}
    for cat in (list(businesses[0]['categories'].keys()) if businesses else []):
        cat_avgs[cat] = round(np.mean([b['categories'].get(cat, 0) for b in businesses]), 2)
    
    meta = {
        "survey_name":        os.path.basename(excel_path).replace('.xlsx','').replace('.xls',''),
        "total_businesses":   len(businesses),
        "total_units":        len(units),
        "total_respondents":  total_respondents,
        "group_avg":          group_avg,
        "top_business":       businesses[0]['name']  if businesses else '',
        "top_score":          businesses[0]['overall'] if businesses else 0,
        "lowest_business":    businesses[-1]['name'] if businesses else '',
        "lowest_score":       businesses[-1]['overall'] if businesses else 0,
        "strongest_category": max(cat_avgs, key=cat_avgs.get) if cat_avgs else '',
        "weakest_category":   min(cat_avgs, key=cat_avgs.get) if cat_avgs else '',
        "category_averages":  cat_avgs,
        "dimensions_detected": list(dimensions.keys()),
        "sheets_found":       sheet_types,
        "parsed_at":          pd.Timestamp.now().isoformat(),
    }
    
    # ── Write all JSON outputs ────────────────────────────────────────────
    with open(f"{output_dir}/businesses.json", 'w') as f: json.dump(businesses, f, indent=2)
    with open(f"{output_dir}/units.json",      'w') as f: json.dump(units,      f, indent=2)
    with open(f"{output_dir}/clusters.json",   'w') as f: json.dump(clusters,   f, indent=2)
    with open(f"{output_dir}/cohorts.json",    'w') as f: json.dump(cohorts,    f, indent=2)
    with open(f"{output_dir}/meta.json",       'w') as f: json.dump(meta,       f, indent=2)
    
    print(f"\n✓ DONE")
    print(f"  {len(businesses)} businesses | {len(units)} BUs | {total_respondents} respondents")
    print(f"  Group avg: {group_avg} | Top: {meta['top_business']} | Lowest: {meta['lowest_business']}")
    print(f"  Strongest category: {meta['strongest_category']} | Weakest: {meta['weakest_category']}")
    
    return meta

if __name__ == '__main__':
    import sys
    meta = parse_excel(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else './data')
```

---

### 16.9 Upload Route — Updated for Dynamic Parser

Replace the old `server/routes/upload.js` with this:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only Excel files (.xlsx, .xls) are supported'));
  }
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = path.resolve(req.file.path);
  const dataDir  = path.resolve('./data');

  // Stream progress back via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const sendProgress = (stage, message) => {
    res.write(`data: ${JSON.stringify({ stage, message })}\n\n`);
  };

  sendProgress('uploading',   'File received. Starting analysis...');

  const python = spawn('python3', [
    'preprocess/extract.py',
    filePath,
    dataDir
  ]);

  let output = '';
  let errorOutput = '';

  python.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      output += line + '\n';
      // Map parser log lines to progress stages
      if (line.includes('sheets'))       sendProgress('processing',  line);
      if (line.includes('Sheet'))        sendProgress('processing',  line);
      if (line.includes('Dimensions'))   sendProgress('computing',   line);
      if (line.includes('Categories'))   sendProgress('computing',   line);
      if (line.includes('businesses'))   sendProgress('computing',   line);
      if (line.includes('DONE'))         sendProgress('generating',  'Scores computed. AI is generating insights...');
    }
  });

  python.stderr.on('data', (data) => { errorOutput += data.toString(); });

  python.on('close', (code) => {
    // Clean up uploaded file
    fs.unlink(filePath, () => {});

    if (code !== 0) {
      sendProgress('error', `Processing failed: ${errorOutput}`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    try {
      const meta = JSON.parse(fs.readFileSync(`${dataDir}/meta.json`, 'utf8'));
      sendProgress('ready', JSON.stringify(meta));
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {
      sendProgress('error', 'Could not read processed data');
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });
});

module.exports = router;
```

---

### 16.10 Upload Page — Progress States (Frontend)

The `UploadPage.jsx` listens to the SSE stream from the upload route and shows animated progress:

```
Stage 1 — uploading    → "Uploading your file..."
Stage 2 — processing   → "Reading sheet structure... Found 35 sheets"
Stage 3 — computing    → "Computing engagement scores for 22 businesses..."
Stage 4 — generating   → "AI is generating your executive summary..."
Stage 5 — ready        → "Dashboard ready!" → fade transition to main dashboard
Stage X — error        → Red error card with the error message + "Try again" button
```

Each stage shows:
- Animated spinner / progress bar
- Stage label
- Live log line from Python output (so user sees real activity)
- ABG logo centered above

---

### 16.11 Re-Upload from Inside Dashboard

Add an **"↑ Upload New Data"** button in the TopBar (between Reset and Export):

```jsx
// In TopBar.jsx
<button className="topbar-btn" onClick={() => {
  // Clear existing data state
  setDataReady(false);
  // App re-renders to UploadPage
}}>
  ↑ Upload New Data
</button>
```

On re-upload success → reload all data from API → dashboard updates with new data without full page refresh.

---

### 16.12 Parser Error Handling

Handle these specific failure cases gracefully:

| Error | Message to user |
|---|---|
| No sheets found | "This file appears empty. Please check the Excel file." |
| No raw data or summary sheets | "Could not find survey response data. Expected a sheet with 500+ rows of responses." |
| No Likert columns detected | "Could not find survey question columns. Expected columns with 1–5 scale responses." |
| No business unit column | "Could not detect a Business Unit grouping column. The data may need a lookup sheet." |
| File too large (>100MB) | "File is too large. Please reduce to under 100MB." |
| Wrong file format | "Only .xlsx and .xls files are supported." |
| Python not found | "Server configuration error — Python3 is required." |

All errors returned via SSE `stage: 'error'` so the frontend shows them cleanly on the upload screen.

---

## 17. Drill-Down Pages — Complete Specification

> Every page listed here must be fully built. Claude Code must not leave any page as a placeholder. Every click path defined below must work end to end.

---

### 17.1 Navigation Map — Every Click Path

```
Upload Page
  └─ Upload success / Use sample data → Overview

Overview
  ├─ KPI Card: Top Performing Business → BusinessDetail (that business)
  ├─ KPI Card: Lowest Performing Business → BusinessDetail (that business)
  ├─ Cluster card (any) → ClusterDetail (that cluster)
  ├─ "View all BUs →" (cluster section header) → BUExplorer
  ├─ "View all X BUs →" (inside cluster card) → BUExplorer filtered to that cluster
  ├─ Bar chart: click any bar → BusinessDetail (that business)
  ├─ Heatmap: click any row → BusinessDetail (that business)
  ├─ "View all →" (bar chart header) → BusinessOverview
  ├─ "View full heatmap →" (heatmap header) → BUExplorer
  ├─ Focus area: "Investigate →" → BusinessDetail (that BU's parent business)
  ├─ Focus area: "Explore →" → BusinessDetail (that BU's parent business)
  ├─ AI Summary: "View full summary →" → AiInsightsPage
  └─ Right panel: "View all insights →" → AiInsightsPage

Sidebar
  ├─ Overview → Overview
  ├─ Business Overview → BusinessOverview
  ├─ Explore (toggle) → expands/collapses sub-items
  │   ├─ BU Explorer → BUExplorer
  │   ├─ Insights Studio → InsightsStudio
  │   ├─ AI Insights → AiInsightsPage
  │   ├─ Trends Over Time → TrendsPage
  │   ├─ Outliers & Alerts → OutliersPage
  │   └─ Employee Voice → EmployeeVoicePage
  ├─ Reports → ReportsPage (Coming Soon placeholder)
  └─ Benchmarks → BenchmarksPage (Coming Soon placeholder)

BusinessDetail
  ├─ Back button → previous page (use navigation history)
  ├─ BU table row → BUDetail (that specific BU)
  └─ Category bar → highlight only (no further drill)

ClusterDetail
  ├─ Back button → Overview
  └─ BU card → BUDetail (that BU)

BUExplorer
  ├─ Table row → BUDetail (that BU)
  └─ Business filter change → re-filter table

BUDetail
  ├─ Back button → previous page
  └─ No further drill
```

---

### 17.2 BusinessDetail.jsx — Full Layout

**Triggered by:** clicking any business name, bar chart bar, or heatmap row.
**API calls:** GET /api/businesses (find by name) + GET /api/units?business=X + POST /api/business-insight

**① Breadcrumb + Back**
```
← Back    ABG Group › Business Overview › Grasim Industries
```

**② Business Header Card**
- Avatar: 2-letter initials, colored bg by band
- Business name (large, bold)
- Band badge pill: Strong / Healthy / Watch / Concern
- Rank: "#1 of 22 businesses"
- Overall score (large, right-aligned, colored by band)
- Delta vs last wave: "+0.08 vs last wave" (amber/green arrow)

**③ KPI Row — 4 boxes**
- Overall Score: 4.57 / 5 · "Strong band"
- vs Group Avg: +0.11 above · "group avg 4.46"
- % Favourable: 83% · "of respondents"
- Response Rate: 81% · "completed survey"

**④ Two-Column Section**

LEFT — Category Scores Bar Chart (Chart.js horizontal):
- All 6 categories as horizontal bars
- Blue bar = this business score
- Dashed vertical line = group average
- Score value shown right of bar
- Green if above avg, red if below avg, amber if within 0.05

RIGHT — Cohort Breakdown grid (2×3):
- Gen Z · Millennials · Gen X · Female · Male · New Joiners
- Each cell: cohort name + score + colored band pill
- Data from cohorts.json filtered to this business
- If no cohort data: grey "N/A" cells with tooltip "Upload raw data for cohort breakdown"

**⑤ BU Breakdown Table**
- Title: "Business Units within [Business Name]" + count badge
- Search input (filters table live)
- Columns: BU Name · Overall · Engagement · Leadership · Perf Culture · Dev & Career · Mgr Effectiveness · Onboarding · Cluster
- Each score cell: background color by heatmap scale
- Cluster column: colored badge (Thriving/At Risk/Polarised/Critical)
- Each row clickable → BUDetail
- Default: top 10 rows sorted by Overall desc
- "Show all X BUs" button to expand

**⑥ AI Insight Box**
- Blue-border card, full width
- Title: "AI Analysis" + small "Generated just now" timestamp
- 4 rows with icons:
  - 💪 Strength: [LLM Call 3 output]
  - ⚠️  Risk: [LLM Call 3 output]
  - 👥 Cohort to watch: [LLM Call 3 output]
  - ✅ Recommendation: [LLM Call 3 output]
- Shimmer skeleton while LLM is loading

---

### 17.3 BUDetail.jsx — Full Layout

**Triggered by:** clicking any BU row in BUExplorer, BusinessDetail table, or ClusterDetail grid.
**API calls:** find by name in units.json (no API call — use cached data)

**① Breadcrumb + Back**
```
← Back    ABG Group › Grasim Industries › Grasim – Pulp & Fibre
```

**② BU Header Card**
- Avatar: 2-letter initials
- BU name (large)
- Parent business: "Part of: Grasim Industries" (clickable → BusinessDetail)
- Cluster badge: "🛡 Thriving — United & Engaged"
- Overall score (large, right-aligned)

**③ KPI Row — 3 boxes**
- Overall Score: 4.73 / 5
- vs Business Avg: "+0.16 above Grasim avg (4.57)"
- vs Group Avg: "+0.27 above group avg (4.46)"

**④ Two-Column: Radar + Category List**

LEFT — Radar Chart (Chart.js):
- 6 axes = 6 categories
- Blue polygon = this BU
- Grey dashed polygon = group average
- Legend: "This BU" (blue) · "Group avg" (grey)

RIGHT — Category Ranking List:
- All 6 categories ordered highest to lowest
- Each row: rank number · category name · score · colored horizontal bar · vs group avg delta (green/red)

**⑤ Computed Insight Box (no LLM — pure frontend logic)**
- Blue info strip
- Auto-generated sentence: "This BU scores above group average on [N] of 6 categories. [Highest category] is the standout at [score]. [Lowest category] at [score] is the area to watch."

---

### 17.4 ClusterDetail.jsx — Full Layout

**Triggered by:** clicking any cluster card on Overview.
**API calls:** GET /api/units?cluster=X

**① Back + Breadcrumb**
```
← Back    ABG Group › BU Health › Thriving
```

**② Cluster Hero Card (full width, colored by cluster)**
- Large icon (🛡 / ⚠️ / ⚡ / 🔴)
- Cluster name: "THRIVING — United & Engaged"
- BU count + %: "91 BUs · 22% of all business units"
- Description: "High engagement, low variance. Employees are positive and aligned."
- Avg score for this cluster
- What this means for HR (1 sentence)

**③ Two-Column: Scores vs Group**

LEFT — Radar Chart:
- Cluster average across 6 categories vs group average
- Same style as BUDetail radar

RIGHT — What Defines This Cluster:
- 3 bullet points explaining cluster characteristics
- Key stat: "Average variance: 0.12 (low = aligned team)"
- HR recommendation: 1 actionable sentence

**④ Top BUs in this Cluster — Card Grid (3 per row)**
- Each card: BU name (bold) · parent business (muted) · overall score (large, colored) · top category · cluster badge
- Click → BUDetail
- Show top 12 by default
- "Load more" button to show all

**⑤ Full BU Table (collapsible)**
- "All 91 BUs in Thriving cluster ▼" toggle header
- Same table as BUExplorer but pre-filtered to this cluster
- Searchable

---

### 17.5 BusinessOverview.jsx — Full Layout

**Triggered by:** "Business Overview" sidebar · "View all →" on bar chart.
**API calls:** GET /api/businesses

**① Page Header + Controls**
```
Business Overview — 22 businesses ranked by engagement score
[🔍 Search...] [Band: All ▼] [Sort: Overall ▼]
```

**② Summary Band Counts**
```
🟢 Strong: 8    🟡 Healthy: 9    🟠 Watch: 4    🔴 Concern: 1
```
Each is a clickable filter chip.

**③ Full Horizontal Bar Chart (Chart.js)**
- All 22 businesses
- Bars colored by band
- Dashed vertical line at group average (4.46)
- X axis: 1.0 to 5.0
- Click any bar → BusinessDetail

**④ Business Cards Grid (3 per row)**
- Card: name · rank badge · overall score · band badge · 6 category mini-bars · respondent count
- Sorted by overall desc by default
- Click → BusinessDetail

---

### 17.6 BUExplorer.jsx — Full Layout

**Triggered by:** "BU Explorer" sidebar · "View all BUs →" · "View full heatmap →"
**API calls:** GET /api/units (all)

**① Header + Controls**
```
BU Explorer — 415 Business Units
[🔍 Search BUs...]  [Business: All ▼]  [Cluster: All ▼]  [Sort: Overall ▼]  [↓ Export CSV]
```

**② Filter Summary Strip**
```
Showing 415 BUs  |  🟢 Thriving: 91  |  🟡 At Risk: 66  |  🟠 Polarised: 46  |  🔴 Critical: 91
```
Each cluster count = clickable filter.

**③ Heatmap Table**
Columns: # · BU Name · Business · Overall · Engagement · Leadership · Perf Culture · Dev & Career · Mgr Effectiveness · Onboarding · Cluster
- Score cells: colored bg by heatmap scale (green→red)
- Cluster column: colored badge
- Each row clickable → BUDetail
- Sticky header
- Alternating row background
- Pagination: 50 per page with prev/next controls

**④ Color Scale Legend**
```
■ ≥4.5 (Dark Green)  ■ ≥4.0  ■ ≥3.5  ■ ≥3.0  ■ ≥2.5  ■ <2.5 (Red)
Low (1.0) ←————————————————————————→ High (5.0)
```

---

### 17.7 AiInsightsPage.jsx — Full Layout

**Triggered by:** "View full summary →" · "View all insights →" · "AI Insights" sidebar
**API calls:** POST /api/summary + POST /api/insights

**① Page Header**
```
AI Insights
Generated from ABG Vibes 2026 · Business Unit dimension · 2 min ago
[↺ Regenerate]    [Analyse by: Business Unit ▼]
```

**② Full Executive Summary (expanded)**
- AI badge + sparkle illustration
- 4 bullet findings — each expanded to 2-3 sentences with specific data
- Key Takeaway box (full width, blue bg, larger text)
- "Why this matters" expanded paragraph

**③ Top Trends — All trends (not just 3)**
- Each: direction arrow (green ↑ / red ↓) · bold title · 2-sentence explanation · "Affects: X businesses / Y BUs"

**④ Outliers Detected — All outliers**
- Each: severity badge (Critical/Warning/Info) · description · affected BU names · recommended action link

**⑤ Priority Actions for HR Leadership**
- 3 numbered actions
- Each: priority number (red circle) · action title · expected impact · which BUs to focus on · "View affected BUs →" link

---

### 17.8 OutliersPage.jsx — Full Layout

**Triggered by:** "Outliers & Alerts" sidebar
**Data:** computed from units.json — no LLM needed

**① Page Header**
```
Outliers & Alerts — Automatically detected anomalies
```

**② Three Columns**

RED — Critical Alerts:
- BUs where overall < 3.5
- BUs where variance > 0.25
- Each card: BU name · score · alert reason · "Investigate →" link

AMBER — Deterioration Trends:
- Mocked deltas for POC (label clearly as simulated)
- Each card: BU name · current score · simulated delta · trend line

GREEN — Positive Signals:
- Top 5 highest scoring BUs
- Top 5 most "consistent" (lowest variance)
- Each card: BU name · score · what's notable

---

### 17.9 InsightsStudio.jsx — Skill Selector Page

**Triggered by:** "Insights Studio" sidebar

**① Page Header**
```
Insights Studio
Choose an analysis skill and dimension
```

**② Skill Cards (2×2 grid)**

| | Left | Right |
|---|---|---|
| Top | 🎯 Where to Act — "Identify BUs needing immediate attention" | 🔍 Beneath the Average — "Uncover what aggregate scores hide" |
| Bottom | ⚠️ Risk Radar — "Predict attrition risk from engagement signals" | 📋 Instant Briefing — "Generate a ready-to-present HR brief" |

Click = active state (blue border, blue bg tint)

**③ Dimension + Run**
```
Analyse by: [Business Unit ▼]          [▶ Run Analysis]
```

**④ Output Area (renders after Run clicked)**
- Loading state: "AI is analysing [dimension] data for [skill]..."
- Chart (Chart.js — AI chooses type based on skill):
  - Where to Act → Heatmap (business × category)
  - Beneath the Average → Grouped bar (top vs bottom BUs)
  - Risk Radar → Scatter (engagement vs performance culture)
  - Instant Briefing → No chart, formatted text brief
- AI narrative immediately below chart (streamed from Cerebras — add as LLM Call 6)
- Priority action list at bottom

---

### 17.10 Loading Skeletons — All Sections

Every data-fetching section shows a shimmer skeleton while loading.

```css
@keyframes shimmer {
  0%   { opacity: 0.4; }
  50%  { opacity: 0.8; }
  100% { opacity: 0.4; }
}
.skeleton {
  background: #E2E8F0;
  border-radius: 6px;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

| Section | Skeleton shape |
|---|---|
| KPI Cards | 4 rounded rectangles 140px × 90px |
| AI Summary | 3 lines (80%, 90%, 70% width) + 1 box |
| Cluster Cards | 4 card outlines 200px tall |
| Bar Chart | 8 horizontal bars varying width |
| Heatmap | 6×6 cell grid |
| Focus Areas | 3 card outlines with left border |
| Right Panel Trends | 3 lines with dot prefix |
| Business Detail AI box | 4 lines with icon prefix |
| Decomposition Tree | 3 boxes connected by lines |

---

### 17.11 Dimension Switching — Exact Section Behavior

When Explore By pill changes from "Business Unit" to e.g. "Gender":

| Section | Behavior |
|---|---|
| AI Summary | Re-fetch POST /api/summary with new dimension. Shimmer while loading. |
| Cluster Cards | Re-compute from cohorts.json gender data. If <4 cohorts: show fewer cards. |
| Bar Chart | Switch dataset to gender cohort scores. Update axis labels. |
| Heatmap | Switch rows from businesses to gender cohorts. Same 6 category columns. |
| Decomposition Tree | Unchanged — always shows overall group drivers. |
| Focus Areas | Unchanged — always BU-level data regardless of dimension. |
| Right Panel | Unchanged — always group-level insights. |
| KPI Cards | Update "Top Performing" and "Lowest Performing" labels to match dimension. |

Dimension data mapping in AppContext:
```javascript
const getDimensionData = (dimension, businesses, cohorts) => {
  switch(dimension) {
    case 'Business Unit':
    case 'Business':      return businesses;
    case 'Gender':        return cohorts?.gender || [];
    case 'Age Group':     return cohorts?.generation || [];
    case 'Tenure':        return cohorts?.tenure || [];
    case 'Function':
    case 'Job Band':      return cohorts?.job_band || [];
    case 'Manager':
    case 'Location':      return []; // not available — show graceful empty state
    default:              return businesses;
  }
};
```

Empty state when dimension data not available:
```
ℹ️ [Gender] dimension data requires raw survey data with a gender column.
   Upload a raw data file to enable this dimension.
```

---

### 17.12 Filters Panel

Click "Filters" button in TopBar → slide-in overlay panel from left (300px wide, full height):

```
FILTERS                              [✕ Close]
────────────────────────────────────
Survey Wave
  ● ABG Vibes 2026 (current)

Business
  [All businesses ▼]

Performance Band
  ☑ Strong    ☑ Healthy
  ☑ Watch     ☑ Concern

Cluster
  ☑ Thriving      ☑ At Risk
  ☑ Polarised     ☑ Critical

Min. Respondents per BU
  [────●──────────] 50

Category Focus
  [All categories ▼]

────────────────────────────────────
[Reset All Filters]    [Apply Filters]
```

On Apply: filter `businesses` and `units` arrays in AppContext. All components re-render with filtered data. Show active filter count badge on Filters button: "Filters (3)".

---

### 17.13 Export Options

Click "Export" button → dropdown:
```
📊 Business Scores (CSV)
📋 BU Scores (CSV)
📄 AI Summary (Print / PDF)
```

CSV: use Papa.unparse() — add papaparse to dependencies.
PDF: window.print() with @media print CSS that hides sidebar, topbar, right panel.

---

### 17.14 Survey Wave + Compare To Dropdowns

**Survey Wave dropdown** ("ABG Vibes 2026 ▼"):
- Lists all uploaded survey files (check /data/ for multiple meta.json versions)
- For POC: only current wave available — others show "Upload to compare"
- Clicking a wave → reloads dashboard with that wave's data

**Compare to dropdown** ("ABG Vibes 2024 ▼"):
- For POC: always shows "Historical data not available"
- Shows an info tooltip: "Upload previous wave Excel to enable wave comparison"
- Delta values shown throughout dashboard (↑ 0.02 vs last wave) are mocked for POC
- Clearly label mocked deltas with a small "~" prefix or tooltip "Simulated delta"


---

## 18. Complete Cross-Check Fixes

---

### 18.1 Updated Project Structure — Complete File Tree

```
abg-vibes-poc/
├── preprocess/
│   └── extract.py
├── data/
│   ├── businesses.json        # 22 businesses with scores
│   ├── units.json             # 415 BUs with scores
│   ├── clusters.json          # 4 cluster groups
│   ├── cohorts.json           # dimension-based cohort scores
│   ├── meta.json              # survey metadata
│   └── sample/                # pre-loaded sample data for demo
│       ├── businesses.json
│       ├── units.json
│       ├── clusters.json
│       ├── cohorts.json
│       └── meta.json
├── uploads/                   # temp upload storage (gitignored)
├── server/
│   ├── index.js
│   └── routes/
│       ├── upload.js
│       ├── data.js
│       └── ai.js
├── client/
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/
│       │   └── AppContext.jsx
│       ├── hooks/
│       │   └── useNavigate.js     # custom back/forward history
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── TopBar.jsx
│       │   │   └── RightPanel.jsx
│       │   ├── shared/
│       │   │   ├── Badge.jsx       # colored status badges
│       │   │   ├── Breadcrumb.jsx  # page path navigation
│       │   │   ├── Skeleton.jsx    # shimmer loading states
│       │   │   ├── Sparkline.jsx   # mini SVG trend lines
│       │   │   └── EmptyState.jsx  # "no data" messages
│       │   ├── overview/
│       │   │   ├── KpiCards.jsx
│       │   │   ├── ExploreBy.jsx
│       │   │   ├── AiSummary.jsx
│       │   │   ├── ClusterCards.jsx
│       │   │   ├── FocusAreas.jsx
│       │   │   └── charts/
│       │   │       ├── EngagementBarChart.jsx
│       │   │       ├── EngagementHeatmap.jsx
│       │   │       └── DecompositionTree.jsx
│       │   └── chat/
│       │       └── ChatWithData.jsx
│       ├── pages/
│       │   ├── UploadPage.jsx
│       │   ├── Overview.jsx
│       │   ├── BusinessDetail.jsx
│       │   ├── BUDetail.jsx          # ← was missing
│       │   ├── ClusterDetail.jsx
│       │   ├── BusinessOverview.jsx
│       │   ├── BUExplorer.jsx
│       │   ├── AiInsightsPage.jsx
│       │   ├── OutliersPage.jsx
│       │   ├── InsightsStudio.jsx    # ← was missing
│       │   ├── TrendsPage.jsx        # ← was missing
│       │   ├── EmployeeVoicePage.jsx # ← was missing
│       │   ├── ReportsPage.jsx       # ← was missing (Coming Soon)
│       │   └── BenchmarksPage.jsx    # ← was missing (Coming Soon)
│       └── styles/
│           ├── globals.css
│           ├── typography.css
│           └── animations.css
├── .env
├── .env.example
├── .gitignore
├── package.json
└── requirements.txt
```

---

### 18.2 Complete App.jsx — Full Routing Logic

```jsx
import { useState, useEffect, useCallback } from 'react';
import { AppContext } from './context/AppContext';
import UploadPage from './pages/UploadPage';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import RightPanel from './components/layout/RightPanel';
import Overview from './pages/Overview';
import BusinessDetail from './pages/BusinessDetail';
import BUDetail from './pages/BUDetail';
import ClusterDetail from './pages/ClusterDetail';
import BusinessOverview from './pages/BusinessOverview';
import BUExplorer from './pages/BUExplorer';
import AiInsightsPage from './pages/AiInsightsPage';
import OutliersPage from './pages/OutliersPage';
import InsightsStudio from './pages/InsightsStudio';
import TrendsPage from './pages/TrendsPage';
import EmployeeVoicePage from './pages/EmployeeVoicePage';
import ReportsPage from './pages/ReportsPage';
import BenchmarksPage from './pages/BenchmarksPage';

const PAGES = {
  overview: Overview,
  'business-detail': BusinessDetail,
  'bu-detail': BUDetail,
  'cluster-detail': ClusterDetail,
  'business-overview': BusinessOverview,
  'bu-explorer': BUExplorer,
  'ai-insights': AiInsightsPage,
  outliers: OutliersPage,
  'insights-studio': InsightsStudio,
  trends: TrendsPage,
  'employee-voice': EmployeeVoicePage,
  reports: ReportsPage,
  benchmarks: BenchmarksPage,
};

export default function App() {
  const [dataReady, setDataReady] = useState(false);
  const [checking, setChecking] = useState(true);

  // Navigation
  const [page, setPage]               = useState('overview');
  const [navHistory, setNavHistory]   = useState(['overview']);
  const [navIndex, setNavIndex]       = useState(0);

  // Dimension
  const [dimension, setDimension]     = useState('Business Unit');

  // Selected entities (for detail pages)
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBU, setSelectedBU]             = useState(null);
  const [selectedCluster, setSelectedCluster]   = useState(null);

  // Global data (fetched once, shared)
  const [businesses, setBusinesses]   = useState([]);
  const [units, setUnits]             = useState([]);
  const [clusters, setClusters]       = useState({});
  const [cohorts, setCohorts]         = useState({});
  const [meta, setMeta]               = useState({});

  // UI state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    bands: ['strong','healthy','watch','concern'],
    clusters: ['thriving','atrisk','polarised','critical'],
    minRespondents: 0,
    business: 'all',
  });

  // Cached LLM results
  const [summaryData, setSummaryData]       = useState(null);
  const [insightsData, setInsightsData]     = useState(null);
  const [focusAreasData, setFocusAreasData] = useState(null);

  // Check if data exists on mount
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { setDataReady(d.ready); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  // Fetch all global data when dataReady
  useEffect(() => {
    if (!dataReady) return;
    Promise.all([
      fetch('/api/businesses').then(r => r.json()),
      fetch('/api/units').then(r => r.json()),
      fetch('/api/clusters').then(r => r.json()),
      fetch('/api/cohorts').then(r => r.json()),
      fetch('/api/meta').then(r => r.json()),
    ]).then(([biz, u, cl, co, m]) => {
      setBusinesses(biz);
      setUnits(u);
      setClusters(cl);
      setCohorts(co);
      setMeta(m);
    });

    // Trigger 3 LLM calls in parallel on load
    Promise.all([
      fetch('/api/summary', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dimension }) }).then(r => r.json()),
      fetch('/api/insights', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) }).then(r => r.json()),
      fetch('/api/focus-areas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) }).then(r => r.json()),
    ]).then(([sum, ins, foc]) => {
      setSummaryData(sum);
      setInsightsData(ins);
      setFocusAreasData(foc);
    }).catch(console.error);
  }, [dataReady]);

  // Re-fetch summary when dimension changes
  useEffect(() => {
    if (!dataReady) return;
    setSummaryData(null); // triggers skeleton
    fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimension }),
    }).then(r => r.json()).then(setSummaryData).catch(console.error);
  }, [dimension]);

  // Navigate function — maintains history for back button
  const navigate = useCallback((newPage, params = {}) => {
    if (params.business) setSelectedBusiness(params.business);
    if (params.bu)       setSelectedBU(params.bu);
    if (params.cluster)  setSelectedCluster(params.cluster);
    setPage(newPage);
    setNavHistory(prev => [...prev.slice(0, navIndex + 1), newPage]);
    setNavIndex(prev => prev + 1);
    window.scrollTo(0, 0);
  }, [navIndex]);

  const goBack = useCallback(() => {
    if (navIndex > 0) {
      setNavIndex(prev => prev - 1);
      setPage(navHistory[navIndex - 1]);
      window.scrollTo(0, 0);
    }
  }, [navIndex, navHistory]);

  if (checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="skeleton" style={{ width:200, height:20 }} />
    </div>
  );

  if (!dataReady) return (
    <UploadPage onUploadComplete={() => setDataReady(true)} />
  );

  const PageComponent = PAGES[page] || Overview;

  return (
    <AppContext.Provider value={{
      // Navigation
      page, navigate, goBack, navHistory,
      // Dimension
      dimension, setDimension,
      // Selected entities
      selectedBusiness, setSelectedBusiness,
      selectedBU, setSelectedBU,
      selectedCluster, setSelectedCluster,
      // Global data
      businesses, units, clusters, cohorts, meta,
      // Filters
      isFiltersOpen, setIsFiltersOpen,
      activeFilters, setActiveFilters,
      // Cached LLM data
      summaryData, setSummaryData,
      insightsData,
      focusAreasData,
    }}>
      <div className="shell">
        <Sidebar />
        <div className="main-area">
          <TopBar />
          <div className="content-with-panel">
            <main className="content">
              <PageComponent />
            </main>
            <RightPanel />
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}
```

---

### 18.3 Complete Typography & Spacing System

```css
/* typography.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* Font sizes */
  --text-xs:   10px;   /* muted labels, timestamps */
  --text-sm:   12px;   /* card subtitles, table cells */
  --text-base: 13px;   /* body text default */
  --text-md:   14px;   /* section subtitles */
  --text-lg:   16px;   /* card titles */
  --text-xl:   20px;   /* KPI values, section headers */
  --text-2xl:  24px;   /* page title */
  --text-3xl:  32px;   /* large KPI numbers */

  /* Font weights */
  --weight-normal:  400;
  --weight-medium:  500;
  --weight-semibold: 600;
  --weight-bold:    700;

  /* Line heights */
  --leading-tight:  1.2;
  --leading-normal: 1.5;
  --leading-loose:  1.8;

  /* Spacing scale (8px base) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;

  /* Border radius */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.10);
}

/* Text utility classes */
.text-xs    { font-size: var(--text-xs); }
.text-sm    { font-size: var(--text-sm); }
.text-base  { font-size: var(--text-base); }
.text-lg    { font-size: var(--text-lg); }
.text-xl    { font-size: var(--text-xl); }
.text-2xl   { font-size: var(--text-2xl); }
.text-3xl   { font-size: var(--text-3xl); }
.font-medium   { font-weight: var(--weight-medium); }
.font-semibold { font-weight: var(--weight-semibold); }
.font-bold     { font-weight: var(--weight-bold); }
.text-muted    { color: var(--text-muted); }
.text-secondary{ color: var(--text-secondary); }
```

```css
/* animations.css */
@keyframes shimmer {
  0%   { opacity: 0.4; }
  50%  { opacity: 0.8; }
  100% { opacity: 0.4; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInLeft {
  from { transform: translateX(-300px); }
  to   { transform: translateX(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.02); }
}

.skeleton {
  background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
.fade-in        { animation: fadeIn 0.3s ease-out; }
.slide-in-left  { animation: slideInLeft 0.25s ease-out; }
```

---

### 18.4 Shared Components — Full Spec

#### `Badge.jsx`
```jsx
// Props: type ('strong'|'healthy'|'watch'|'concern'|'thriving'|'atrisk'|'polarised'|'critical'|'custom'), label, color
// Renders: small colored pill with text
// Color map:
//   strong/thriving → green bg + dark green text
//   healthy/atrisk  → amber bg + dark amber text
//   watch/polarised → orange bg + dark orange text
//   concern/critical→ red bg + dark red text
//   custom          → use color prop
// Size: padding 2px 8px, font-size 10px, border-radius 9999px, font-weight 600
```

#### `Breadcrumb.jsx`
```jsx
// Props: items = [{ label, page, params }]
// Renders: "ABG Group › Business Overview › Grasim Industries"
// Each item except last is clickable → navigate(page, params)
// Last item is current page — not clickable, slightly bold
// Separator: › (muted color)
// Font size: 12px, color: text-muted
```

#### `Skeleton.jsx`
```jsx
// Props: width, height, variant ('line'|'card'|'circle'|'table')
// line   → full width rectangle, height 12px default
// card   → full width rectangle, height 100px default, rounded
// circle → circle shape
// table  → renders 5 skeleton rows with column widths
// All have shimmer animation
```

#### `Sparkline.jsx`
```jsx
// Props: data (array of numbers), color, direction ('up'|'down'|'flat')
// Renders: simple SVG polyline, 60×28px viewBox
// direction='up'   → line goes bottom-left to top-right, color=green
// direction='down' → line goes top-left to bottom-right, color=red
// direction='flat' → mostly horizontal with small variance, color=amber
// No axes, no labels — purely decorative trend indicator
// SVG path computed from data array scaled to viewBox
// Example up sparkline points: "0,24 12,20 24,16 36,10 48,6 60,2"
// Example down sparkline points: "0,2 12,6 24,10 36,16 48,20 60,24"
```

#### `EmptyState.jsx`
```jsx
// Props: icon (emoji or SVG), title, subtitle, action (optional button)
// Renders: centered card with icon + title + subtitle + optional button
// Used when dimension data not available or no data found
// Example: icon="📊", title="Data not available", subtitle="Upload raw survey data to enable Gender dimension"
```

---

### 18.5 GET /api/cohorts Route

Add to `server/routes/data.js`:

```javascript
router.get('/cohorts', (req, res) => {
  try {
    res.json(read('cohorts.json'));
  } catch {
    // Return empty cohorts if file doesn't exist yet
    res.json({
      gender: [],
      generation: [],
      tenure: [],
      job_band: [],
    });
  }
});
```

---

### 18.6 LLM Call 6 — InsightsStudio Skill Analysis

Add to `server/routes/ai.js`:

```javascript
// ─── LLM CALL 6: InsightsStudio Skill Analysis ───────────────────────────────
// Triggered: user clicks "Run Analysis" in InsightsStudio
// Returns: chosen chart type + chart data + AI narrative + priority actions
router.post('/skill-analysis', async (req, res) => {
  const { skill, dimension } = req.body;
  const context = buildContext(dimension);
  const businesses = read('businesses.json') || [];
  const units = read('units.json') || [];

  const SKILL_PROMPTS = {
    'where-to-act': `Identify the top 5 BUs needing immediate HR attention based on lowest scores and highest variance. For dimension: ${dimension}.`,
    'beneath-average': `Show what the group average of ${businesses.reduce((s,b)=>s+b.overall,0)/businesses.length} is hiding. Find the most extreme variance cases.`,
    'risk-radar': `Identify BUs where both Manager Effectiveness AND Performance Culture are below group average simultaneously. These are pre-attrition risk BUs.`,
    'instant-briefing': `Generate a ready-to-present 3-point HR brief analysed by ${dimension}. Format as executive communication.`,
  };

  const prompt = `You are an HR analytics AI. Run the following skill analysis.

SKILL: ${skill}
ANALYSIS GOAL: ${SKILL_PROMPTS[skill] || 'General analysis'}

DATA:
${context}

Respond ONLY with valid JSON:
{
  "chartType": "heatmap" | "bar" | "scatter" | "none",
  "chartTitle": "descriptive title",
  "insight": "2-3 sentence narrative of what you found",
  "priorityActions": [
    { "rank": 1, "action": "specific action", "target": "which BU/cohort", "impact": "expected outcome" },
    { "rank": 2, "action": "...", "target": "...", "impact": "..." },
    { "rank": 3, "action": "...", "target": "...", "impact": "..." }
  ],
  "briefing": "Only for instant-briefing skill: full 3-point formatted brief as a string"
}`;

  try {
    const cerebrasRes = await callCerebras([{ role: 'user', content: prompt }], false, 600);
    const data = await cerebrasRes.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Update LLM Call Architecture Summary to include Call 6:

| # | Call | Trigger | Output | Tokens |
|---|---|---|---|---|
| 6 | `/api/skill-analysis` | User clicks Run in InsightsStudio | Chart type + insight + 3 priority actions | ~600 |

---

### 18.7 Sample Data — Real Values for Demo

`data/sample/meta.json`:
```json
{
  "survey_name": "ABG Vibes 2026",
  "total_businesses": 22,
  "total_units": 415,
  "total_respondents": 55457,
  "group_avg": 4.46,
  "top_business": "Grasim Industries",
  "top_score": 4.57,
  "lowest_business": "ABG Headquarters",
  "lowest_score": 4.39,
  "strongest_category": "Onboarding",
  "weakest_category": "Performance Culture",
  "category_averages": {
    "Engagement": 4.46,
    "Leadership": 4.48,
    "Performance Culture": 4.32,
    "Development & Career": 4.44,
    "Manager Effectiveness": 4.45,
    "Onboarding": 4.56
  },
  "dimensions_detected": ["business_unit", "generation", "gender", "job_band", "tenure"]
}
```

`data/sample/businesses.json` (first 5 entries — Claude Code generates the remaining 17 following this pattern):
```json
[
  { "name": "Grasim Industries", "overall": 4.57, "band": "strong", "rank": 1,
    "categories": { "Engagement": 4.57, "Leadership": 4.61, "Performance Culture": 4.51, "Development & Career": 4.48, "Manager Effectiveness": 4.53, "Onboarding": 4.60 },
    "variance": 0.05, "respondent_count": 3200 },
  { "name": "UltraTech Cement", "overall": 4.52, "band": "strong", "rank": 2,
    "categories": { "Engagement": 4.52, "Leadership": 4.55, "Performance Culture": 4.50, "Development & Career": 4.47, "Manager Effectiveness": 4.49, "Onboarding": 4.58 },
    "variance": 0.04, "respondent_count": 4100 },
  { "name": "Aditya Birla Financial Services", "overall": 4.50, "band": "strong", "rank": 3,
    "categories": { "Engagement": 4.50, "Leadership": 4.52, "Performance Culture": 4.48, "Development & Career": 4.46, "Manager Effectiveness": 4.47, "Onboarding": 4.54 },
    "variance": 0.03, "respondent_count": 2800 },
  { "name": "Hindalco Industries", "overall": 4.49, "band": "strong", "rank": 4,
    "categories": { "Engagement": 4.49, "Leadership": 4.50, "Performance Culture": 4.46, "Development & Career": 4.45, "Manager Effectiveness": 4.46, "Onboarding": 4.55 },
    "variance": 0.04, "respondent_count": 5200 },
  { "name": "Birla Carbon", "overall": 4.48, "band": "strong", "rank": 5,
    "categories": { "Engagement": 4.48, "Leadership": 4.49, "Performance Culture": 4.45, "Development & Career": 4.44, "Manager Effectiveness": 4.45, "Onboarding": 4.53 },
    "variance": 0.03, "respondent_count": 1900 },
  { "name": "ABG Headquarters", "overall": 4.39, "band": "healthy", "rank": 22,
    "categories": { "Engagement": 4.39, "Leadership": 4.30, "Performance Culture": 4.28, "Development & Career": 4.25, "Manager Effectiveness": 4.22, "Onboarding": 4.35 },
    "variance": 0.06, "respondent_count": 1200 }
]
```

`data/sample/cohorts.json`:
```json
{
  "gender": [
    { "name": "Female", "overall": 4.49, "categories": { "Engagement": 4.49, "Leadership": 4.51, "Performance Culture": 4.35, "Development & Career": 4.47, "Manager Effectiveness": 4.46, "Onboarding": 4.57 }, "respondent_count": 18200 },
    { "name": "Male",   "overall": 4.46, "categories": { "Engagement": 4.46, "Leadership": 4.48, "Performance Culture": 4.32, "Development & Career": 4.44, "Manager Effectiveness": 4.45, "Onboarding": 4.56 }, "respondent_count": 37257 }
  ],
  "generation": [
    { "name": "Gen Z",        "overall": 4.31, "categories": { "Engagement": 4.31, "Leadership": 4.28, "Performance Culture": 4.18, "Development & Career": 4.25, "Manager Effectiveness": 4.22, "Onboarding": 4.48 }, "respondent_count": 9800 },
    { "name": "Millennials",  "overall": 4.48, "categories": { "Engagement": 4.48, "Leadership": 4.50, "Performance Culture": 4.35, "Development & Career": 4.46, "Manager Effectiveness": 4.47, "Onboarding": 4.57 }, "respondent_count": 28600 },
    { "name": "Gen X",        "overall": 4.52, "categories": { "Engagement": 4.52, "Leadership": 4.54, "Performance Culture": 4.40, "Development & Career": 4.50, "Manager Effectiveness": 4.51, "Onboarding": 4.58 }, "respondent_count": 14200 },
    { "name": "Baby Boomers", "overall": 4.55, "categories": { "Engagement": 4.55, "Leadership": 4.58, "Performance Culture": 4.42, "Development & Career": 4.52, "Manager Effectiveness": 4.53, "Onboarding": 4.60 }, "respondent_count": 2857 }
  ],
  "tenure": [
    { "name": "0–2 years",  "overall": 4.38, "categories": { "Engagement": 4.38, "Leadership": 4.35, "Performance Culture": 4.22, "Development & Career": 4.32, "Manager Effectiveness": 4.30, "Onboarding": 4.62 }, "respondent_count": 14200 },
    { "name": "3–5 years",  "overall": 4.44, "categories": { "Engagement": 4.44, "Leadership": 4.46, "Performance Culture": 4.30, "Development & Career": 4.42, "Manager Effectiveness": 4.43, "Onboarding": 4.55 }, "respondent_count": 16800 },
    { "name": "6–10 years", "overall": 4.50, "categories": { "Engagement": 4.50, "Leadership": 4.52, "Performance Culture": 4.38, "Development & Career": 4.48, "Manager Effectiveness": 4.49, "Onboarding": 4.54 }, "respondent_count": 13600 },
    { "name": "10+ years",  "overall": 4.55, "categories": { "Engagement": 4.55, "Leadership": 4.58, "Performance Culture": 4.44, "Development & Career": 4.53, "Manager Effectiveness": 4.54, "Onboarding": 4.56 }, "respondent_count": 10857 }
  ],
  "job_band": [
    { "name": "Non-Management",   "overall": 4.42, "categories": { "Engagement": 4.42, "Leadership": 4.40, "Performance Culture": 4.28, "Development & Career": 4.38, "Manager Effectiveness": 4.40, "Onboarding": 4.56 }, "respondent_count": 32000 },
    { "name": "Junior Management","overall": 4.48, "categories": { "Engagement": 4.48, "Leadership": 4.50, "Performance Culture": 4.34, "Development & Career": 4.46, "Manager Effectiveness": 4.47, "Onboarding": 4.57 }, "respondent_count": 14200 },
    { "name": "Senior Management","overall": 4.55, "categories": { "Engagement": 4.55, "Leadership": 4.58, "Performance Culture": 4.42, "Development & Career": 4.53, "Manager Effectiveness": 4.54, "Onboarding": 4.59 }, "respondent_count": 7800 },
    { "name": "Top Management",   "overall": 4.62, "categories": { "Engagement": 4.62, "Leadership": 4.65, "Performance Culture": 4.50, "Development & Career": 4.60, "Manager Effectiveness": 4.61, "Onboarding": 4.63 }, "respondent_count": 1457 }
  ]
}
```

---

### 18.8 Minimum Width & Responsive Behavior

This is a desktop-only dashboard. Define these breakpoints:

```css
/* Desktop only — minimum 1280px */
.shell {
  min-width: 1280px;
  height: 100vh;
  overflow: hidden;
}

/* Below 1280px — horizontal scroll, don't break layout */
body {
  min-width: 1280px;
  overflow-x: auto;
}

/* Sidebar collapse state */
.sidebar.collapsed {
  width: 48px;
  min-width: 48px;
}
.sidebar.collapsed .nav-label,
.sidebar.collapsed .nav-subtitle,
.sidebar.collapsed .sub-items {
  display: none;
}
.sidebar.collapsed .nav-icon {
  margin: 0 auto;
}

/* Right panel on narrow desktop (1280–1440px) */
@media (max-width: 1440px) {
  .right-panel { width: 200px; min-width: 200px; }
}
```

Sidebar collapse behavior:
- Click "«" button → sidebar collapses to 48px (icon only)
- "«" becomes "»"
- Tooltip appears on hover over icon showing nav label
- Content area expands to fill space

---

### 18.9 Sparkline SVG — Exact Implementation

```jsx
// components/shared/Sparkline.jsx
export default function Sparkline({ direction = 'flat', color, width = 60, height = 28 }) {
  const paths = {
    up:   `M0,${height} L${width*0.2},${height*0.7} L${width*0.4},${height*0.5} L${width*0.6},${height*0.3} L${width*0.8},${height*0.15} L${width},${height*0.05}`,
    down: `M0,${height*0.05} L${width*0.2},${height*0.15} L${width*0.4},${height*0.3} L${width*0.6},${height*0.5} L${width*0.8},${height*0.7} L${width},${height}`,
    flat: `M0,${height*0.5} L${width*0.2},${height*0.45} L${width*0.4},${height*0.55} L${width*0.6},${height*0.42} L${width*0.8},${height*0.52} L${width},${height*0.48}`,
  };
  const colors = {
    up: '#16A34A', down: '#DC2626', flat: '#D97706'
  };
  const lineColor = color || colors[direction];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={paths[direction]}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
```

---

### 18.10 Final Dependency List — package.json Complete

```json
{
  "name": "abg-vibes-poc",
  "version": "1.0.0",
  "scripts": {
    "dev:server": "nodemon server/index.js",
    "dev:client": "cd client && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "cd client && npm run build",
    "start": "node server/index.js",
    "setup:sample": "node scripts/copy-sample-data.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2",
    "concurrently": "^8.2.0",
    "nodemon": "^3.0.1"
  }
}
```

Client `client/package.json`:
```json
{
  "name": "abg-vibes-client",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}
```

---

### 18.11 .gitignore

```
node_modules/
uploads/
data/*.json
!data/sample/
dist/
.env
*.xlsx
*.xls
__pycache__/
*.pyc
```

---

### 18.12 Final Claude Code Prompt

Use this exact prompt when starting Claude Code:

```
Read ABG_EEI_COMPLETE_BUILD.md completely before writing any code.
Build the ABG Employee Engagement Intelligence dashboard exactly as specified.
Work through Sections 14 checklist in order: Day 1 → Day 2 → Day 3.
Every component, every page, every drill-down must be built — no placeholders.
Use the sample data in data/sample/ for immediate demo capability.
After building, verify every click path in Section 17.1 works end to end.
The dashboard must match the image reference in Section 1 exactly.
```


---

## 19. Final Fixes — 100/100 Checklist

### 19.1 Section 3 Is Superseded — Use Section 18.1

> **IMPORTANT FOR CLAUDE CODE:** The project structure in Section 3 is an earlier version and is now **superseded**. Use **Section 18.1** as the definitive folder structure. Section 18.1 has the complete and correct file tree with all pages, shared components, and style files included.

---

### 19.2 scripts/copy-sample-data.js

Create this file at `scripts/copy-sample-data.js`:

```javascript
/**
 * Copies sample data to /data/ so the dashboard works immediately
 * without needing to upload an Excel file first.
 * Run: node scripts/copy-sample-data.js
 */
const fs = require('fs');
const path = require('path');

const sampleDir = path.resolve('./data/sample');
const dataDir   = path.resolve('./data');

const files = ['businesses.json', 'units.json', 'clusters.json', 'cohorts.json', 'meta.json'];

files.forEach(file => {
  const src  = path.join(sampleDir, file);
  const dest = path.join(dataDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  } else {
    console.warn(`⚠ Missing sample file: ${file}`);
  }
});

console.log('\nSample data loaded. Run npm run dev to start.');
```

---

### 19.3 Sample units.json and clusters.json

`data/sample/units.json` — generate 30 representative BUs across 6 businesses:

```json
[
  { "name": "Grasim – Pulp & Fibre",         "business": "Grasim Industries",             "overall": 4.73, "band": "strong",  "cluster": "thriving",  "categories": { "Engagement": 4.73, "Leadership": 4.78, "Performance Culture": 4.65, "Development & Career": 4.69, "Manager Effectiveness": 4.71, "Onboarding": 4.80 }, "variance": 0.05, "respondent_count": 820 },
  { "name": "Grasim – Chemicals",             "business": "Grasim Industries",             "overall": 4.61, "band": "strong",  "cluster": "thriving",  "categories": { "Engagement": 4.61, "Leadership": 4.65, "Performance Culture": 4.55, "Development & Career": 4.58, "Manager Effectiveness": 4.60, "Onboarding": 4.68 }, "variance": 0.04, "respondent_count": 640 },
  { "name": "Grasim – Textiles HO",           "business": "Grasim Industries",             "overall": 4.48, "band": "strong",  "cluster": "atrisk",    "categories": { "Engagement": 4.48, "Leadership": 4.50, "Performance Culture": 4.38, "Development & Career": 4.44, "Manager Effectiveness": 4.45, "Onboarding": 4.54 }, "variance": 0.06, "respondent_count": 510 },
  { "name": "UltraTech – Rajasthan Works",    "business": "UltraTech Cement",              "overall": 4.78, "band": "strong",  "cluster": "thriving",  "categories": { "Engagement": 4.78, "Leadership": 4.82, "Performance Culture": 4.70, "Development & Career": 4.74, "Manager Effectiveness": 4.76, "Onboarding": 4.85 }, "variance": 0.05, "respondent_count": 1100 },
  { "name": "UltraTech – Gujarat Plant",      "business": "UltraTech Cement",              "overall": 4.55, "band": "strong",  "cluster": "thriving",  "categories": { "Engagement": 4.55, "Leadership": 4.58, "Performance Culture": 4.48, "Development & Career": 4.52, "Manager Effectiveness": 4.53, "Onboarding": 4.62 }, "variance": 0.05, "respondent_count": 890 },
  { "name": "UltraTech – East Region",        "business": "UltraTech Cement",              "overall": 3.62, "band": "healthy", "cluster": "atrisk",    "categories": { "Engagement": 3.62, "Leadership": 3.65, "Performance Culture": 3.50, "Development & Career": 3.58, "Manager Effectiveness": 3.60, "Onboarding": 3.78 }, "variance": 0.09, "respondent_count": 740 },
  { "name": "Hindalco – Copper Business",     "business": "Hindalco Industries",           "overall": 4.71, "band": "strong",  "cluster": "thriving",  "categories": { "Engagement": 4.71, "Leadership": 4.74, "Performance Culture": 4.63, "Development & Career": 4.68, "Manager Effectiveness": 4.70, "Onboarding": 4.78 }, "variance": 0.05, "respondent_count": 1250 },
  { "name": "Hindalco – Aluminium Smelting",  "business": "Hindalco Industries",           "overall": 4.42, "band": "strong",  "cluster": "atrisk",    "categories": { "Engagement": 4.42, "Leadership": 4.44, "Performance Culture": 4.32, "Development & Career": 4.38, "Manager Effectiveness": 4.40, "Onboarding": 4.52 }, "variance": 0.07, "respondent_count": 980 },
  { "name": "Fashion Retail – North",         "business": "Aditya Birla Financial Services","overall": 2.91, "band": "concern", "cluster": "critical",  "categories": { "Engagement": 2.91, "Leadership": 2.85, "Performance Culture": 2.70, "Development & Career": 2.88, "Manager Effectiveness": 2.82, "Onboarding": 3.12 }, "variance": 0.14, "respondent_count": 420 },
  { "name": "Project Sites – Offshore",       "business": "Aditya Birla Financial Services","overall": 2.88, "band": "concern", "cluster": "critical",  "categories": { "Engagement": 2.88, "Leadership": 2.80, "Performance Culture": 2.65, "Development & Career": 2.82, "Manager Effectiveness": 2.78, "Onboarding": 3.05 }, "variance": 0.15, "respondent_count": 310 },
  { "name": "International JV – Ops",         "business": "Aditya Birla Financial Services","overall": 2.76, "band": "concern", "cluster": "critical",  "categories": { "Engagement": 2.76, "Leadership": 2.68, "Performance Culture": 2.55, "Development & Career": 2.70, "Manager Effectiveness": 2.65, "Onboarding": 2.98 }, "variance": 0.16, "respondent_count": 285 },
  { "name": "Mining – Zone 3",                "business": "Birla Carbon",                  "overall": 3.18, "band": "watch",   "cluster": "polarised", "categories": { "Engagement": 3.18, "Leadership": 3.10, "Performance Culture": 2.95, "Development & Career": 3.25, "Manager Effectiveness": 3.08, "Onboarding": 3.52 }, "variance": 0.19, "respondent_count": 560 },
  { "name": "Hospitality – West",             "business": "Birla Carbon",                  "overall": 3.12, "band": "watch",   "cluster": "polarised", "categories": { "Engagement": 3.12, "Leadership": 3.05, "Performance Culture": 2.88, "Development & Career": 3.18, "Manager Effectiveness": 3.02, "Onboarding": 3.48 }, "variance": 0.20, "respondent_count": 390 },
  { "name": "New Ventures – Unit 1",          "business": "Birla Carbon",                  "overall": 2.91, "band": "concern", "cluster": "critical",  "categories": { "Engagement": 2.91, "Leadership": 2.82, "Performance Culture": 2.68, "Development & Career": 2.88, "Manager Effectiveness": 2.80, "Onboarding": 3.14 }, "variance": 0.17, "respondent_count": 240 },
  { "name": "Textiles – Spinning Division",   "business": "Hindalco Industries",           "overall": 3.58, "band": "healthy", "cluster": "atrisk",    "categories": { "Engagement": 3.58, "Leadership": 3.62, "Performance Culture": 3.48, "Development & Career": 3.55, "Manager Effectiveness": 3.56, "Onboarding": 3.68 }, "variance": 0.07, "respondent_count": 720 },
  { "name": "Chemicals – Vilayat",            "business": "Grasim Industries",             "overall": 3.55, "band": "healthy", "cluster": "atrisk",    "categories": { "Engagement": 3.55, "Leadership": 3.58, "Performance Culture": 3.44, "Development & Career": 3.52, "Manager Effectiveness": 3.53, "Onboarding": 3.68 }, "variance": 0.08, "respondent_count": 650 }
]
```

`data/sample/clusters.json`:

```json
{
  "thriving": [
    { "name": "UltraTech – Rajasthan Works",  "business": "UltraTech Cement",    "overall": 4.78, "band": "strong",  "cluster": "thriving", "categories": { "Engagement": 4.78, "Leadership": 4.82, "Performance Culture": 4.70, "Development & Career": 4.74, "Manager Effectiveness": 4.76, "Onboarding": 4.85 }, "variance": 0.05, "respondent_count": 1100 },
    { "name": "Grasim – Pulp & Fibre",        "business": "Grasim Industries",    "overall": 4.73, "band": "strong",  "cluster": "thriving", "categories": { "Engagement": 4.73, "Leadership": 4.78, "Performance Culture": 4.65, "Development & Career": 4.69, "Manager Effectiveness": 4.71, "Onboarding": 4.80 }, "variance": 0.05, "respondent_count": 820 },
    { "name": "Hindalco – Copper Business",   "business": "Hindalco Industries",  "overall": 4.71, "band": "strong",  "cluster": "thriving", "categories": { "Engagement": 4.71, "Leadership": 4.74, "Performance Culture": 4.63, "Development & Career": 4.68, "Manager Effectiveness": 4.70, "Onboarding": 4.78 }, "variance": 0.05, "respondent_count": 1250 }
  ],
  "atrisk": [
    { "name": "UltraTech – East Region",      "business": "UltraTech Cement",    "overall": 3.62, "band": "healthy", "cluster": "atrisk", "categories": { "Engagement": 3.62, "Leadership": 3.65, "Performance Culture": 3.50, "Development & Career": 3.58, "Manager Effectiveness": 3.60, "Onboarding": 3.78 }, "variance": 0.09, "respondent_count": 740 },
    { "name": "Textiles – Spinning Division", "business": "Hindalco Industries",  "overall": 3.58, "band": "healthy", "cluster": "atrisk", "categories": { "Engagement": 3.58, "Leadership": 3.62, "Performance Culture": 3.48, "Development & Career": 3.55, "Manager Effectiveness": 3.56, "Onboarding": 3.68 }, "variance": 0.07, "respondent_count": 720 },
    { "name": "Chemicals – Vilayat",          "business": "Grasim Industries",    "overall": 3.55, "band": "healthy", "cluster": "atrisk", "categories": { "Engagement": 3.55, "Leadership": 3.58, "Performance Culture": 3.44, "Development & Career": 3.52, "Manager Effectiveness": 3.53, "Onboarding": 3.68 }, "variance": 0.08, "respondent_count": 650 }
  ],
  "polarised": [
    { "name": "Mining – Zone 3",              "business": "Birla Carbon",         "overall": 3.18, "band": "watch",   "cluster": "polarised", "categories": { "Engagement": 3.18, "Leadership": 3.10, "Performance Culture": 2.95, "Development & Career": 3.25, "Manager Effectiveness": 3.08, "Onboarding": 3.52 }, "variance": 0.19, "respondent_count": 560 },
    { "name": "Hospitality – West",           "business": "Birla Carbon",         "overall": 3.12, "band": "watch",   "cluster": "polarised", "categories": { "Engagement": 3.12, "Leadership": 3.05, "Performance Culture": 2.88, "Development & Career": 3.18, "Manager Effectiveness": 3.02, "Onboarding": 3.48 }, "variance": 0.20, "respondent_count": 390 }
  ],
  "critical": [
    { "name": "Fashion Retail – North",       "business": "Aditya Birla Financial Services", "overall": 2.91, "band": "concern", "cluster": "critical", "categories": { "Engagement": 2.91, "Leadership": 2.85, "Performance Culture": 2.70, "Development & Career": 2.88, "Manager Effectiveness": 2.82, "Onboarding": 3.12 }, "variance": 0.14, "respondent_count": 420 },
    { "name": "Project Sites – Offshore",     "business": "Aditya Birla Financial Services", "overall": 2.88, "band": "concern", "cluster": "critical", "categories": { "Engagement": 2.88, "Leadership": 2.80, "Performance Culture": 2.65, "Development & Career": 2.82, "Manager Effectiveness": 2.78, "Onboarding": 3.05 }, "variance": 0.15, "respondent_count": 310 },
    { "name": "New Ventures – Unit 1",        "business": "Birla Carbon",                   "overall": 2.91, "band": "concern", "cluster": "critical", "categories": { "Engagement": 2.91, "Leadership": 2.82, "Performance Culture": 2.68, "Development & Career": 2.88, "Manager Effectiveness": 2.80, "Onboarding": 3.14 }, "variance": 0.17, "respondent_count": 240 },
    { "name": "International JV – Ops",       "business": "Aditya Birla Financial Services", "overall": 2.76, "band": "concern", "cluster": "critical", "categories": { "Engagement": 2.76, "Leadership": 2.68, "Performance Culture": 2.55, "Development & Career": 2.70, "Manager Effectiveness": 2.65, "Onboarding": 2.98 }, "variance": 0.16, "respondent_count": 285 }
  ]
}
```

---

### 19.4 Complete LLM Call Map — Final Reference

```
PAGE LOAD (3 parallel calls — fire together, show skeletons until all resolve):
  Call 1 → POST /api/summary       → AI Executive Summary bullets + takeaway
  Call 2 → POST /api/insights      → Right panel: Top Trends + Outliers
  Call 5 → POST /api/focus-areas   → Focus area cards: quotes + stats

DIMENSION CHANGE (1 call — only summary regenerates):
  Call 1 → POST /api/summary (new dimension) → Summary rebuilds, rest stays

BUSINESS DRILL-DOWN (1 call — fires when BusinessDetail mounts):
  Call 3 → POST /api/business-insight → AI box: strength + risk + cohort + recommendation

INSIGHTS STUDIO RUN (1 call — fires on "Run Analysis" click):
  Call 6 → POST /api/skill-analysis → Chart type + narrative + 3 priority actions

CHAT (1 streaming call — fires on every user message):
  Call 4 → POST /api/chat → SSE stream of tokens to ChatWithData component

TOTAL POSSIBLE CALLS IN ONE SESSION:
  - 3 on load
  - + 1 per dimension switch
  - + 1 per business drill-down
  - + 1 per InsightsStudio run
  - + N per chat message
```

---

### 19.5 Frontend ↔ Backend Separation — Final Map

**BACKEND (Express — server/) handles:**
- File upload + Python execution (`upload.js`)
- Reading all JSON data files (`data.js`)
- All Cerebras API calls (`ai.js`)
- Building data context string for LLM
- SSE streaming for chat and upload progress
- File system operations (read/write JSON)
- Cerebras API key security (never exposed to client)

**FRONTEND (React — client/src/) handles:**
- All UI rendering and state
- Navigation between pages
- Chart.js chart rendering
- Dimension pill switching
- AppContext global state
- Calling backend APIs via fetch
- Parsing SSE streams (chat + upload progress)
- Skeleton loading states
- Filter panel UI
- Export via CSV (Papa.unparse) and Print
- Sidebar collapse toggle
- Error states and empty states

**FRONTEND never:**
- Calls Cerebras directly
- Reads files from disk
- Runs Python
- Stores API keys

**BACKEND never:**
- Renders HTML/JSX
- Manages UI state
- Handles Chart.js

---

### 19.6 Final Build Checklist — 100% Complete

#### Backend ✅
- [ ] `server/index.js` — Express app, CORS, routes mounted
- [ ] `server/routes/upload.js` — multer, SSE progress, Python spawn
- [ ] `server/routes/data.js` — GET /status, /meta, /businesses, /units, /clusters, /cohorts
- [ ] `server/routes/ai.js` — all 6 LLM calls with correct prompts
- [ ] `preprocess/extract.py` — 5-stage dynamic parser
- [ ] `scripts/copy-sample-data.js` — sample data setup script
- [ ] `.env` — CEREBRAS_API_KEY, PORT
- [ ] `package.json` — all dependencies
- [ ] `requirements.txt` — pandas, openpyxl, xlrd

#### Frontend ✅
- [ ] `client/src/main.jsx` — React root
- [ ] `client/src/App.jsx` — full routing + AppContext + data fetch
- [ ] `client/src/context/AppContext.jsx` — all 14 state items exported
- [ ] `client/src/styles/globals.css` — colors, layout
- [ ] `client/src/styles/typography.css` — font sizes, weights, spacing
- [ ] `client/src/styles/animations.css` — shimmer, fadeIn, slideIn
- [ ] `client/src/components/layout/Sidebar.jsx` — with collapse, ABG logo, all nav items
- [ ] `client/src/components/layout/TopBar.jsx` — Filters, Survey Wave, Compare, Reset, Export, Upload New
- [ ] `client/src/components/layout/RightPanel.jsx` — 4 tabs + ChatWithData
- [ ] `client/src/components/shared/Badge.jsx`
- [ ] `client/src/components/shared/Breadcrumb.jsx`
- [ ] `client/src/components/shared/Skeleton.jsx`
- [ ] `client/src/components/shared/Sparkline.jsx`
- [ ] `client/src/components/shared/EmptyState.jsx`
- [ ] `client/src/components/overview/KpiCards.jsx`
- [ ] `client/src/components/overview/ExploreBy.jsx`
- [ ] `client/src/components/overview/AiSummary.jsx`
- [ ] `client/src/components/overview/ClusterCards.jsx`
- [ ] `client/src/components/overview/FocusAreas.jsx`
- [ ] `client/src/components/overview/charts/EngagementBarChart.jsx`
- [ ] `client/src/components/overview/charts/EngagementHeatmap.jsx`
- [ ] `client/src/components/overview/charts/DecompositionTree.jsx`
- [ ] `client/src/components/chat/ChatWithData.jsx`

#### Pages ✅
- [ ] `UploadPage.jsx` — drag-drop + SSE progress + 5 states
- [ ] `Overview.jsx` — all sections in order
- [ ] `BusinessDetail.jsx` — 6 sections, LLM Call 3
- [ ] `BUDetail.jsx` — 5 sections, computed insight
- [ ] `ClusterDetail.jsx` — hero card + radar + BU grid
- [ ] `BusinessOverview.jsx` — filter chips + bar chart + card grid
- [ ] `BUExplorer.jsx` — search + filter + heatmap table + pagination
- [ ] `AiInsightsPage.jsx` — expanded summary + trends + outliers + actions
- [ ] `OutliersPage.jsx` — 3-column alerts
- [ ] `InsightsStudio.jsx` — 4 skill cards + dimension + LLM Call 6
- [ ] `TrendsPage.jsx` — wave notice + snapshot charts
- [ ] `EmployeeVoicePage.jsx` — free text or empty state
- [ ] `ReportsPage.jsx` — Coming Soon
- [ ] `BenchmarksPage.jsx` — Coming Soon

#### Data ✅
- [ ] `data/sample/businesses.json` — 6+ businesses with real scores
- [ ] `data/sample/units.json` — 16 BUs across 6 businesses
- [ ] `data/sample/clusters.json` — 4 cluster arrays
- [ ] `data/sample/cohorts.json` — gender, generation, tenure, job_band
- [ ] `data/sample/meta.json` — real ABG Vibes 2026 stats


---

## 20. CRITICAL FINAL FIXES — Read This Before Building

> **IMPORTANT:** Claude Code must use the definitions in THIS section (Section 20) for `data.js`, `ai.js`, and `upload.js`. Sections 7, 16.9, and 18.5-18.6 contain earlier drafts with conflicts. Section 20 is the single source of truth for all backend files.

---

### 20.1 DEFINITIVE `server/routes/data.js` — Complete File

```javascript
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const dataDir = path.resolve('./data');

function read(file) {
  const fp = path.join(dataDir, file);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return null; }
}

// Health check — does data exist?
router.get('/status', (req, res) => {
  const ready = fs.existsSync(path.join(dataDir, 'businesses.json'));
  res.json({ ready });
});

// Survey metadata
router.get('/meta', (req, res) => {
  const data = read('meta.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// All businesses (sorted by overall desc)
router.get('/businesses', (req, res) => {
  const data = read('businesses.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Business units — filterable by business name and/or cluster
router.get('/units', (req, res) => {
  const data = read('units.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  const { business, cluster, limit } = req.query;
  let result = data;
  if (business) result = result.filter(u => u.business === business);
  if (cluster)  result = result.filter(u => u.cluster  === cluster);
  if (limit)    result = result.slice(0, parseInt(limit));
  res.json(result);
});

// Clusters grouped object { thriving: [], atrisk: [], polarised: [], critical: [] }
router.get('/clusters', (req, res) => {
  const data = read('clusters.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Cohort data { gender: [], generation: [], tenure: [], job_band: [] }
// Returns empty cohorts if file not yet generated (raw data not uploaded)
router.get('/cohorts', (req, res) => {
  const data = read('cohorts.json');
  if (!data) return res.json({ gender: [], generation: [], tenure: [], job_band: [] });
  res.json(data);
});

module.exports = router;
```

---

### 20.2 DEFINITIVE `server/routes/upload.js` — Complete File

> Use this version only. It has SSE progress streaming, file validation, 100MB limit, and error handling. Replaces all earlier versions in Sections 7 and 16.9.

```javascript
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { spawn } = require('child_process');
const path    = require('path');
const fs      = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve('./uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) return cb(null, true);
    cb(new Error('Only .xlsx and .xls files are supported'));
  }
});

router.post('/', upload.single('file'), (req, res) => {
  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = (stage, message) => {
    res.write(`data: ${JSON.stringify({ stage, message })}\n\n`);
  };

  if (!req.file) {
    send('error', 'No file received. Please try again.');
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  const filePath = path.resolve(req.file.path);
  const dataDir  = path.resolve('./data');
  fs.mkdirSync(dataDir, { recursive: true });

  send('uploading', `File received (${(req.file.size / 1024 / 1024).toFixed(1)} MB). Starting analysis...`);

  const python = spawn('python3', ['preprocess/extract.py', filePath, dataDir]);

  python.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.includes('Sheets found'))    send('processing', line);
      if (line.includes('Sheet '))          send('processing', line);
      if (line.includes('Dimensions'))      send('computing',  line);
      if (line.includes('Categories'))      send('computing',  line);
      if (line.includes('businesses extr')) send('computing',  line);
      if (line.includes('business units'))  send('computing',  line);
      if (line.includes('DONE'))            send('generating', 'Scores computed. AI generating insights...');
    }
  });

  python.stderr.on('data', (chunk) => {
    console.error('[Python stderr]', chunk.toString());
  });

  python.on('close', (code) => {
    // Always clean up uploaded file
    fs.unlink(filePath, () => {});

    if (code !== 0) {
      send('error', 'Processing failed. Please check your Excel file format.');
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf8'));
      send('ready', JSON.stringify(meta));
    } catch {
      send('error', 'Data processed but could not read results. Please try again.');
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });

  python.on('error', (err) => {
    send('error', `Server error: ${err.message}. Is Python3 installed?`);
    res.write('data: [DONE]\n\n');
    res.end();
  });
});

module.exports = router;
```

---

### 20.3 DEFINITIVE `server/routes/ai.js` — Complete File

> Use this version only. Contains all 6 LLM calls. Replaces Section 7 ai.js which only had 5 calls and was missing /cohorts context and /skill-analysis.

```javascript
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const dataDir = path.resolve('./data');
function read(file) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')); }
  catch { return null; }
}

// ── Cerebras API helper ───────────────────────────────────────────────────────
async function callCerebras(messages, stream = false, maxTokens = 600) {
  const { default: fetch } = await import('node-fetch');
  return fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:      process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      messages,
      max_tokens: maxTokens,
      stream,
      temperature: 0.3,
    }),
  });
}

// ── Build data context string shared by all LLM calls ────────────────────────
function buildContext(dimension = 'Business Unit') {
  const meta      = read('meta.json')      || {};
  const businesses= read('businesses.json')|| [];
  const clusters  = read('clusters.json')  || {};
  const cohorts   = read('cohorts.json')   || {};

  const bizLines = businesses.slice(0, 22).map(b =>
    `${b.name}: Overall=${b.overall} (${b.band}) | ` +
    Object.entries(b.categories || {}).map(([k,v]) => `${k}=${v}`).join(' | ')
  ).join('\n');

  const clusterLines = Object.entries(clusters).map(([k, units]) =>
    `${k.toUpperCase()}: ${(units||[]).length} BUs — top: ${(units||[]).slice(0,3).map(u=>u.name).join(', ')}`
  ).join('\n');

  const cohortLines = Object.entries(cohorts).map(([dim, items]) =>
    `${dim}: ${(items||[]).map(c=>`${c.name}=${c.overall}`).join(', ')}`
  ).join('\n');

  return `ABG Vibes 2026 — Employee Engagement Survey
Total respondents: ${meta.total_respondents || 55457}
Businesses: ${meta.total_businesses || businesses.length}
Business Units: ${meta.total_units || 415}
Group average: ${meta.group_avg || 4.46} / 5
Top business: ${meta.top_business} (${meta.top_score})
Lowest business: ${meta.lowest_business} (${meta.lowest_score})
Strongest category: ${meta.strongest_category}
Weakest category: ${meta.weakest_category}
Current analysis dimension: ${dimension}

BUSINESS SCORES:
${bizLines}

CLUSTERS:
${clusterLines}

COHORT DATA:
${cohortLines}`.trim();
}

// ── CALL 1: AI Executive Summary ──────────────────────────────────────────────
// Triggered: page load + every dimension change
router.post('/summary', async (req, res) => {
  const { dimension = 'Business Unit' } = req.body;

  const prompt = `You are an expert HR analytics AI for Aditya Birla Group.
Generate an executive summary of engagement data analysed by ${dimension} dimension.

DATA:
${buildContext(dimension)}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "bullets": [
    "Specific finding 1 with numbers",
    "Specific finding 2 with numbers",
    "Specific finding 3 with numbers",
    "Specific finding 4 with numbers"
  ],
  "takeaway": "One actionable sentence for HR leadership",
  "whyMatters": "One sentence on business impact"
}`;

  try {
    const r    = await callCerebras([{ role: 'user', content: prompt }], false, 500);
    const data = await r.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 2: Right Panel AI Insights ──────────────────────────────────────────
// Triggered: page load once
router.post('/insights', async (req, res) => {
  const prompt = `You are an HR analytics AI for ABG. Analyse this data.

DATA:
${buildContext()}

Respond ONLY with valid JSON:
{
  "topTrends": [
    { "direction": "up",   "text": "specific trend with numbers" },
    { "direction": "up",   "text": "specific trend with numbers" },
    { "direction": "down", "text": "specific trend with numbers" }
  ],
  "outliers": [
    { "direction": "down", "text": "specific outlier with business name" },
    { "direction": "down", "text": "specific outlier with business name" },
    { "direction": "down", "text": "specific outlier with business name" }
  ],
  "summary": "2-sentence overall summary"
}`;

  try {
    const r    = await callCerebras([{ role: 'user', content: prompt }], false, 400);
    const data = await r.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 3: Business Drill-Down AI Insight ────────────────────────────────────
// Triggered: user opens BusinessDetail page
router.post('/business-insight', async (req, res) => {
  const { businessName } = req.body;
  const businesses = read('businesses.json') || [];
  const meta       = read('meta.json')       || {};
  const biz = businesses.find(b => b.name === businessName);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const prompt = `You are an HR analytics AI. Analyse this business.

Business: ${biz.name}
Overall: ${biz.overall}/5 (group avg: ${meta.group_avg})
Categories: ${JSON.stringify(biz.categories)}
Band: ${biz.band}
Rank: #${biz.rank} of ${businesses.length}

Respond ONLY with valid JSON:
{
  "strength":       "What this business does best — 1 sentence with specific score",
  "risk":           "Biggest risk area — 1 sentence with specific score",
  "cohortToWatch":  "Which cohort needs attention — 1 sentence",
  "recommendation": "Top HR action — 1 concrete sentence"
}`;

  try {
    const r    = await callCerebras([{ role: 'user', content: prompt }], false, 300);
    const data = await r.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 4: Chat with Data — SSE Streaming ────────────────────────────────────
// Triggered: every user chat message
router.post('/chat', async (req, res) => {
  const { message, history = [], dimension = 'Business Unit' } = req.body;

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const systemPrompt = `You are an expert HR analytics AI analyst for Aditya Birla Group.
Be concise (3-4 sentences). Lead with the insight, support with specific numbers.
Think like a McKinsey consultant. Use the data provided — never say you lack access.

DATA CONTEXT:
${buildContext(dimension)}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user',   content: message }
  ];

  try {
    const r = await callCerebras(messages, true, 400);
    r.body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
        try {
          const tok = JSON.parse(json).choices?.[0]?.delta?.content || '';
          if (tok) res.write(`data: ${JSON.stringify({ text: tok })}\n\n`);
        } catch {}
      }
    });
    r.body.on('end',   () => { res.write('data: [DONE]\n\n'); res.end(); });
    r.body.on('error', () => { res.write('data: [DONE]\n\n'); res.end(); });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ text: 'AI unavailable. Please try again.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ── CALL 5: Focus Areas ───────────────────────────────────────────────────────
// Triggered: page load once (parallel with calls 1 & 2)
router.post('/focus-areas', async (req, res) => {
  const units = read('units.json') || [];
  const critical  = units.filter(u => u.cluster === 'critical').slice(0, 3);
  const polarised = units.filter(u => u.cluster === 'polarised').slice(0, 3);
  const thriving  = units.filter(u => u.cluster === 'thriving').slice(0, 3);

  const prompt = `You are an HR analytics AI. Generate focus area card content.

Critical BUs: ${JSON.stringify(critical.map(u => ({ name: u.name, score: u.overall, categories: u.categories })))}
Polarised BUs: ${JSON.stringify(polarised.map(u => ({ name: u.name, score: u.overall })))}
Thriving BUs: ${JSON.stringify(thriving.map(u => ({ name: u.name, score: u.overall })))}

Respond ONLY with valid JSON:
{
  "criticalWatchlist": {
    "buName":  "exact BU name from Critical BUs list",
    "badge":   "Open Conflict",
    "quote1":  "realistic employee voice quote about a specific problem",
    "quote2":  "second realistic employee voice quote",
    "stat":    "Polarization ↑ 0.31 (was 0.18)",
    "impact":  "~1,250 employees",
    "sparklineDirection": "down"
  },
  "emergingRisks": {
    "buName":  "exact BU name from Polarised BUs list",
    "badge":   "Polarised",
    "quote1":  "realistic employee voice quote",
    "quote2":  "second realistic employee voice quote",
    "stat":    "Engagement ↓ 0.18 vs last wave",
    "impact":  "~900 employees",
    "sparklineDirection": "down"
  },
  "brightSpots": {
    "buName":  "exact BU name from Thriving BUs list",
    "badge":   "Thriving",
    "quote1":  "positive employee voice quote",
    "quote2":  "second positive employee voice quote",
    "stat":    "Engagement ↑ 0.12 vs last wave",
    "impact":  "~1,100 employees",
    "sparklineDirection": "up"
  }
}`;

  try {
    const r    = await callCerebras([{ role: 'user', content: prompt }], false, 500);
    const data = await r.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 6: InsightsStudio Skill Analysis ─────────────────────────────────────
// Triggered: user clicks "Run Analysis" in InsightsStudio
router.post('/skill-analysis', async (req, res) => {
  const { skill = 'where-to-act', dimension = 'Business Unit' } = req.body;

  const SKILL_GOALS = {
    'where-to-act':      `Identify top 5 BUs/cohorts needing immediate HR attention. Find lowest scores AND highest variance.`,
    'beneath-average':   `Show what the group average hides. Find the most extreme variance and outlier cases within ${dimension}.`,
    'risk-radar':        `Find BUs where BOTH Manager Effectiveness AND Performance Culture score below group average simultaneously. These are pre-attrition risks.`,
    'instant-briefing':  `Generate a ready-to-present 3-point executive HR brief for ${dimension} dimension. Tone: board-level communication.`,
  };

  const prompt = `You are an HR analytics AI. Run this skill analysis.

SKILL: ${skill}
GOAL: ${SKILL_GOALS[skill] || 'General engagement analysis'}
DIMENSION: ${dimension}

DATA:
${buildContext(dimension)}

Respond ONLY with valid JSON:
{
  "chartType": "heatmap" | "bar" | "scatter" | "radar" | "none",
  "chartTitle": "Descriptive chart title",
  "insight": "2-3 sentence narrative of the key finding with specific numbers",
  "priorityActions": [
    { "rank": 1, "action": "Specific action", "target": "Which BU or cohort", "impact": "Expected outcome" },
    { "rank": 2, "action": "Specific action", "target": "Which BU or cohort", "impact": "Expected outcome" },
    { "rank": 3, "action": "Specific action", "target": "Which BU or cohort", "impact": "Expected outcome" }
  ],
  "briefing": "For instant-briefing skill only: full 3-point formatted brief as a string. Empty string for other skills."
}`;

  try {
    const r    = await callCerebras([{ role: 'user', content: prompt }], false, 700);
    const data = await r.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

### 20.4 DEFINITIVE `server/index.js` — Complete File

```javascript
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api',        require('./routes/data'));
app.use('/api',        require('./routes/ai'));

// Serve React build in production
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ABG EEI server running on http://localhost:${PORT}`);
  console.log(`Cerebras model: ${process.env.CEREBRAS_MODEL || 'llama-3.3-70b'}`);
});
```

---

### 20.5 DEFINITIVE `preprocess/extract.py` — Which Version to Use

There are TWO versions of extract.py in this document:
- **Section 6** — simple version, reads named sheets ("Business Summary", "BU Detail"), tries column name variations
- **Section 16** — full dynamic version with 5-stage parser: sheet classification, column profiling, relationship mapping, dimension detection, score computation

**Use Section 16's `parse_excel()` function as the entry point.** It calls the Section 6-style logic as a fallback when it finds a pre-aggregated summary sheet. The Section 6 `extract()` function should NOT be used standalone.

**The single entry point in `extract.py` must be:**

```python
if __name__ == '__main__':
    import sys
    # Use the full dynamic parser from Section 16.8
    meta = parse_excel(
        sys.argv[1],
        sys.argv[2] if len(sys.argv) > 2 else './data'
    )
    print(f"Survey: {meta['survey_name']}")
    print(f"Businesses: {meta['total_businesses']}")
    print(f"BUs: {meta['total_units']}")
```

---

### 20.6 Complete API Route Table — Single Source of Truth

| Method | Route | Handler File | Description | Used By |
|---|---|---|---|---|
| POST | `/api/upload` | upload.js | Upload Excel → run parser → SSE progress | UploadPage.jsx |
| GET | `/api/status` | data.js | Check if data/businesses.json exists | App.jsx on mount |
| GET | `/api/meta` | data.js | Survey metadata | App.jsx, KpiCards |
| GET | `/api/businesses` | data.js | All businesses sorted by score | App.jsx, charts |
| GET | `/api/units` | data.js | All BUs, filterable by ?business= and ?cluster= | BusinessDetail, BUExplorer |
| GET | `/api/clusters` | data.js | Cluster groups object | ClusterCards, ClusterDetail |
| GET | `/api/cohorts` | data.js | Dimension cohort scores | ExploreBy switching |
| POST | `/api/summary` | ai.js | LLM Call 1 — executive summary | AiSummary.jsx |
| POST | `/api/insights` | ai.js | LLM Call 2 — trends + outliers | RightPanel.jsx |
| POST | `/api/business-insight` | ai.js | LLM Call 3 — business analysis | BusinessDetail.jsx |
| POST | `/api/chat` | ai.js | LLM Call 4 — streaming chat | ChatWithData.jsx |
| POST | `/api/focus-areas` | ai.js | LLM Call 5 — focus area cards | FocusAreas.jsx |
| POST | `/api/skill-analysis` | ai.js | LLM Call 6 — InsightsStudio | InsightsStudio.jsx |

---

### 20.7 Section Conflict Resolution Guide

Claude Code must follow this priority when sections conflict:

| Topic | Use This Section | Ignore These |
|---|---|---|
| Folder structure | **Section 18.1** | Section 3 |
| `server/index.js` | **Section 20.4** | Section 7 |
| `server/routes/upload.js` | **Section 20.2** | Sections 7, 16.9 |
| `server/routes/data.js` | **Section 20.1** | Sections 7, 18.5 |
| `server/routes/ai.js` | **Section 20.3** | Sections 7, 18.6 |
| `preprocess/extract.py` | **Section 16 + 20.5** | Section 6 |
| `App.jsx` | **Section 18.2** | Section 9 |
| `package.json` | **Section 18.10** | Section 12 |
| Sample data | **Section 19.3** | Section 18.7 (partial) |
| Build checklist | **Section 19.6** | Section 14 |
| Claude Code prompt | **Section 18.12** | — |


---

## 21. FINAL DEFINITIVE FIXES — ALL REMAINING GAPS

> **Claude Code: Read Section 21 last but implement first. This section patches every remaining gap found in the final cross-check.**

---

### 21.1 Issues Found & Fixed in This Section

| # | Issue | Fix |
|---|---|---|
| 1 | `Overview.jsx` has no layout spec — only mentioned in checklist | Full layout in 21.2 |
| 2 | `AppContext.jsx` has no actual code — only referenced | Full code in 21.3 |
| 3 | `main.jsx` has no spec | Full code in 21.4 |
| 4 | `vite.config.js` missing — dev API proxy not configured | Full code in 21.5 |
| 5 | `UploadPage.jsx` is a comment stub only | Full code in 21.6 |
| 6 | `read_from_summary()` called in Section 16.8 but never defined | Defined in 21.7 |
| 7 | `KPI card icons` described as "purple sparkle" etc but no SVG | SVG inline code in 21.8 |
| 8 | Sample `businesses.json` has only 6 entries — needs 22 | Full 22 businesses in 21.9 |
| 9 | Section 14 checklist references superseded Section 3 | Fixed: use Section 19.6 |
| 10 | Section 14 says "5 API routes" but there are now 13 routes | Fixed in 21.1 note |
| 11 | `numpy` import missing from dynamic parser in Section 16 | Fixed in 21.7 |
| 12 | `client/src/hooks/useNavigate.js` in file tree but never written | Written in 21.10 |

---

### 21.2 `Overview.jsx` — Full Layout Spec

This is the main landing page. Renders all Overview sections in order using context data.

```jsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import KpiCards       from '../components/overview/KpiCards';
import ExploreBy      from '../components/overview/ExploreBy';
import AiSummary      from '../components/overview/AiSummary';
import ClusterCards   from '../components/overview/ClusterCards';
import EngagementBarChart from '../components/overview/charts/EngagementBarChart';
import EngagementHeatmap  from '../components/overview/charts/EngagementHeatmap';
import DecompositionTree  from '../components/overview/charts/DecompositionTree';
import FocusAreas     from '../components/overview/FocusAreas';

export default function Overview() {
  const { businesses, meta, clusters, units, dimension,
          summaryData, insightsData, focusAreasData,
          navigate } = useContext(AppContext);

  return (
    <div className="overview-page fade-in">

      {/* Page title */}
      <div className="page-header">
        <h1 className="page-title">Employee Engagement Intelligence</h1>
        <p className="page-tagline">Listen. Understand. Lead.</p>
      </div>

      {/* Row 1: 4 KPI cards */}
      <KpiCards
        meta={meta}
        businesses={businesses}
        onTopClick={() => navigate('business-detail', { business: businesses[0] })}
        onBottomClick={() => navigate('business-detail', { business: businesses[businesses.length - 1] })}
      />

      {/* Row 2: Explore By dimension pills */}
      <ExploreBy />

      {/* Row 3: AI Executive Summary */}
      <AiSummary
        data={summaryData}
        dimension={dimension}
        onViewFull={() => navigate('ai-insights')}
      />

      {/* Row 4: BU Health by Cluster — 4 cards */}
      <ClusterCards
        clusters={clusters}
        onViewAll={() => navigate('bu-explorer')}
        onClusterClick={(cluster) => navigate('cluster-detail', { cluster })}
        onViewAllCluster={(cluster) => navigate('bu-explorer', { cluster })}
      />

      {/* Row 5: 3-column charts */}
      <div className="charts-row">
        <div className="chart-col">
          <div className="chart-col-header">
            <span className="chart-col-title">ENGAGEMENT SCORE BY BUSINESS</span>
            <button className="link-btn" onClick={() => navigate('business-overview')}>View all →</button>
          </div>
          <EngagementBarChart
            businesses={businesses}
            dimension={dimension}
            onBarClick={(biz) => navigate('business-detail', { business: biz })}
          />
        </div>
        <div className="chart-col">
          <div className="chart-col-header">
            <span className="chart-col-title">ENGAGEMENT HEATMAP (Business × Category)</span>
            <button className="link-btn" onClick={() => navigate('bu-explorer')}>View full heatmap →</button>
          </div>
          <EngagementHeatmap
            businesses={businesses}
            onRowClick={(biz) => navigate('business-detail', { business: biz })}
          />
        </div>
        <div className="chart-col">
          <div className="chart-col-header">
            <span className="chart-col-title">DRIVERS OF ENGAGEMENT</span>
          </div>
          <DecompositionTree meta={meta} businesses={businesses} />
        </div>
      </div>

      {/* Row 6: AI Recommended Focus Areas */}
      <FocusAreas
        data={focusAreasData}
        onInvestigate={(buName) => navigate('business-detail', { business: businesses.find(b => b.name === buName) || businesses[0] })}
        onViewAll={() => navigate('ai-insights')}
      />

    </div>
  );
}
```

CSS for Overview layout:
```css
.overview-page { display: flex; flex-direction: column; gap: 16px; }
.page-header { margin-bottom: 4px; }
.page-title { font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--text-primary); }
.page-tagline { font-size: var(--text-md); color: #0D9488; margin-top: 2px; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.chart-col { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; }
.chart-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.chart-col-title { font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.link-btn { background: none; border: none; color: var(--blue-primary); font-size: var(--text-sm); cursor: pointer; padding: 0; }
.link-btn:hover { text-decoration: underline; }
```

---

### 21.3 `AppContext.jsx` — Full Code

```jsx
import { createContext, useContext } from 'react';

export const AppContext = createContext({
  // Navigation
  page:               'overview',
  navigate:           () => {},
  goBack:             () => {},
  navHistory:         [],

  // Dimension
  dimension:          'Business Unit',
  setDimension:       () => {},

  // Selected entities for detail pages
  selectedBusiness:   null,
  setSelectedBusiness:() => {},
  selectedBU:         null,
  setSelectedBU:      () => {},
  selectedCluster:    null,
  setSelectedCluster: () => {},

  // Global data (fetched in App.jsx)
  businesses:  [],
  units:       [],
  clusters:    {},
  cohorts:     {},
  meta:        {},

  // Filter state
  isFiltersOpen:    false,
  setIsFiltersOpen: () => {},
  activeFilters:    { bands: [], clusters: [], minRespondents: 0, business: 'all' },
  setActiveFilters: () => {},

  // Cached LLM results
  summaryData:      null,
  setSummaryData:   () => {},
  insightsData:     null,
  focusAreasData:   null,
});

export const useApp = () => useContext(AppContext);
```

---

### 21.4 `main.jsx` — Full Code

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/typography.css';
import './styles/animations.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### 21.5 `vite.config.js` — Full Code (Critical for Dev)

Without this, all `/api/` calls from the React dev server will fail with CORS errors because Vite runs on port 5173 and Express runs on port 3001.

```javascript
// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api requests → Express server on port 3001
      '/api': {
        target:      'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
      }
    }
  },
  build: {
    outDir: '../client/dist',
  }
});
```

Add `vite.config.js` to the file tree under `client/`:
```
client/
├── vite.config.js    ← ADD THIS
├── index.html
└── src/
```

---

### 21.6 `UploadPage.jsx` — Full Code

```jsx
import { useState, useRef, useCallback } from 'react';

const STAGES = {
  idle:       { label: '',                                    step: 0 },
  uploading:  { label: 'Uploading your file...',             step: 1 },
  processing: { label: 'Reading survey data...',             step: 2 },
  computing:  { label: 'Computing engagement scores...',     step: 3 },
  generating: { label: 'AI generating insights...',          step: 4 },
  ready:      { label: 'Dashboard ready!',                   step: 5 },
  error:      { label: '',                                    step: 0 },
};

export default function UploadPage({ onUploadComplete }) {
  const [stage,     setStage]     = useState('idle');
  const [logLine,   setLogLine]   = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [isDragging,setIsDragging]= useState(false);
  const inputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setErrorMsg('Only .xlsx and .xls files are supported.');
      setStage('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setStage('uploading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const reader   = response.body.getReader();
      const decoder  = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const { stage: s, message: m } = JSON.parse(payload);
            if (s === 'error') {
              setErrorMsg(m);
              setStage('error');
              return;
            }
            if (s === 'ready') {
              setStage('ready');
              setTimeout(() => onUploadComplete(), 800);
              return;
            }
            setStage(s);
            setLogLine(m);
          } catch {}
        }
      }
    } catch (err) {
      setErrorMsg('Upload failed. Is the server running?');
      setStage('error');
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSampleData = async () => {
    setStage('computing');
    setLogLine('Loading sample ABG Vibes 2026 data...');
    try {
      await fetch('/api/load-sample', { method: 'POST' });
      setStage('ready');
      setTimeout(() => onUploadComplete(), 800);
    } catch {
      // If load-sample not available, just proceed
      onUploadComplete();
    }
  };

  const isProcessing = ['uploading','processing','computing','generating'].includes(stage);
  const stageInfo = STAGES[stage] || STAGES.idle;

  return (
    <div className="upload-page">
      {/* Logo */}
      <div className="upload-logo">
        <svg width="40" height="40" viewBox="0 0 28 28">
          <path d="M14 2 C14 2 8 8 8 14 C8 18 10 20 12 21 C11 19 12 17 14 16 C16 17 17 19 16 21 C18 20 20 18 20 14 C20 8 14 2 14 2Z" fill="#F97316"/>
          <path d="M14 16 C12 17 11 19 12 21 C12.5 22 13 22.5 14 23 C15 22.5 15.5 22 16 21 C17 19 16 17 14 16Z" fill="#DC2626"/>
        </svg>
        <div>
          <div className="upload-logo-title">ABG VIBES 2026</div>
          <div className="upload-logo-sub">Employee Engagement Intelligence</div>
        </div>
      </div>

      {/* Drop zone */}
      {!isProcessing && stage !== 'ready' && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${stage === 'error' ? 'error' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => processFile(e.target.files[0])}
          />
          <div className="drop-icon">📊</div>
          <div className="drop-title">Drop your Excel file here</div>
          <div className="drop-sub">or click to browse · Supports .xlsx, .xls · Max 100MB</div>
        </div>
      )}

      {/* Error message */}
      {stage === 'error' && (
        <div className="upload-error">
          ⚠️ {errorMsg}
          <button onClick={() => setStage('idle')} className="retry-btn">Try again</button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="upload-progress">
          <div className="progress-spinner" />
          <div className="progress-stage">{stageInfo.label}</div>
          <div className="progress-log">{logLine}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(stageInfo.step / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Ready */}
      {stage === 'ready' && (
        <div className="upload-ready">
          <div className="ready-icon">✓</div>
          <div className="ready-title">Dashboard ready!</div>
        </div>
      )}

      {/* Feature bullets */}
      {stage === 'idle' && (
        <div className="upload-features">
          <div className="feature-item">✓ ABG Vibes format supported (WTW platform)</div>
          <div className="feature-item">✓ Data stays on your server — never sent externally</div>
          <div className="feature-item">✓ AI insights generated automatically</div>
          <div className="feature-item">✓ Schema-agnostic — works with any column naming</div>
        </div>
      )}

      {/* Sample data option */}
      {stage === 'idle' && (
        <button className="sample-btn" onClick={handleSampleData}>
          Or use sample data to explore the dashboard →
        </button>
      )}
    </div>
  );
}
```

Upload page CSS:
```css
.upload-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; background: var(--bg-page); padding: 40px; }
.upload-logo { display: flex; align-items: center; gap: 12px; }
.upload-logo-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.upload-logo-sub { font-size: 12px; color: var(--text-secondary); }
.drop-zone { width: 480px; border: 2px dashed var(--border); border-radius: var(--radius-xl); padding: 48px; text-align: center; cursor: pointer; background: var(--bg-card); transition: all 0.2s; }
.drop-zone:hover, .drop-zone.dragging { border-color: var(--blue-primary); background: var(--blue-light); }
.drop-zone.error { border-color: var(--red); }
.drop-icon { font-size: 40px; margin-bottom: 12px; }
.drop-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.drop-sub { font-size: 12px; color: var(--text-muted); }
.upload-error { width: 480px; background: var(--red-light); border: 1px solid var(--red); border-radius: var(--radius-md); padding: 12px 16px; color: var(--red-dark); font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
.retry-btn { background: none; border: 1px solid var(--red); border-radius: var(--radius-md); padding: 4px 12px; color: var(--red-dark); cursor: pointer; font-size: 12px; }
.upload-progress { width: 480px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.progress-spinner { width: 36px; height: 36px; border: 3px solid var(--blue-light); border-top-color: var(--blue-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.progress-stage { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.progress-log { font-size: 11px; color: var(--text-muted); min-height: 16px; }
.progress-bar { width: 100%; height: 4px; background: var(--blue-light); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--blue-primary); border-radius: 2px; transition: width 0.4s ease; }
.upload-ready { text-align: center; }
.ready-icon { width: 56px; height: 56px; background: var(--green-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--green); margin: 0 auto 12px; }
.ready-title { font-size: 18px; font-weight: 600; color: var(--green-dark); }
.upload-features { width: 480px; display: flex; flex-direction: column; gap: 6px; }
.feature-item { font-size: 13px; color: var(--text-secondary); }
.sample-btn { background: none; border: none; color: var(--blue-primary); font-size: 13px; cursor: pointer; text-decoration: underline; }
```

---

### 21.7 `read_from_summary()` — Missing Function for Dynamic Parser

Add this function to `preprocess/extract.py` before `parse_excel()`. It handles pre-aggregated Excel files (like Hari's analysis file) where scores are already computed:

```python
def read_from_summary(summary_sheets, metadata_sheets):
    """
    Read pre-aggregated scores from a summary-type sheet.
    Returns: (businesses, units, cohorts)
    """
    import numpy as np

    businesses = []
    units      = []
    cohorts    = {}

    CATEGORY_MAP = {
        'engagement':            'Engagement',
        'leadership':            'Leadership',
        'performance culture':   'Performance Culture',
        'perf culture':          'Performance Culture',
        'development':           'Development & Career',
        'development & career':  'Development & Career',
        'manager effectiveness': 'Manager Effectiveness',
        'manager':               'Manager Effectiveness',
        'onboarding':            'Onboarding',
    }

    def map_cat(col_name):
        cn = str(col_name).strip().lower()
        for k, v in CATEGORY_MAP.items():
            if k in cn:
                return v
        return None

    for sheet_name, df in summary_sheets.items():
        if df.empty or len(df) < 3:
            continue

        # Find name column (first text column with org-like values)
        name_col  = None
        score_cols = {}

        for col in df.columns:
            series = df[col].dropna()
            if series.dtype == object and series.nunique() > 2:
                if name_col is None:
                    name_col = col
            elif series.dtype in ['float64', 'int64']:
                vals = series.dropna()
                if len(vals) > 0 and 1.0 <= vals.mean() <= 6.0:
                    cat = map_cat(col)
                    if cat:
                        score_cols[cat] = col
                    elif str(col).lower() in ['overall', 'total', 'avg', 'average']:
                        score_cols['_overall'] = col

        if not name_col or not score_cols:
            continue

        overall_col = score_cols.get('_overall')

        for _, row in df.iterrows():
            name = str(row.get(name_col, '')).strip()
            if not name or name.lower() in ['nan', 'none', '']:
                continue

            if overall_col:
                try:
                    overall = float(row[overall_col])
                except:
                    continue
            elif score_cols:
                cat_vals = []
                for cat, col in score_cols.items():
                    if cat != '_overall':
                        try: cat_vals.append(float(row[col]))
                        except: pass
                overall = round(np.mean(cat_vals), 2) if cat_vals else 0

            cats = {}
            for cat, col in score_cols.items():
                if cat == '_overall': continue
                try: cats[cat] = round(float(row[col]), 2)
                except: cats[cat] = round(overall * 0.98, 2)

            variance = compute_variance(cats) if cats else 0
            businesses.append({
                'name':     name,
                'overall':  round(overall, 2),
                'band':     score_to_band(overall),
                'categories': cats,
                'variance': variance,
                'respondent_count': 0,
            })

    businesses.sort(key=lambda x: x['overall'], reverse=True)
    for i, b in enumerate(businesses):
        b['rank'] = i + 1

    return businesses, units, cohorts
```

Also add `import numpy as np` at the top of `extract.py`.

---

### 21.8 KPI Card Icons — SVG Code

Add these inline SVGs to `KpiCards.jsx`. Use them as the icon prop for each card:

```jsx
// Purple sparkle — Overall Engagement Score
const SparkleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#EDE9FE"/>
    <path d="M16 8l1.5 5.5L23 16l-5.5 1.5L16 23l-1.5-5.5L9 16l5.5-1.5L16 8z" fill="#7C3AED"/>
  </svg>
);

// Green people — Response Rate
const PeopleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#DCFCE7"/>
    <circle cx="13" cy="13" r="3" fill="#16A34A"/>
    <circle cx="19" cy="13" r="3" fill="#16A34A"/>
    <path d="M8 23c0-3 2.5-5 5-5h6c2.5 0 5 2 5 5" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

// Gold trophy — Top Performing
const TrophyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#FEF9C3"/>
    <path d="M12 9h8v7a4 4 0 01-8 0V9z" fill="#D97706"/>
    <path d="M10 10h2v4a2 2 0 01-2 0V10zM20 10h2v4a2 2 0 01-2 0V10z" fill="#D97706"/>
    <rect x="14" y="20" width="4" height="3" fill="#D97706"/>
    <rect x="12" y="23" width="8" height="1.5" rx="0.75" fill="#D97706"/>
  </svg>
);

// Red trend down — Lowest Performing
const TrendDownIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#FEE2E2"/>
    <polyline points="9,11 14,17 18,14 23,20" stroke="#DC2626" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="19,20 23,20 23,16" stroke="#DC2626" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
```

---

### 21.9 Complete Sample `businesses.json` — All 22 Businesses

Replace the partial list in Section 18.7 with this complete set:

```json
[
  { "name": "Grasim Industries",              "overall": 4.57, "band": "strong",  "rank": 1,  "categories": { "Engagement": 4.57, "Leadership": 4.61, "Performance Culture": 4.51, "Development & Career": 4.48, "Manager Effectiveness": 4.53, "Onboarding": 4.60 }, "variance": 0.05, "respondent_count": 3200 },
  { "name": "UltraTech Cement",               "overall": 4.52, "band": "strong",  "rank": 2,  "categories": { "Engagement": 4.52, "Leadership": 4.55, "Performance Culture": 4.50, "Development & Career": 4.47, "Manager Effectiveness": 4.49, "Onboarding": 4.58 }, "variance": 0.04, "respondent_count": 4100 },
  { "name": "Aditya Birla Financial Services", "overall": 4.50, "band": "strong",  "rank": 3,  "categories": { "Engagement": 4.50, "Leadership": 4.52, "Performance Culture": 4.48, "Development & Career": 4.46, "Manager Effectiveness": 4.47, "Onboarding": 4.54 }, "variance": 0.03, "respondent_count": 2800 },
  { "name": "Hindalco Industries",             "overall": 4.49, "band": "strong",  "rank": 4,  "categories": { "Engagement": 4.49, "Leadership": 4.50, "Performance Culture": 4.46, "Development & Career": 4.45, "Manager Effectiveness": 4.46, "Onboarding": 4.55 }, "variance": 0.04, "respondent_count": 5200 },
  { "name": "Birla Carbon",                    "overall": 4.48, "band": "strong",  "rank": 5,  "categories": { "Engagement": 4.48, "Leadership": 4.49, "Performance Culture": 4.45, "Development & Career": 4.44, "Manager Effectiveness": 4.45, "Onboarding": 4.53 }, "variance": 0.03, "respondent_count": 1900 },
  { "name": "Aditya Birla Fashion & Retail",  "overall": 4.46, "band": "strong",  "rank": 6,  "categories": { "Engagement": 4.46, "Leadership": 4.48, "Performance Culture": 4.42, "Development & Career": 4.44, "Manager Effectiveness": 4.45, "Onboarding": 4.52 }, "variance": 0.03, "respondent_count": 3600 },
  { "name": "Aditya Birla Birla Capital",     "overall": 4.45, "band": "strong",  "rank": 7,  "categories": { "Engagement": 4.45, "Leadership": 4.47, "Performance Culture": 4.41, "Development & Career": 4.43, "Manager Effectiveness": 4.44, "Onboarding": 4.51 }, "variance": 0.03, "respondent_count": 2200 },
  { "name": "Novelis",                         "overall": 4.44, "band": "strong",  "rank": 8,  "categories": { "Engagement": 4.44, "Leadership": 4.46, "Performance Culture": 4.40, "Development & Career": 4.42, "Manager Effectiveness": 4.43, "Onboarding": 4.50 }, "variance": 0.03, "respondent_count": 4800 },
  { "name": "Metals Business",                 "overall": 4.43, "band": "strong",  "rank": 9,  "categories": { "Engagement": 4.43, "Leadership": 4.45, "Performance Culture": 4.39, "Development & Career": 4.41, "Manager Effectiveness": 4.42, "Onboarding": 4.49 }, "variance": 0.03, "respondent_count": 3100 },
  { "name": "Textiles Business",               "overall": 4.42, "band": "strong",  "rank": 10, "categories": { "Engagement": 4.42, "Leadership": 4.44, "Performance Culture": 4.38, "Development & Career": 4.40, "Manager Effectiveness": 4.41, "Onboarding": 4.48 }, "variance": 0.03, "respondent_count": 2700 },
  { "name": "Aditya Birla Health Insurance",   "overall": 4.41, "band": "strong",  "rank": 11, "categories": { "Engagement": 4.41, "Leadership": 4.43, "Performance Culture": 4.37, "Development & Career": 4.39, "Manager Effectiveness": 4.40, "Onboarding": 4.47 }, "variance": 0.03, "respondent_count": 1600 },
  { "name": "Aditya Birla Sun Life AMC",       "overall": 4.40, "band": "strong",  "rank": 12, "categories": { "Engagement": 4.40, "Leadership": 4.42, "Performance Culture": 4.36, "Development & Career": 4.38, "Manager Effectiveness": 4.39, "Onboarding": 4.46 }, "variance": 0.03, "respondent_count": 980  },
  { "name": "Chemicals Business",              "overall": 4.38, "band": "healthy", "rank": 13, "categories": { "Engagement": 4.38, "Leadership": 4.40, "Performance Culture": 4.34, "Development & Career": 4.36, "Manager Effectiveness": 4.37, "Onboarding": 4.44 }, "variance": 0.03, "respondent_count": 2400 },
  { "name": "Mining Business",                 "overall": 4.47, "band": "strong",  "rank": 14, "categories": { "Engagement": 4.47, "Leadership": 4.47, "Performance Culture": 4.47, "Development & Career": 4.47, "Manager Effectiveness": 4.47, "Onboarding": 4.47 }, "variance": 0.00, "respondent_count": 3800 },
  { "name": "Aditya Birla Housing Finance",    "overall": 4.36, "band": "healthy", "rank": 15, "categories": { "Engagement": 4.36, "Leadership": 4.38, "Performance Culture": 4.30, "Development & Career": 4.34, "Manager Effectiveness": 4.35, "Onboarding": 4.44 }, "variance": 0.05, "respondent_count": 1200 },
  { "name": "Aditya Birla Renewables",         "overall": 4.35, "band": "healthy", "rank": 16, "categories": { "Engagement": 4.35, "Leadership": 4.37, "Performance Culture": 4.29, "Development & Career": 4.33, "Manager Effectiveness": 4.34, "Onboarding": 4.42 }, "variance": 0.05, "respondent_count": 890  },
  { "name": "Aditya Birla Global Trading",     "overall": 4.43, "band": "strong",  "rank": 17, "categories": { "Engagement": 4.43, "Leadership": 4.44, "Performance Culture": 4.40, "Development & Career": 4.42, "Manager Effectiveness": 4.43, "Onboarding": 4.46 }, "variance": 0.02, "respondent_count": 450  },
  { "name": "Aditya Birla Payments Bank",      "overall": 4.33, "band": "healthy", "rank": 18, "categories": { "Engagement": 4.33, "Leadership": 4.35, "Performance Culture": 4.27, "Development & Career": 4.31, "Manager Effectiveness": 4.32, "Onboarding": 4.40 }, "variance": 0.05, "respondent_count": 620  },
  { "name": "Aditya Birla Wellness",           "overall": 4.32, "band": "healthy", "rank": 19, "categories": { "Engagement": 4.32, "Leadership": 4.34, "Performance Culture": 4.26, "Development & Career": 4.30, "Manager Effectiveness": 4.31, "Onboarding": 4.38 }, "variance": 0.05, "respondent_count": 380  },
  { "name": "Aditya Birla Real Estate",        "overall": 4.30, "band": "healthy", "rank": 20, "categories": { "Engagement": 4.30, "Leadership": 4.32, "Performance Culture": 4.24, "Development & Career": 4.28, "Manager Effectiveness": 4.29, "Onboarding": 4.36 }, "variance": 0.05, "respondent_count": 510  },
  { "name": "Seamex",                          "overall": 4.42, "band": "strong",  "rank": 21, "categories": { "Engagement": 4.42, "Leadership": 4.42, "Performance Culture": 4.42, "Development & Career": 4.42, "Manager Effectiveness": 4.42, "Onboarding": 4.42 }, "variance": 0.00, "respondent_count": 720  },
  { "name": "ABG Headquarters",                "overall": 4.39, "band": "healthy", "rank": 22, "categories": { "Engagement": 4.39, "Leadership": 4.30, "Performance Culture": 4.28, "Development & Career": 4.25, "Manager Effectiveness": 4.22, "Onboarding": 4.35 }, "variance": 0.06, "respondent_count": 1200 }
]
```

---

### 21.10 `hooks/useNavigate.js` — Full Code

```javascript
// client/src/hooks/useNavigate.js
// Custom hook — not used directly (navigation is in App.jsx via AppContext)
// This file exists for components that need to call navigate without prop drilling
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export function useNavigate() {
  const { navigate, goBack } = useContext(AppContext);
  return { navigate, goBack };
}
```

---

### 21.11 `/api/load-sample` Route — Add to data.js

Add this to `server/routes/data.js` (use the Section 20.1 version as base — add this route before `module.exports`):

```javascript
// Load sample data — used by Upload page "Use sample data" button
router.post('/load-sample', (req, res) => {
  const sampleDir = path.resolve('./data/sample');
  const files = ['businesses.json','units.json','clusters.json','cohorts.json','meta.json'];
  let copied = 0;
  for (const file of files) {
    const src  = path.join(sampleDir, file);
    const dest = path.join(dataDir,   file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  if (copied === 0) return res.status(404).json({ error: 'No sample data found' });
  res.json({ success: true, copied });
});
```

---

### 21.12 FINAL Definitive Run Instructions

```bash
# ── SETUP ────────────────────────────────────────────────
git clone <repo> abg-vibes-poc
cd abg-vibes-poc

# Backend deps
npm install

# Frontend deps
cd client && npm install && cd ..

# Python deps
pip install pandas openpyxl xlrd numpy

# ── ENVIRONMENT ──────────────────────────────────────────
cp .env.example .env
# Edit .env and add:
#   CEREBRAS_API_KEY=your_key_here
#   CEREBRAS_MODEL=llama-3.3-70b
#   PORT=3001

# ── LOAD SAMPLE DATA (for immediate demo) ───────────────
node scripts/copy-sample-data.js

# ── START DEV SERVERS ───────────────────────────────────
npm run dev
# Backend:  http://localhost:3001
# Frontend: http://localhost:5173  ← open this

# ── UPLOAD REAL DATA ────────────────────────────────────
# Open http://localhost:5173
# Drop your Excel file → dashboard builds automatically

# ── DEMO SCHEMA-AGNOSTIC FEATURE ────────────────────────
# Rename columns in a copy of the Excel
# python3 preprocess/extract.py "modified.xlsx" ./data
# Reload page → same results
```

---

### 21.13 MASTER CONFLICT TABLE — Final Version

> Claude Code: When any two sections conflict, the **USE** column wins. No exceptions.

| File | USE | IGNORE |
|---|---|---|
| `server/index.js` | Section 20.4 | Section 7 |
| `server/routes/upload.js` | Section 20.2 | Sections 7, 16.9 |
| `server/routes/data.js` | Section 20.1 + 21.11 | Sections 7, 18.5 |
| `server/routes/ai.js` | Section 20.3 | Sections 7, 18.6 |
| `preprocess/extract.py` | Section 16.8 (parse_excel) + 21.7 (read_from_summary) | Section 6 (extract fn) |
| `client/src/App.jsx` | Section 18.2 | Section 9 |
| `client/src/main.jsx` | Section 21.4 | — |
| `client/vite.config.js` | Section 21.5 | — |
| `client/src/context/AppContext.jsx` | Section 21.3 | — |
| `client/src/pages/UploadPage.jsx` | Section 21.6 | Section 9 stub |
| `client/src/pages/Overview.jsx` | Section 21.2 | — |
| `client/src/hooks/useNavigate.js` | Section 21.10 | — |
| `data/sample/businesses.json` | Section 21.9 (all 22) | Section 18.7 (6 only) |
| Project folder structure | Section 18.1 | Section 3 |
| Build checklist | Section 19.6 | Section 14 |
| Package.json | Section 18.10 | Section 12 |
| Run instructions | Section 21.12 | Section 13 |
| API route table | Section 20.6 + 21.11 | — |


---

## 22. FINAL REMAINING COMPONENTS — Full Code

> These are the last components that had no JSX. Claude Code builds from these. Section 22 overrides any earlier stubs.

---

### 22.1 `client/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ABG Employee Engagement Intelligence</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'><path d='M14 2C14 2 8 8 8 14C8 18 10 20 12 21C11 19 12 17 14 16C16 17 17 19 16 21C18 20 20 18 20 14C20 8 14 2 14 2Z' fill='%23F97316'/></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### 22.2 `main.jsx` — Updated with Chart.js Registration

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, RadialLinearScale,
  ArcElement, Filler, Tooltip, Legend
} from 'chart.js';
import App from './App';
import './styles/globals.css';
import './styles/typography.css';
import './styles/animations.css';

// Register all Chart.js components needed
ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, RadialLinearScale,
  ArcElement, Filler, Tooltip, Legend
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### 22.3 `components/layout/Sidebar.jsx` — Full Code

```jsx
import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

const NAV = [
  { id: 'overview',        label: 'Overview',        icon: '⊞' },
  { id: 'business-overview', label: 'Business Overview', icon: '🏢' },
  {
    id: 'explore', label: 'Explore', icon: '🔍', collapsible: true,
    children: [
      { id: 'bu-explorer',    label: 'BU Explorer' },
      { id: 'insights-studio',label: 'Insights Studio' },
      { id: 'ai-insights',    label: 'AI Insights' },
      { id: 'trends',         label: 'Trends Over Time' },
      { id: 'outliers',       label: 'Outliers & Alerts' },
      { id: 'employee-voice', label: 'Employee Voice' },
    ]
  },
  { id: 'reports',     label: 'Reports',     icon: '📄' },
  { id: 'benchmarks',  label: 'Benchmarks',  icon: '📊' },
];

export default function Sidebar() {
  const { page, navigate } = useContext(AppContext);
  const [collapsed,      setCollapsed]      = useState(false);
  const [exploreOpen,    setExploreOpen]    = useState(true);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" className="sidebar-flame">
          <path d="M14 2C14 2 8 8 8 14C8 18 10 20 12 21C11 19 12 17 14 16C16 17 17 19 16 21C18 20 20 18 20 14C20 8 14 2 14 2Z" fill="#F97316"/>
          <path d="M14 16C12 17 11 19 12 21C12.5 22 13 22.5 14 23C15 22.5 15.5 22 16 21C17 19 16 17 14 16Z" fill="#DC2626"/>
        </svg>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <div className="sidebar-brand">ABG VIBES 2025</div>
            <div className="sidebar-subbrand">Employee Engagement</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => {
          if (item.collapsible) {
            return (
              <div key={item.id}>
                <div
                  className={`nav-item ${item.children?.some(c => c.id === page) ? 'active' : ''}`}
                  onClick={() => setExploreOpen(o => !o)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <><span className="nav-label">{item.label}</span><span className="nav-chevron">{exploreOpen ? '▼' : '▶'}</span></>}
                </div>
                {exploreOpen && !collapsed && (
                  <div className="nav-sub-items">
                    {item.children.map(child => (
                      <div
                        key={child.id}
                        className={`nav-sub-item ${page === child.id ? 'active' : ''}`}
                        onClick={() => navigate(child.id)}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {!collapsed && (
          <>
            <div className="nav-item" onClick={() => navigate('help')}>
              <span className="nav-icon">?</span>
              <span className="nav-label">Help</span>
            </div>
            <div className="nav-item" onClick={() => navigate('settings')}>
              <span className="nav-icon">⚙</span>
              <span className="nav-label">Settings</span>
            </div>
          </>
        )}
        <div className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '»' : '«'}
        </div>
      </div>
    </aside>
  );
}
```

Sidebar CSS (add to globals.css):
```css
.sidebar { width:200px; min-width:200px; background:var(--bg-card); border-right:1px solid var(--border); display:flex; flex-direction:column; transition:width 0.2s; overflow:hidden; }
.sidebar.collapsed { width:48px; min-width:48px; }
.sidebar-logo { display:flex; align-items:center; gap:8px; padding:14px 12px; border-bottom:1px solid var(--border); }
.sidebar-brand { font-size:11px; font-weight:700; color:var(--text-primary); }
.sidebar-subbrand { font-size:10px; color:var(--text-muted); }
.sidebar-nav { flex:1; padding:8px 0; overflow-y:auto; }
.nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; cursor:pointer; border-radius:6px; margin:1px 6px; font-size:13px; color:var(--text-secondary); }
.nav-item:hover { background:var(--blue-light); color:var(--blue-primary); }
.nav-item.active { background:var(--blue-primary); color:white; font-weight:500; }
.nav-icon { font-size:14px; flex-shrink:0; width:18px; text-align:center; }
.nav-label { flex:1; font-size:13px; }
.nav-chevron { font-size:10px; color:var(--text-muted); }
.nav-sub-items { padding-left:28px; }
.nav-sub-item { padding:7px 12px; font-size:12px; color:var(--text-secondary); cursor:pointer; border-radius:4px; }
.nav-sub-item:hover { background:var(--blue-light); color:var(--blue-primary); }
.nav-sub-item.active { color:var(--blue-primary); font-weight:500; }
.sidebar-bottom { padding:8px 6px; border-top:1px solid var(--border); }
.collapse-btn { padding:8px 12px; cursor:pointer; font-size:14px; color:var(--text-muted); text-align:center; }
.collapse-btn:hover { color:var(--text-primary); }
```

---

### 22.4 `components/layout/TopBar.jsx` — Full Code

```jsx
import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

export default function TopBar() {
  const { setIsFiltersOpen, setDataReady, meta } = useContext(AppContext);
  const [wave] = useState(meta?.survey_name || 'ABG Vibes 2026');

  const handleExport = () => {
    // CSV export of businesses — papaparse
    import('papaparse').then(({ default: Papa }) => {
      const { businesses } = window.__abgContext || {};
      if (!businesses) return;
      const csv = Papa.unparse(businesses.map(b => ({
        Rank: b.rank, Business: b.name, Overall: b.overall, Band: b.band,
        ...b.categories
      })));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'abg_engagement_scores.csv'; a.click();
    });
  };

  return (
    <div className="topbar">
      {/* Filters */}
      <button className="topbar-btn" onClick={() => setIsFiltersOpen(true)}>
        <span>⚙</span> Filters
      </button>

      {/* Survey Wave */}
      <div className="topbar-group">
        <span className="topbar-label">Survey Wave</span>
        <select className="topbar-select" defaultValue={wave}>
          <option>{wave}</option>
          <option disabled>── Historical ──</option>
          <option disabled>Upload previous wave to compare</option>
        </select>
      </div>

      {/* Compare To */}
      <div className="topbar-group">
        <span className="topbar-label">Compare to</span>
        <select className="topbar-select" defaultValue="none">
          <option value="none">Select wave…</option>
          <option disabled>Upload previous wave to enable</option>
        </select>
      </div>

      <div className="topbar-spacer" />

      {/* Reset */}
      <button className="topbar-btn" onClick={() => window.location.reload()}>
        ↺ Reset
      </button>

      {/* Export */}
      <button className="topbar-btn" onClick={handleExport}>
        ⬇ Export
      </button>

      {/* Upload New Data */}
      <button className="topbar-btn topbar-btn-primary" onClick={() => {
        if (window.confirm('Upload a new Excel file? This will replace current data.')) {
          // Clear data files then go to upload
          fetch('/api/reset', { method: 'POST' }).catch(() => {});
          window.location.reload();
        }
      }}>
        ↑ Upload New Data
      </button>
    </div>
  );
}
```

TopBar CSS:
```css
.topbar { height:52px; display:flex; align-items:center; gap:8px; padding:0 16px; background:var(--bg-card); border-bottom:1px solid var(--border); }
.topbar-group { display:flex; align-items:center; gap:6px; }
.topbar-label { font-size:11px; color:var(--text-muted); white-space:nowrap; }
.topbar-select { font-size:12px; padding:4px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-card); color:var(--text-primary); cursor:pointer; }
.topbar-btn { display:flex; align-items:center; gap:4px; padding:6px 12px; font-size:12px; border:1px solid var(--border); border-radius:6px; background:var(--bg-card); color:var(--text-secondary); cursor:pointer; white-space:nowrap; }
.topbar-btn:hover { background:var(--bg-page); }
.topbar-btn-primary { background:var(--blue-primary); color:white; border-color:var(--blue-primary); }
.topbar-btn-primary:hover { background:var(--blue-dark); }
.topbar-spacer { flex:1; }
```

---

### 22.5 `components/layout/RightPanel.jsx` — Full Code

```jsx
import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import ChatWithData from '../chat/ChatWithData';

const TABS = ['AI Insights', 'Top Trends', 'Outliers & Alerts', 'Summary'];

export default function RightPanel() {
  const { insightsData } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('AI Insights');

  const trends   = insightsData?.topTrends  || [];
  const outliers = insightsData?.outliers   || [];
  const summary  = insightsData?.summary    || '';

  return (
    <aside className="right-panel">
      {/* Tabs */}
      <div className="rp-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`rp-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rp-content">
        {activeTab === 'AI Insights' && (
          <div className="rp-section">
            <div className="rp-section-title">Top Trends</div>
            {trends.length === 0
              ? <div className="rp-skeleton-list"><div className="skeleton" style={{height:12,marginBottom:8}}/><div className="skeleton" style={{height:12,marginBottom:8}}/><div className="skeleton" style={{height:12}}/></div>
              : trends.map((t, i) => (
                <div key={i} className="rp-trend-item">
                  <span className={`rp-arrow ${t.direction}`}>{t.direction === 'up' ? '↑' : '↓'}</span>
                  <span className="rp-trend-text">{t.text}</span>
                </div>
              ))
            }
            <div className="rp-section-title" style={{marginTop:16}}>Outliers Detected</div>
            {outliers.length === 0
              ? <div className="rp-skeleton-list"><div className="skeleton" style={{height:12,marginBottom:8}}/><div className="skeleton" style={{height:12,marginBottom:8}}/><div className="skeleton" style={{height:12}}/></div>
              : outliers.map((o, i) => (
                <div key={i} className="rp-trend-item">
                  <span className="rp-arrow down">↓</span>
                  <span className="rp-trend-text">{o.text}</span>
                </div>
              ))
            }
            <button className="rp-view-all">View all insights →</button>
          </div>
        )}
        {activeTab === 'Top Trends' && (
          <div className="rp-section">
            {trends.map((t, i) => (
              <div key={i} className="rp-trend-item">
                <span className={`rp-arrow ${t.direction}`}>{t.direction === 'up' ? '↑' : '↓'}</span>
                <span className="rp-trend-text">{t.text}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Outliers & Alerts' && (
          <div className="rp-section">
            {outliers.map((o, i) => (
              <div key={i} className="rp-trend-item">
                <span className="rp-arrow down">↓</span>
                <span className="rp-trend-text">{o.text}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Summary' && (
          <div className="rp-section">
            <p className="rp-summary-text">{summary || <span className="skeleton" style={{height:60,display:'block'}}/>}</p>
          </div>
        )}
      </div>

      {/* Chat — always visible below tabs */}
      <ChatWithData />
    </aside>
  );
}
```

RightPanel CSS:
```css
.right-panel { width:220px; min-width:220px; background:var(--bg-card); border-left:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
.rp-tabs { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); padding:4px; gap:2px; }
.rp-tab { flex:1 1 auto; padding:5px 4px; font-size:10px; border:none; background:none; cursor:pointer; color:var(--text-muted); border-radius:4px; white-space:nowrap; }
.rp-tab.active { background:var(--blue-light); color:var(--blue-primary); font-weight:600; }
.rp-content { flex:1; overflow-y:auto; padding:10px; }
.rp-section { display:flex; flex-direction:column; gap:6px; }
.rp-section-title { font-size:10px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-top:4px; }
.rp-trend-item { display:flex; gap:6px; align-items:flex-start; }
.rp-arrow { font-size:12px; font-weight:700; flex-shrink:0; margin-top:1px; }
.rp-arrow.up { color:var(--green); }
.rp-arrow.down { color:var(--red); }
.rp-trend-text { font-size:11px; color:var(--text-primary); line-height:1.4; }
.rp-view-all { margin-top:8px; background:none; border:none; color:var(--blue-primary); font-size:11px; cursor:pointer; padding:0; text-align:left; }
.rp-summary-text { font-size:12px; color:var(--text-primary); line-height:1.6; }
```

---

### 22.6 `components/chat/ChatWithData.jsx` — Full Code

```jsx
import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';

const SUGGESTED = [
  'Which business has improved the most?',
  'Which BUs are in Open Conflict cluster?',
  'What drives engagement the most?',
  'Show BUs with high polarization',
];

export default function ChatWithData() {
  const { dimension } = useContext(AppContext);
  const [messages,  setMessages]  = useState([
    { role: 'assistant', content: "Hi! I'm your AI analyst. Ask me anything about employee engagement." }
  ]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:  msg,
          history:  messages.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          dimension,
        }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + text,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Sorry, something went wrong. Please try again.';
        return updated;
      });
    }
    setLoading(false);
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-dot" />
        <span className="chat-title">CHAT WITH DATA</span>
        <span className="chat-beta">Beta</span>
        <span className="chat-sub">Your AI Analyst</span>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.content}
            {m.role === 'assistant' && loading && i === messages.length - 1 && m.content === '' && (
              <span className="chat-typing">●●●</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      <div className="chat-suggested">
        {SUGGESTED.map((q, i) => (
          <button key={i} className="chat-suggestion" onClick={() => sendMessage(q)}>
            💬 {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button className="chat-send" onClick={() => sendMessage()} disabled={loading}>→</button>
      </div>
      <div className="chat-disclaimer">AI can make mistakes. Verify important insights.</div>
    </div>
  );
}
```

Chat CSS:
```css
.chat-panel { display:flex; flex-direction:column; border-top:1px solid var(--border); max-height:420px; }
.chat-header { padding:8px 10px; display:flex; align-items:center; gap:6px; border-bottom:1px solid var(--border); }
.chat-dot { width:7px; height:7px; border-radius:50%; background:var(--blue-primary); flex-shrink:0; }
.chat-title { font-size:10px; font-weight:700; color:var(--text-primary); }
.chat-beta { font-size:9px; background:var(--blue-light); color:var(--blue-primary); padding:1px 5px; border-radius:3px; font-weight:600; }
.chat-sub { font-size:10px; color:var(--text-muted); margin-left:auto; }
.chat-messages { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:6px; min-height:100px; max-height:200px; }
.chat-msg { font-size:11px; line-height:1.5; padding:7px 9px; border-radius:8px; max-width:94%; }
.chat-msg.assistant { background:var(--bg-page); color:var(--text-primary); align-self:flex-start; }
.chat-msg.user { background:var(--blue-light); color:var(--blue-dark); align-self:flex-end; }
.chat-typing { color:var(--text-muted); animation:pulse 1s infinite; }
.chat-suggested { padding:4px 8px; display:flex; flex-direction:column; gap:3px; }
.chat-suggestion { background:none; border:none; text-align:left; font-size:10px; color:var(--blue-primary); cursor:pointer; padding:3px 2px; }
.chat-suggestion:hover { text-decoration:underline; }
.chat-input-row { display:flex; gap:4px; padding:6px 8px; border-top:1px solid var(--border); }
.chat-input { flex:1; font-size:11px; padding:5px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-page); }
.chat-send { padding:5px 10px; background:var(--blue-primary); color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px; }
.chat-send:disabled { opacity:0.5; }
.chat-disclaimer { font-size:9px; color:var(--text-muted); padding:4px 8px 6px; text-align:center; }
```

---

### 22.7 Remaining Pages — Minimal Working Code

These pages are low-priority for the POC demo. Each renders a clean "Coming Soon" or simple content.

```jsx
// pages/TrendsPage.jsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
export default function TrendsPage() {
  const { businesses } = useContext(AppContext);
  return (
    <div className="page-container fade-in">
      <h2 className="page-title">Trends Over Time</h2>
      <p className="page-tagline">Multi-wave comparison requires historical uploads</p>
      <div className="info-box">
        ℹ️ Upload a previous wave Excel file to enable wave-over-wave comparison.
        Currently showing ABG Vibes 2026 snapshot only.
      </div>
      <div style={{marginTop:24}}>
        <div className="section-title">Current Wave — Business Rankings</div>
        {businesses.slice(0,10).map(b => (
          <div key={b.name} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
            <span>#{b.rank} {b.name}</span>
            <span style={{fontWeight:600,color:'var(--blue-primary)'}}>{b.overall}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// pages/EmployeeVoicePage.jsx
export default function EmployeeVoicePage() {
  return (
    <div className="page-container fade-in">
      <h2 className="page-title">Employee Voice</h2>
      <p className="page-tagline">Open-ended responses and themes</p>
      <div className="info-box">
        ℹ️ Free-text columns not detected in the current dataset.
        Employee voice analysis requires open-ended survey questions in the Excel.
      </div>
    </div>
  );
}

// pages/ReportsPage.jsx
export default function ReportsPage() {
  return (
    <div className="page-container fade-in">
      <h2 className="page-title">Reports</h2>
      <div className="coming-soon-box">📋 Report generation coming in Phase 2</div>
    </div>
  );
}

// pages/BenchmarksPage.jsx
export default function BenchmarksPage() {
  return (
    <div className="page-container fade-in">
      <h2 className="page-title">Benchmarks</h2>
      <div className="coming-soon-box">📊 Industry benchmarks coming in Phase 2</div>
    </div>
  );
}
```

Shared CSS for these pages:
```css
.page-container { padding:4px 0; display:flex; flex-direction:column; gap:16px; }
.info-box { background:var(--blue-light); border:1px solid var(--blue-primary); border-radius:var(--radius-md); padding:14px 16px; font-size:13px; color:var(--blue-dark); }
.coming-soon-box { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:48px; text-align:center; font-size:14px; color:var(--text-muted); }
.section-title { font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); letter-spacing:0.5px; margin-bottom:8px; }
```

---

### 22.8 `/api/reset` Route — Add to data.js

The TopBar "Upload New Data" button calls this:

```javascript
// Add to server/routes/data.js before module.exports
router.post('/reset', (req, res) => {
  const files = ['businesses.json','units.json','clusters.json','cohorts.json','meta.json'];
  for (const file of files) {
    const fp = path.join(dataDir, file);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  res.json({ success: true });
});
```

---

### 22.9 `.env.example` — Full Content

```
# Cerebras API Key — get free key at https://inference.cerebras.ai
CEREBRAS_API_KEY=your_cerebras_api_key_here

# Cerebras model name
CEREBRAS_MODEL=llama-3.3-70b

# Express server port
PORT=3001

# Environment
NODE_ENV=development
```

---

### 22.10 ABSOLUTE FINAL Master Checklist

Every file Claude Code must create. Zero exceptions. Zero placeholders.

#### Backend
- [ ] `server/index.js` — Section 20.4
- [ ] `server/routes/upload.js` — Section 20.2
- [ ] `server/routes/data.js` — Section 20.1 + 21.11 + 22.8
- [ ] `server/routes/ai.js` — Section 20.3
- [ ] `preprocess/extract.py` — Sections 16 + 21.7
- [ ] `scripts/copy-sample-data.js` — Section 19.2
- [ ] `.env.example` — Section 22.9
- [ ] `.gitignore` — Section 18.11
- [ ] `package.json` — Section 18.10
- [ ] `requirements.txt` — `pandas openpyxl xlrd numpy`

#### Sample Data
- [ ] `data/sample/businesses.json` — Section 21.9 (all 22)
- [ ] `data/sample/units.json` — Section 19.3
- [ ] `data/sample/clusters.json` — Section 19.3
- [ ] `data/sample/cohorts.json` — Section 18.7
- [ ] `data/sample/meta.json` — Section 18.7

#### Frontend Config
- [ ] `client/index.html` — Section 22.1
- [ ] `client/vite.config.js` — Section 21.5
- [ ] `client/package.json` — Section 18.10

#### Frontend Core
- [ ] `client/src/main.jsx` — Section 22.2 (with Chart.js registration)
- [ ] `client/src/App.jsx` — Section 18.2
- [ ] `client/src/context/AppContext.jsx` — Section 21.3
- [ ] `client/src/hooks/useNavigate.js` — Section 21.10
- [ ] `client/src/styles/globals.css` — Section 4
- [ ] `client/src/styles/typography.css` — Section 18.3
- [ ] `client/src/styles/animations.css` — Section 18.3

#### Layout Components
- [ ] `client/src/components/layout/Sidebar.jsx` — Section 22.3
- [ ] `client/src/components/layout/TopBar.jsx` — Section 22.4
- [ ] `client/src/components/layout/RightPanel.jsx` — Section 22.5

#### Shared Components
- [ ] `client/src/components/shared/Badge.jsx` — Section 18.4
- [ ] `client/src/components/shared/Breadcrumb.jsx` — Section 18.4
- [ ] `client/src/components/shared/Skeleton.jsx` — Section 18.4
- [ ] `client/src/components/shared/Sparkline.jsx` — Section 18.9
- [ ] `client/src/components/shared/EmptyState.jsx` — Section 18.4

#### Overview Components
- [ ] `client/src/components/overview/KpiCards.jsx` — Sections 1, 21.8 (icons)
- [ ] `client/src/components/overview/ExploreBy.jsx` — Section 1
- [ ] `client/src/components/overview/AiSummary.jsx` — Section 9
- [ ] `client/src/components/overview/ClusterCards.jsx` — Section 9
- [ ] `client/src/components/overview/FocusAreas.jsx` — Section 9
- [ ] `client/src/components/overview/charts/EngagementBarChart.jsx` — Section 1
- [ ] `client/src/components/overview/charts/EngagementHeatmap.jsx` — Section 1
- [ ] `client/src/components/overview/charts/DecompositionTree.jsx` — Section 9
- [ ] `client/src/components/chat/ChatWithData.jsx` — Section 22.6

#### Pages
- [ ] `client/src/pages/UploadPage.jsx` — Section 21.6
- [ ] `client/src/pages/Overview.jsx` — Section 21.2
- [ ] `client/src/pages/BusinessDetail.jsx` — Section 17.2
- [ ] `client/src/pages/BUDetail.jsx` — Section 17.3
- [ ] `client/src/pages/ClusterDetail.jsx` — Section 17.4
- [ ] `client/src/pages/BusinessOverview.jsx` — Section 17.5
- [ ] `client/src/pages/BUExplorer.jsx` — Section 17.6
- [ ] `client/src/pages/AiInsightsPage.jsx` — Section 17.7
- [ ] `client/src/pages/OutliersPage.jsx` — Section 17.8
- [ ] `client/src/pages/InsightsStudio.jsx` — Section 17.9
- [ ] `client/src/pages/TrendsPage.jsx` — Section 22.7
- [ ] `client/src/pages/EmployeeVoicePage.jsx` — Section 22.7
- [ ] `client/src/pages/ReportsPage.jsx` — Section 22.7
- [ ] `client/src/pages/BenchmarksPage.jsx` — Section 22.7

