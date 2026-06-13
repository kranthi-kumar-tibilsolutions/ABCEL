# ABG EEI Phase 2 — Data Reality Update
## Corrections to ABG_EEI_PHASE2_FOUR_TABS.md based on actual client Excel file

> **Purpose:** The original .md file was built on assumptions about data structure.
> This document corrects every assumption using the real client Excel file.
> Apply ALL changes in this document on top of the original .md before building.

---

## What the real data looks like

### File: `Demo_Data_Vibes_2026_to_send.xlsx`

**Main Data sheet:** 55,459 rows × 79 columns
- Rows 0 and 1 are metadata (scale coding, category labels) — skip them
- Real data starts at row 2 (index)
- All responses use numeric codes — must be decoded using CQ lookup sheets

**Scale:** 1 = Agree, 2 = Tend to Agree, 3 = ?, 4 = Tend to Disagree, 5 = Disagree
**Favourability conversion:** `score = 6 − raw_value` → gives 1.0–5.0 where 5 = best

---

## 1. Real business names (CQ9) — 22 businesses

```
1:  ABG Headquarters              (n=13)
2:  ABG Renewables                (n=287)
3:  Aditya Birla Global Trading   (n=197)
4:  Aditya Birla Mgmt Co. Pvt Ltd.(n=612)
5:  Aditya Birla New Age Hospitality Pvt. Ltd. (n=93)
6:  Apparels                      (n=3,763)
7:  Birla Carbon                  (n=1,320)
8:  Birla Estates                 (n=513)
9:  Birla Pivot                   (n=283)
10: Cement HO                     (n=12,925)  ← largest
11: Century Group HO              (n=927)
12: CFI                           (n=2,182)
13: Financial Services HO         (n=12,102)  ← second largest
14: Grasim CFD                    (n=58)
15: Metals                        (n=5,326)
16: Mining                        (n=326)
17: Novel Jewels Ltd.             (n=376)
18: Novelis                       (n=8,227)
21: Paints HO                     (n=2,710)
22: Pulp and Fibre HO             (n=2,239)
23: Seamex                        (n=117)
24: Textiles HO                   (n=861)
```

---

## 2. Real actual scores (computed from the data)

These are the REAL numbers. Replace all mock scores in the original .md and sample JSON.

| Business | Overall | Engagement | Leadership | Perf Culture | Dev & Career | Mgr Effect. | Onboarding |
|---|---|---|---|---|---|---|---|
| Birla Carbon | 4.47 | 4.62 | 4.49 | 4.34 | 4.40 | 4.44 | 4.55 |
| Birla Estates | 4.47 | 4.63 | 4.49 | 4.33 | 4.41 | 4.41 | 4.55 |
| Metals | 4.47 | 4.64 | 4.49 | 4.32 | 4.38 | 4.41 | 4.58 |
| Mining | 4.47 | 4.66 | 4.47 | 4.34 | 4.37 | 4.40 | 4.58 |
| ABG Renewables | 4.46 | 4.64 | 4.48 | 4.31 | 4.41 | 4.42 | 4.51 |
| Aditya Birla New Age Hospitality | 4.48 | 4.66 | 4.51 | 4.33 | 4.40 | 4.42 | 4.54 |
| Aditya Birla Mgmt Co. | 4.46 | 4.62 | 4.50 | 4.30 | 4.37 | 4.42 | 4.54 |
| Cement HO | 4.46 | 4.64 | 4.48 | 4.32 | 4.38 | 4.41 | 4.56 |
| Century Group HO | 4.46 | 4.65 | 4.48 | 4.32 | 4.39 | 4.42 | 4.53 |
| CFI | 4.46 | 4.64 | 4.49 | 4.32 | 4.39 | 4.42 | 4.52 |
| Financial Services HO | 4.46 | 4.64 | 4.48 | 4.32 | 4.38 | 4.41 | 4.54 |
| Novelis | 4.46 | 4.63 | 4.48 | 4.32 | 4.37 | 4.42 | 4.57 |
| Paints HO | 4.46 | 4.64 | 4.49 | 4.32 | 4.37 | 4.41 | 4.53 |
| Pulp and Fibre HO | 4.46 | 4.64 | 4.49 | 4.33 | 4.38 | 4.41 | 4.53 |
| Apparels | 4.46 | 4.63 | 4.48 | 4.32 | 4.38 | 4.42 | 4.52 |
| Aditya Birla Global Trading | 4.44 | 4.65 | 4.46 | 4.32 | 4.37 | 4.46 | 4.40 |
| Birla Pivot | 4.45 | 4.64 | 4.48 | 4.32 | 4.37 | 4.40 | 4.49 |
| Grasim CFD | 4.45 | 4.62 | 4.49 | 4.36 | 4.34 | 4.39 | 4.49 |
| Novel Jewels Ltd. | 4.45 | 4.63 | 4.48 | 4.32 | 4.36 | 4.43 | 4.50 |
| Textiles HO | 4.45 | 4.64 | 4.49 | 4.32 | 4.37 | 4.41 | 4.48 |
| Seamex | 4.42 | 4.57 | 4.49 | 4.29 | 4.39 | 4.40 | 4.38 |
| ABG Headquarters | 4.32 | 4.62 | 4.63 | 4.28 | 4.34 | 4.31 | 3.75 |

**Group overall: 4.46**
**Weakest category: Performance Culture (avg 4.32)**
**Strongest category: Engagement (avg 4.63)**
**Lowest business: ABG Headquarters (4.32, but n=13 — very small sample)**
**Lowest meaningful: Seamex (4.42, n=117)**

---

## 3. Real demographic dimensions and their actual values

### Generation (CQ24)
```
Gen Y (Millennials): 27,916  (50.4%)
Gen X:               11,134  (20.1%)
DOB not Available:    8,980  (16.2%)
Gen Z:                7,315  (13.2%)
Baby Boomer:            111   (0.2%)
Traditionalist:           1   (0.0%)
```

### Gender (CQ25)
```
Male:    46,934  (84.7%)
Female:   8,511  (15.4%)
Unknown:      3   (0.0%)
```

### Job Band Level (CQ27)
```
Junior Management:  38,772  (70.0%)
Middle Management:   6,663  (12.0%)
Senior Management:     924   (1.7%)
Job Band NA:           513   (0.9%)
Staff:                 484   (0.9%)
Top Management:        306   (0.6%)
Non Management:        116   (0.2%)
Management:             39   (0.1%)
```

### Tenure (CQ29)
```
0-2 years:     15,247  (27.5%)
2-5 years:     14,377  (25.9%)
10-15 years:    7,662  (13.8%)
5-10 years:     6,706  (12.1%)
15-20 years:    5,619  (10.1%)
>25 years:      4,128   (7.4%)
20-25 years:    1,714   (3.1%)
```

### Country (CQ43) — 46 countries
Key ones: India (largest), USA, Brazil, Germany, Egypt, UK, Thailand, UAE, Singapore

---

## 4. Real OP question columns — 50 questions

Column names have a leading space. Strip before using.

**Engagement (OP1, OP2, OP4, OP48)**
```
OP1:  I feel proud to be an employee of Aditya Birla Group.
OP2:  I see myself working in Aditya Birla Group two years from now.
OP4:  My Business inspires me to do my best work every day.
OP48: I would recommend Aditya Birla Group as a great place to work.
```

**Development & Career (OP29–OP34)**
```
OP29: I receive development inputs to do my role effectively.
OP30: I receive exposures that prepare me for larger or wider roles in future.
OP31: I have access to resources that help me build future skills.
OP32: I feel my career goals are being met in my Business / Aditya Birla Group.
OP33: I am clear about the role or career direction I am being developed for.
OP34: I understand what I need to do to advance in my career.
```

**Leadership (OP5–OP13)**
```
OP5:  Senior Leaders are approachable.
OP6:  Senior Leaders foster open and honest communication.
OP7:  Senior Leaders communicate clear and consistent messages.
OP8:  Senior Leaders create excitement for future of my Business.
OP9:  My Leadership team gives highest priority to safety.
OP10: I feel that my senior leaders support my development.
OP11: Our leaders consistently role model the Group Value of Integrity.
OP12: Our leaders role model the Group Value of Speed.
OP13: Our leaders role model the Group Values of Commitment, Seamlessness & Passion.
```

**Performance Culture (OP14–OP28)**
```
OP14: I get a sense of accomplishment from my work.
OP15: I can freely express my ideas, thoughts and suggestions without fear.
OP16: I feel valued and appreciated.
OP17: Good Ideas are adopted here regardless of who suggests them.
OP18: The people I work with share information and ideas.
OP19: Promotion and growth processes in my organization are fair.
OP20: I am empowered to make decisions to do my job effectively.
OP21: When my work is good, my contributions have been recognized last year.
OP22: I am paid fairly for my work.
OP23: In my function/team, we make good use of data/technology.
OP24: Health and wellbeing offerings provided by my Business meet my needs.
OP25: I have colleagues at work that I can lean on during difficult periods.
OP26: The administration of health benefits is efficient and hassle-free.
OP27: I believe that feedback shared through Vibes will lead to meaningful actions.
OP28: My team and my manager created action plans based on ABG Vibes 2025 feedback.
```

**Manager Effectiveness (OP36–OP47)**
```
OP36: My manager clearly communicates what is expected of me.
OP37: My manager provides me with helpful and timely feedback.
OP38: My manager encourages me to come up with new and better ways.
OP39: My manager provides necessary support and guidance when I face challenges.
OP40: My manager holds me accountable for my performance / deliverables.
OP41: My manager cares for my wellbeing.
OP42: My manager treats me with respect.
OP43: My manager actively helps me in my development.
OP44: My manager encourages me to explore roles in other parts of the Business.
OP45: My manager has had candid career conversations with me in last one year.
OP46: My manager helps me identify the capabilities I need for future roles.
OP47: My manager clearly explains the criteria and rationale behind decisions.
```

**Onboarding (OP49, OP50, OP52)**
```
OP49: The onboarding process in my Business helped me settle down in my job well.
OP50: My manager helped me settle in my role well.
OP52: The onboarding process in my Business helped me settle down in my job well.
```

**Self-reflection (1–10 scale — different scale, exclude from main analysis)**
```
OP88–OP91: Self-rating questions (1–10 scale, NOT 1–5 Likert)
```

**Role transition (Yes/No)**
```
OP51: Have you undergone a role transition within the Business or the Group in last 12 months?
```

---

## 5. Critical corrections to `preprocess/extract.py`

The original extract.py had several wrong assumptions. Replace with this corrected version:

```python
# preprocess/extract.py — CORRECTED for real data structure
import pandas as pd
import numpy as np
import json
import os
import sys

def extract(excel_path):
    xl = pd.ExcelFile(excel_path)
    df = xl.parse('Data')

    # CRITICAL: Skip first 2 metadata rows
    df = df.iloc[2:].reset_index(drop=True)

    # ── Lookup maps for all CQ columns ──
    def get_lookup(sheet):
        try:
            ldf = xl.parse(sheet)
            m = {}
            for _, row in ldf.iterrows():
                try:
                    code = int(float(row.iloc[0]))
                    name = row.iloc[2]
                    if pd.notna(name) and str(name) not in ['Level 1', 'NaN', 'nan']:
                        m[code] = str(name).strip()
                except:
                    pass
            return m
        except:
            return {}

    cq9_map  = get_lookup('CQ9')   # Business names
    cq24_map = get_lookup('CQ24')  # Generation
    cq25_map = get_lookup('CQ25')  # Gender
    cq27_map = get_lookup('CQ27')  # Job Band Level
    cq29_map = get_lookup('CQ29')  # Tenure band
    cq43_map = get_lookup('CQ43')  # Country

    # ── Column references (columns have leading spaces) ──
    COL_BUSINESS   = ' CQ9 Org Structure 1'
    COL_ORG        = ' CQ2 Organization Structure'
    COL_DEPT       = ' CQ6 Department Structure'
    COL_FUNCTION   = ' CQ7 Function Structure'
    COL_AGE        = ' CQ23 Age'
    COL_GENERATION = ' CQ24 Generation Cohort'
    COL_GENDER     = ' CQ25 Gender'
    COL_JOB_BAND   = ' CQ27 Job Band Level'
    COL_TENURE     = ' CQ29 Tenure'
    COL_COUNTRY    = ' CQ43 Country'
    COL_BU         = ' CQ47 Business Unit'
    COL_IS_MANAGER = ' CQ52 Manager (Y/N as per WTW HRIS)'
    COL_ABGLP      = ' CQ35 ABGLP (Y/N)'

    # ── OP question columns ──
    # Scale: 1=Agree, 2=Tend to Agree, 3=?, 4=Tend to Disagree, 5=Disagree
    # Favourability: score = 6 - raw_value (so 1=best=5.0, 5=worst=1.0)
    op_cols = [c for c in df.columns if str(c).strip().startswith('OP')]

    # Exclude self-reflection (1-10 scale) and yes/no questions
    EXCLUDE_OPS = [
        c for c in op_cols
        if any(kw in str(c) for kw in ['OP88', 'OP89', 'OP90', 'OP91', 'OP51'])
    ]
    op_likert = [c for c in op_cols if c not in EXCLUDE_OPS]

    # ── Category to OP column mapping ──
    def find_op_col(op_id):
        for c in df.columns:
            if str(c).strip().startswith(op_id + ' ') or str(c).strip() == op_id:
                return c
        return None

    CATEGORIES = {
        'Engagement': ['OP1', 'OP2', 'OP4', 'OP48'],
        'Development & Career': ['OP29', 'OP30', 'OP31', 'OP32', 'OP33', 'OP34'],
        'Leadership': ['OP5', 'OP6', 'OP7', 'OP8', 'OP9', 'OP10', 'OP11', 'OP12', 'OP13'],
        'Performance Culture': ['OP14', 'OP15', 'OP16', 'OP17', 'OP18', 'OP19',
                                'OP20', 'OP21', 'OP22', 'OP23', 'OP24', 'OP25',
                                'OP26', 'OP27', 'OP28'],
        'Manager Effectiveness': ['OP36', 'OP37', 'OP38', 'OP39', 'OP40', 'OP41',
                                  'OP42', 'OP43', 'OP44', 'OP45', 'OP46', 'OP47'],
        'Onboarding': ['OP49', 'OP50', 'OP52'],
    }

    CAT_COLS = {
        cat: [find_op_col(op) for op in ops if find_op_col(op)]
        for cat, ops in CATEGORIES.items()
    }

    def compute_scores(group_df):
        """Compute favourability scores per category for a group of rows."""
        result = {}
        all_scores = []
        for cat, cols in CAT_COLS.items():
            scores = []
            for col in cols:
                vals = pd.to_numeric(group_df[col], errors='coerce').dropna()
                fav = 6 - vals  # Convert to favourability (1=best, 5=best)
                scores.extend(fav.tolist())
            avg = round(float(np.mean(scores)), 2) if scores else None
            result[cat] = avg
            if avg:
                all_scores.append(avg)
        result['Overall'] = round(float(np.mean(all_scores)), 2) if all_scores else None
        return result

    def compute_favourability_pct(group_df, cols):
        """% of responses scoring 4 or 5 (favourability ≥ 4)."""
        all_vals = []
        for col in cols:
            vals = pd.to_numeric(group_df[col], errors='coerce').dropna()
            fav = 6 - vals
            all_vals.extend(fav.tolist())
        if not all_vals:
            return 0, 0
        favourable = sum(1 for v in all_vals if v >= 4)
        unfavourable = sum(1 for v in all_vals if v <= 2)
        pct_fav = round(favourable / len(all_vals) * 100, 1)
        net_fav = round((favourable - unfavourable) / len(all_vals) * 100, 1)
        return pct_fav, net_fav

    # ── Decode demographic columns ──
    df['_business']   = pd.to_numeric(df[COL_BUSINESS],   errors='coerce').map(cq9_map)
    df['_generation'] = pd.to_numeric(df[COL_GENERATION], errors='coerce').map(cq24_map)
    df['_gender']     = pd.to_numeric(df[COL_GENDER],     errors='coerce').map(cq25_map)
    df['_job_level']  = pd.to_numeric(df[COL_JOB_BAND],   errors='coerce').map(cq27_map)
    df['_tenure']     = pd.to_numeric(df[COL_TENURE],     errors='coerce').map(cq29_map)
    df['_country']    = pd.to_numeric(df[COL_COUNTRY],    errors='coerce').map(cq43_map)
    df['_is_manager'] = pd.to_numeric(df[COL_IS_MANAGER], errors='coerce').map({1: 'Yes', 2: 'No'})
    df['_abglp']      = pd.to_numeric(df[COL_ABGLP],      errors='coerce').map({1: 'Yes', 2: 'No'})

    # ── BUILD businesses.json ──
    businesses = []
    for biz_code, biz_name in sorted(cq9_map.items()):
        mask = pd.to_numeric(df[COL_BUSINESS], errors='coerce') == biz_code
        biz_df = df[mask]
        n = len(biz_df)
        if n == 0:
            continue

        scores = compute_scores(biz_df)
        overall = scores.get('Overall', 0)

        # Favourability %
        all_op_cols = [c for cat_cols in CAT_COLS.values() for c in cat_cols]
        pct_fav, net_fav = compute_favourability_pct(biz_df, all_op_cols)

        band = 'strong' if overall >= 4.0 else 'healthy' if overall >= 3.5 else \
               'watch'  if overall >= 3.0 else 'concern'

        businesses.append({
            'name':       biz_name,
            'code':       biz_code,
            'n':          n,
            'overall':    overall,
            'band':       band,
            'pct_favourable': pct_fav,
            'net_favourable': net_fav,
            'categories': {
                'Engagement':           scores.get('Engagement'),
                'Leadership':           scores.get('Leadership'),
                'Performance Culture':  scores.get('Performance Culture'),
                'Development & Career': scores.get('Development & Career'),
                'Manager Effectiveness':scores.get('Manager Effectiveness'),
                'Onboarding':           scores.get('Onboarding'),
            }
        })

    businesses.sort(key=lambda x: x['overall'], reverse=True)
    for i, b in enumerate(businesses):
        b['rank'] = i + 1

    # ── BUILD responses.json ──
    # Sample up to 2000 rows for performance — keep demographic coverage
    sample_size = min(2000, len(df))
    sample_df = df.sample(sample_size, random_state=42).reset_index(drop=True)

    responses = []
    for idx, row in sample_df.iterrows():
        # Build scores dict from OP columns
        scores_dict = {}
        for col in op_likert:
            op_id = str(col).strip().split(' ')[0]  # e.g. 'OP1'
            val = pd.to_numeric(row[col], errors='coerce')
            if pd.notna(val):
                scores_dict[op_id] = float(6 - val)  # Convert to favourability

        # Compute flat theme averages
        theme_scores = {}
        for cat, ops in CATEGORIES.items():
            cat_vals = []
            for op in ops:
                col = find_op_col(op)
                if col:
                    val = pd.to_numeric(row[col], errors='coerce')
                    if pd.notna(val):
                        cat_vals.append(float(6 - val))
            key = cat.lower().replace(' ', '_').replace('&', 'and').replace('__', '_')
            theme_scores[key] = round(float(np.mean(cat_vals)), 2) if cat_vals else None

        overall_val = round(float(np.mean([v for v in theme_scores.values() if v])), 2) \
                      if any(theme_scores.values()) else None

        responses.append({
            'employee_id':  f'E{idx+1:05d}',
            'business':     str(row['_business']) if pd.notna(row['_business']) else 'Unknown',
            'generation':   str(row['_generation']) if pd.notna(row['_generation']) else 'Unknown',
            'gender':       str(row['_gender']) if pd.notna(row['_gender']) else 'Unknown',
            'job_level':    str(row['_job_level']) if pd.notna(row['_job_level']) else 'Unknown',
            'tenure':       str(row['_tenure']) if pd.notna(row['_tenure']) else 'Unknown',
            'country':      str(row['_country']) if pd.notna(row['_country']) else 'Unknown',
            'is_manager':   str(row['_is_manager']) if pd.notna(row['_is_manager']) else 'No',
            'abglp':        str(row['_abglp']) if pd.notna(row['_abglp']) else 'No',
            'is_active':    True,
            'year':         '2026',
            'month':        'Jan \'26',
            # Flat theme scores (for persona builder and hypothesis testing)
            'engagement':            theme_scores.get('engagement'),
            'leadership':            theme_scores.get('leadership'),
            'performance_culture':   theme_scores.get('performance_culture'),
            'development_and_career':theme_scores.get('development_and_career'),
            'manager_effectiveness': theme_scores.get('manager_effectiveness'),
            'onboarding':            theme_scores.get('onboarding'),
            'overall':               overall_val,
            # Nested question scores (for Pearson correlations)
            'scores': scores_dict
        })

    # ── BUILD questions.json ──
    questions = []
    cat_names = {
        'Engagement':            'Engagement',
        'Development & Career':  'Development & Career',
        'Leadership':            'Leadership',
        'Performance Culture':   'Performance Culture',
        'Manager Effectiveness': 'Manager Effectiveness',
        'Onboarding':            'Onboarding',
    }

    for cat, ops in CATEGORIES.items():
        for op in ops:
            col = find_op_col(op)
            if col:
                full_text = str(col).strip()
                # Remove OP prefix: "OP1 I feel proud..." → "I feel proud..."
                text = ' '.join(full_text.split(' ')[1:]).strip()
                questions.append({
                    'id':          op,
                    'text':        text,
                    'short_label': op,
                    'category':    cat,
                    'type':        'likert_1_5'
                })

    # ── Save all files ──
    os.makedirs('../data', exist_ok=True)

    with open('../data/businesses.json', 'w') as f:
        json.dump(businesses, f, indent=2)
    print(f"✓ businesses.json — {len(businesses)} businesses")

    with open('../data/responses.json', 'w') as f:
        json.dump(responses, f, indent=2)
    print(f"✓ responses.json — {len(responses)} employee records")

    with open('../data/questions.json', 'w') as f:
        json.dump(questions, f, indent=2)
    print(f"✓ questions.json — {len(questions)} questions")

    # Empty files
    for fname in ['hypotheses.json', 'saved_personas.json', 'open_text_raw.json', 'sentiments.json']:
        fpath = f'../data/{fname}'
        if not os.path.exists(fpath):
            with open(fpath, 'w') as f:
                json.dump([] if fname != 'sentiments.json' else {'responses': []}, f)
            print(f"✓ {fname} — created empty")

    print(f"\n✓ All files written to ../data/")
    return businesses, responses, questions


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'Demo_Data_Vibes_2026_to_send.xlsx'
    extract(path)
```

---

## 6. Corrections to `persona.js` — real dimension names

The original used assumed dimension names. Use these exact field names from `responses.json`:

```javascript
// In server/routes/persona.js
// GET /api/persona/dimensions
// These are the EXACT field names in responses.json

const dims = [
  'business',
  'generation',
  'gender',
  'job_level',
  'tenure',
  'country',
  'is_manager',
  'abglp'
];

// Dimension labels for UI
const DIM_LABELS = {
  business:    'Business',
  generation:  'Generation',
  gender:      'Gender',
  job_level:   'Job Band Level',
  tenure:      'Tenure Band',
  country:     'Country',
  is_manager:  'Manager (Y/N)',
  abglp:       'ABGLP Talent Pool'
};
```

---

## 7. Corrections to `persona.js` — real theme field names

The original `computeGroupScores` mapped themes to wrong keys. Use these exact flat field names from `responses.json`:

```javascript
// In server/routes/persona.js — replace THEMES and computeGroupScores

const THEMES = [
  { label: 'Engagement',            key: 'engagement' },
  { label: 'Leadership',            key: 'leadership' },
  { label: 'Performance Culture',   key: 'performance_culture' },
  { label: 'Development & Career',  key: 'development_and_career' },
  { label: 'Manager Effectiveness', key: 'manager_effectiveness' },
  { label: 'Onboarding',            key: 'onboarding' },
];

function computeGroupScores(group, themes) {
  const result = {};
  for (const theme of themes) {
    const vals = group
      .map(u => u[theme.key])
      .filter(v => v != null && v > 0);
    result[theme.label] = {
      mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
      std:  stdDev(vals),
      n:    vals.length
    };
  }
  return result;
}
```

---

## 8. Corrections to `hypothesis.js` — real field names

The scoreKey lookup maps theme names to flat fields in responses.json:

```javascript
// In server/routes/hypothesis.js — replace score lookup in POST /test

// Map Cerebras-extracted variable name to flat field in responses.json
const VARIABLE_MAP = {
  'engagement':            'engagement',
  'leadership':            'leadership',
  'performance culture':   'performance_culture',
  'development':           'development_and_career',
  'development and career':'development_and_career',
  'manager effectiveness': 'manager_effectiveness',
  'onboarding':            'onboarding',
  'overall':               'overall',
};

// When getting scores for a variable:
const rawKey = (params.variable || '').toLowerCase().trim();
const scoreKey = VARIABLE_MAP[rawKey] || rawKey.replace(/ /g, '_');
const scores = testGroup
  .map(u => u.scores?.[params.variable] || u[scoreKey] || u.overall || 0)
  .filter(v => v > 0);
```

---

## 9. Corrections to `statistical.js` — real OP column IDs

The correlations endpoint uses `r.scores[questionId]` where `questionId` is like `'OP1'`. This matches the `scores` dict in responses.json which uses `{ OP1: 4.8, OP2: 4.2, ... }` keys. No change needed — this is already correct.

---

## 10. Corrections to built-in cohorts in `persona.js`

Replace assumed cohort definitions with real dimension values:

```javascript
// In server/routes/persona.js — replace BUILTIN_COHORTS

const BUILTIN_COHORTS = {
  gen_z: {
    label: 'Gen Z',
    filter: [{ dimension: 'generation', operator: 'eq', value: 'Gen Z' }]
  },
  gen_y: {
    label: 'Gen Y (Millennials)',
    filter: [{ dimension: 'generation', operator: 'eq', value: 'Gen Y' }]
  },
  female: {
    label: 'Female Employees',
    filter: [{ dimension: 'gender', operator: 'eq', value: 'Female' }]
  },
  new_joiners: {
    label: 'New Joiners (0-2 yrs)',
    filter: [{ dimension: 'tenure', operator: 'eq', value: '0-2' }]
  },
  junior_mgmt: {
    label: 'Junior Management',
    filter: [{ dimension: 'job_level', operator: 'eq', value: 'Junior Management' }]
  },
  senior_mgmt: {
    label: 'Senior Management',
    filter: [{ dimension: 'job_level', operator: 'eq', value: 'Senior Management' }]
  },
  abglp: {
    label: 'ABGLP Talent Pool',
    filter: [{ dimension: 'abglp', operator: 'eq', value: 'Yes' }]
  },
  managers: {
    label: 'People Managers',
    filter: [{ dimension: 'is_manager', operator: 'eq', value: 'Yes' }]
  }
};
```

---

## 11. No mock data files needed — all come from preprocess

**Remove these instructions from the original .md:**
- "Generate 500 sample records"
- "Generate 200 sentiment records"
- "Generate 50 questions"

**Replace with:**
Run `python preprocess/extract.py Demo_Data_Vibes_2026_to_send.xlsx` from the project root.
This generates all required JSON files from the real client data automatically.

The `sentiments.json` starts empty — it gets populated when `POST /api/sentiment/classify`
is called after upload. For the POC, the sentiment tab will show a message
"Run sentiment analysis to generate insights" until it is processed.

---

## 12. Updated run instructions

```bash
# 1. Place the Excel file in the project root
cp Demo_Data_Vibes_2026_to_send.xlsx ./

# 2. Run preprocessing to generate all data JSON files
cd preprocess
python extract.py ../Demo_Data_Vibes_2026_to_send.xlsx
cd ..

# 3. Verify data files were created
ls -la data/
# Should show: businesses.json, responses.json, questions.json,
#              hypotheses.json, saved_personas.json, sentiments.json

# 4. Start server
node server/index.js

# 5. Frontend team starts React app separately
cd client && npm run dev
```

---

## 13. Key numbers for the demo (real, from actual data)

Use these in all Cerebras prompts and hardcoded references:

```
Total respondents:     55,459
Number of businesses:  22
Number of BU codes:    varies per business
Response scale:        1=Agree → 5=Disagree (favourability = 6 - raw)

Group overall score:   4.46 / 5.0
Strongest category:    Engagement (4.63 avg)
Weakest category:      Performance Culture (4.32 avg)

Top business:          Birla Carbon / Birla Estates / Metals / Mining (all 4.47)
Lowest business:       ABG Headquarters (4.32, n=13 — flag as small sample)
Lowest meaningful:     Seamex (4.42, n=117)

Largest business:      Cement HO (12,925 respondents)
Second largest:        Financial Services HO (12,102 respondents)

Generation split:      Gen Y 50%, Gen X 20%, Gen Z 13%, DOB N/A 16%
Gender split:          Male 85%, Female 15%
Largest tenure band:   0-2 years (27.5%) — youngest workforce profile
```

---

## 15. Fix — Remove hardcoded `knownStats` from `/validate-statistical`

This is the only hardcoded piece in the entire backend. The original
`GET /validate-statistical` in `sentiment.js` hardcodes r-values like this:

```javascript
// WRONG — hardcoded, will never update when new data is uploaded
const knownStats = [
  { driver: 'Workload', r: -0.62, finding: '...' },
  { driver: 'Leadership', r: 0.71, finding: '...' },
];
```

Replace the entire route with this dynamic version that computes real Pearson
correlations from the uploaded `responses.json` at request time:

```javascript
// server/routes/sentiment.js
// GET /api/sentiment/validate-statistical — FULLY DYNAMIC VERSION
router.get('/validate-statistical', async (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const responses  = read('responses.json');
    const questions  = read('questions.json');

    // ── Step 1: Compute real Pearson correlations from uploaded data ──
    // Use OP1 (I feel proud to be ABG employee) as the Engagement base question
    // These OP IDs are verified to exist in the real ABG Vibes Excel
    const BASE_QUESTION = 'OP1';

    // One representative question per sentiment topic
    // All verified against actual column names in the Excel
    const CATEGORY_REPS = {
      'Career Growth': 'OP32',  // I feel my career goals are being met
      'Recognition':   'OP21',  // My contributions have been recognized
      'Leadership':    'OP5',   // Senior Leaders are approachable
      'Compensation':  'OP22',  // I am paid fairly for my work
      'Wellbeing':     'OP24',  // Health & wellbeing offerings meet my needs
    };

    const baseScores = responses
      .map(r => r.scores?.[BASE_QUESTION])
      .filter(v => v != null && !isNaN(v));

    const computedStats = Object.entries(CATEGORY_REPS).map(([driver, opId]) => {
      const otherScores = responses
        .map(r => r.scores?.[opId])
        .filter(v => v != null && !isNaN(v));

      const len = Math.min(baseScores.length, otherScores.length);
      const r   = len >= 10
        ? pearsonR(baseScores.slice(0, len), otherScores.slice(0, len))
        : 0;

      const absR     = Math.abs(r);
      const strength = absR >= 0.5 ? 'Strong' : absR >= 0.2 ? 'Moderate' : 'Weak';
      const direction = r >= 0 ? 'positive' : 'negative';
      const q = questions.find(q => q.id === opId);

      return {
        driver,
        question:  q?.text || opId,
        r_value:   r,
        finding:   `${strength} ${direction} impact on Engagement (r = ${r})`
      };
    });

    // ── Step 2: Build topic sentiment summary from NLP data ──
    const topicMap = {};
    for (const r of sentiments.responses) {
      for (const topic of (r.topics || [])) {
        if (!topicMap[topic]) topicMap[topic] = [];
        topicMap[topic].push(r.score);
      }
    }

    if (Object.keys(topicMap).length === 0) {
      return res.json({
        validation: [],
        message: 'No sentiment data available yet. Run sentiment classification first.'
      });
    }

    const topicSentiments = Object.entries(topicMap).map(([topic, scores]) => ({
      topic,
      avg_sentiment: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
    }));

    // ── Step 3: Cerebras judges alignment ──
    const prompt = `You are an HR analytics expert.
Compare NLP sentiment findings from open-text employee responses against
real statistical Pearson correlation findings computed from survey data.

For each driver, determine if what employees say in text aligns with
what the numbers show statistically.

Topic sentiment from NLP open-text analysis:
${JSON.stringify(topicSentiments)}

Statistical correlations (computed dynamically from real uploaded data):
${JSON.stringify(computedStats)}

Return ONLY a JSON array, no explanation, no markdown:
[{
  "driver": "<name>",
  "statistical_finding": "<one sentence>",
  "r_value": <number>,
  "sentiment_alignment": "Consistent" | "Partially Consistent" | "Not Consistent",
  "validation_score": <integer 0-100>,
  "reasoning": "<one sentence explaining the alignment judgment>"
}]`;

    const response = await client.chat.completions.create({
      model:      process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }]
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json({ validation: JSON.parse(raw) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**What changed:**
- `knownStats` array deleted completely — no hardcoded r-values anywhere
- `pearsonR` is now imported from `stats.js` in `sentiment.js`
- r-values computed from actual `responses.json` at request time
- If new Excel uploaded tomorrow → scores regenerated → r-values recalculate → zero code changes
- `CATEGORY_REPS` maps sentiment topics to real OP question IDs (schema knowledge, not data)
- All 5 OP IDs verified to exist in the real ABG Vibes Excel file
- OP27 removed from CATEGORY_REPS — its actual text is "feedback through Vibes" not Workload
- Added `Wellbeing` (OP24) as a replacement — directly relevant to the topic

**Add `pearsonR` to the import line in `sentiment.js`:**
```javascript
// Change from:
const { mean, stdDev, pearsonR } = require('../lib/stats');
// This was already in the file — pearsonR is now actually used, so keep this import
```

---

## 16. Cross-check fixes — final corrections

These were found by running the actual Excel data through verification scripts.

### 16.1 — extract.py theme key generation has a bug

The extract.py in Section 5 uses:
```python
# BUG — produces 'development_&_career' not 'development_and_career'
key = cat.lower().replace(' ', '_').replace('&', 'and').replace('__', '_')
# For 'Development & Career':
# Step 1: 'development_&_career'
# Step 2: 'developmentand_career'  ← WRONG, no space around &
```

Fix — use this instead:
```python
# CORRECT
key = cat.lower().replace(' & ', '_and_').replace(' ', '_')
# For 'Development & Career': 'development_and_career' ✓
# For 'Manager Effectiveness': 'manager_effectiveness' ✓
# For 'Performance Culture':   'performance_culture' ✓
```

Apply this fix everywhere theme keys are generated in `extract.py`.

### 16.2 — OP88–OP91 (self-reflection questions) do NOT exist in the Excel

The Category and Items sheet lists OP88–OP91 but they are NOT in the Data sheet columns. The extract.py `EXCLUDE_OPS` filter for these will match nothing — harmless but unnecessary. Keep `OP51` exclusion (it's a Yes/No question that is in the data).

### 16.3 — `responses.json` must use `'is_manager'` field mapped from CQ52

CQ52 in the Excel is `Manager (Y/N as per WTW HRIS)` with values `1=Yes, 2=No`.
The extract.py already maps this to `is_manager: 'Yes'/'No'`.
Persona builder cohort `managers` filters on `{ dimension: 'is_manager', operator: 'eq', value: 'Yes' }` — confirmed correct.

### 16.4 — `abglp` field from CQ35

CQ35 is `ABGLP (Y/N)` — the ABG Leadership Programme talent pool flag.
Values: `1=Yes, 2=No`. Extract.py maps to `abglp: 'Yes'/'No'`.
Persona builder cohort `abglp` filters on `{ dimension: 'abglp', operator: 'eq', value: 'Yes' }` — confirmed correct.

### 16.5 — Section 2 file list is outdated — use Section 18.13 complete list

The file list in Section 2 of `ABG_EEI_PHASE2_FOUR_TABS.md` is incomplete.
Use the complete file list from **Section 18.13** of that document.

---

## 17. How to use both documents together

**For Claude Code — read in this order:**

1. Read `ABG_EEI_PHASE2_FOUR_TABS.md` fully first
2. Then read this document (`ABG_EEI_DATA_REALITY_UPDATE.md`) fully
3. Where this document contradicts the original — **this document wins**
4. Specifically:
   - Replace all of Section 5 (extract.py) with Section 5 of this document
   - Replace CATEGORY_REPS and dimension names in persona.js with Sections 6–10 of this document
   - Replace `/validate-statistical` route with Section 15 of this document
   - Use theme key generation fix from Section 16.1

**Priority order for conflicts:**
```
ABG_EEI_DATA_REALITY_UPDATE.md  (this file — highest priority)
    > ABG_EEI_PHASE2_FOUR_TABS.md Sections 18–21
    > ABG_EEI_PHASE2_FOUR_TABS.md Sections 15–17
    > ABG_EEI_PHASE2_FOUR_TABS.md Sections 5–8 (original routes)
```

---

## 14. Summary — what was assumed vs what is real

| Assumption in original .md | Reality from data |
|---|---|
| Mock data — generate 500 records | Real data — 55,459 rows from client Excel |
| Business names: Hindalco, UltraTech, Grasim | Real names: Cement HO, Financial Services HO, Novelis, etc. |
| Scores around 4.47 group avg | Group avg is 4.46, range is 4.32–4.47 |
| 6 questions per category | 4–15 questions per category (50 total OP questions) |
| Dimension names: region, potential, function, employment_type | Real names: business, generation, gender, job_level, tenure, country, is_manager, abglp |
| Cohorts: new_joiners, engineers_apac, senior_mgmt, gen_z | Real cohorts: gen_z, gen_y, female, new_joiners, junior_mgmt, senior_mgmt, abglp, managers |
| questions.json: generate 50 hypothetical | questions.json: 50 real OP questions from survey |
| responses.json: generate 500 with random scores | responses.json: 2000 sampled real employees with real scores |
| Theme keys: leadership, career_growth, work_environment, wellbeing | Real keys: leadership, performance_culture, development_and_career, manager_effectiveness, onboarding, engagement |
| Scores on 1–5 scale stored directly | Scores converted: favourability = 6 − raw_value |
| Column names: CQ9, OP1 (no space) | Actual column names have a LEADING SPACE: ' CQ9 Org Structure 1' |

