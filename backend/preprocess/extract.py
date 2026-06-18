#!/usr/bin/env python3
"""
ABG Vibes Excel -> JSON dynamic parser
Handles WTW Vibes format: CQ lookup sheets, embedded metadata rows, Category/Items mapping.
"""
import os, json, sys, re
import numpy as np
import pandas as pd


# ─── Score helpers ────────────────────────────────────────────────────────────

def score_to_band(score):
    if score >= 4.0: return "strong"
    if score >= 3.5: return "healthy"
    if score >= 3.0: return "watch"
    return "concern"

def compute_variance(category_scores):
    vals = [v for v in category_scores.values() if v is not None]
    if not vals: return 0
    mean = sum(vals) / len(vals)
    return round((sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5, 3)

def classify_cluster(overall, variance, median_score=4.0, median_variance=0.15):
    hi_score = overall >= median_score
    hi_var   = variance >= median_variance
    if hi_score and not hi_var: return "thriving"
    if not hi_score and not hi_var: return "atrisk"
    if hi_score and hi_var:     return "polarised"
    return "critical"

def fav_score(series):
    """Convert WTW Likert (1=Agree best, 5=Disagree worst) to 0-5 favourability."""
    nums = pd.to_numeric(series, errors='coerce').dropna()
    nums = nums[(nums >= 1) & (nums <= 6)]
    if len(nums) == 0: return None
    return round(float(6 - nums.mean()), 2)


# ─── STAGE 1: Sheet Classification ───────────────────────────────────────────

def classify_sheet(df, sheet_name):
    rows, cols = len(df), len(df.columns)
    if rows > 500 and cols > 10:
        return 'raw_data'
    if cols <= 3 and rows < 500:
        try:
            first_col  = df.iloc[:, 0].dropna()
            second_col = df.iloc[:, 1].dropna() if cols > 1 else None
            if first_col.dtype in ['int64', 'float64'] and second_col is not None:
                if second_col.dtype == object:
                    return 'lookup'
        except Exception:
            pass
    if 5 < rows < 300:
        numeric_cols = df.select_dtypes(include='number')
        if len(numeric_cols.columns) > 2:
            all_vals = numeric_cols.values.flatten()
            all_vals = all_vals[~np.isnan(all_vals)]
            if len(all_vals) > 0 and all_vals.min() >= 0.5 and all_vals.max() <= 6.0:
                return 'summary'
    return 'metadata'


# ─── STAGE 2a: WTW CQ Lookup Parsing ─────────────────────────────────────────

def parse_cq_lookup_sheet(df_raw):
    """Parse WTW CQ lookup sheet (read with header=None).
    Standard format (3 cols): rows 0-3 metadata, row 4 = 'Coding Value / Coding Definition / Level 1',
                               rows 5+ = (int_code, 'CQN:N', 'human_label').
    Multi-column (>3 cols): hierarchical org chart — range references like 'CQ2:N-M' in col 1
                             expand to all codes N..M mapping to Level 1 label in col 2.
    Returns dict[int_code -> human_label].
    """
    start_row = None
    for i in range(min(10, len(df_raw))):
        vals = [str(v).strip().lower() for v in df_raw.iloc[i] if pd.notna(v)]
        if any('coding value' in v for v in vals):
            start_row = i + 1
            break
    if start_row is None:
        return {}

    mapping = {}
    is_hierarchical = df_raw.shape[1] > 3

    for i in range(start_row, len(df_raw)):
        row      = df_raw.iloc[i]
        code_val = row.iloc[0]
        label    = None

        # Prefer col 2 (Level 1) as human label, fall back to col 1
        if len(row) > 2 and pd.notna(row.iloc[2]) and str(row.iloc[2]).strip():
            label = str(row.iloc[2]).strip()
        elif not is_hierarchical and len(row) > 1 and pd.notna(row.iloc[1]) and str(row.iloc[1]).strip():
            raw = str(row.iloc[1]).strip()
            if not re.match(r'^CQ\d+:\d+$', raw):
                label = raw

        if not label:
            continue

        if pd.notna(code_val):
            # Direct single code in column 0
            try:
                mapping[int(float(code_val))] = label
            except (ValueError, TypeError):
                pass
        elif is_hierarchical and len(row) > 1 and pd.notna(row.iloc[1]):
            # Range reference in col 1: "CQN:start-end" or "CQN:code"
            ref = str(row.iloc[1]).strip()
            m   = re.search(r':(\d+)(?:-(\d+))?$', ref)
            if m:
                start = int(m.group(1))
                end   = int(m.group(2)) if m.group(2) else start
                for code in range(start, end + 1):
                    mapping[code] = label

    return mapping


def build_cq_decode_map(raw_df, cq_lookup_maps):
    """Match Data columns to CQ lookups by extracting 'CQN' from column names.
    Normalises spaces so 'CQ9', 'CQ 9', 'C Q9' all resolve to the same lookup key."""
    decode_map = {}
    for col in raw_df.columns:
        col_norm = re.sub(r'\s+', '', str(col)).upper()
        m = re.search(r'CQ(\d+)', col_norm)
        if m:
            key = f'CQ{m.group(1)}'
            if cq_lookup_maps.get(key):
                decode_map[col] = cq_lookup_maps[key]
    return decode_map


# ─── STAGE 2b: Strip WTW Metadata Rows ───────────────────────────────────────

WTW_META_LABELS = {
    'question scale coding', 'question category name', 'question category coding',
    'scale', 'category name', 'question scale', 'category coding',
    'coding', 'scale type', 'question type',
}

def strip_wtw_metadata_rows(raw_df):
    """WTW Vibes embeds 2 metadata rows at the top of the Data sheet.
    Row 1: scale descriptions embedded in OP columns (object strings).
    Row 2: category names embedded in OP columns.
    Detect via the first unnamed column having WTW label strings."""
    first_col = raw_df.iloc[:, 0]
    if first_col.dtype != object:
        return raw_df
    drop_mask = first_col.apply(
        lambda x: isinstance(x, str) and str(x).strip().lower() in WTW_META_LABELS
    )
    if drop_mask.any():
        n_dropped = int(drop_mask.sum())
        raw_df    = raw_df[~drop_mask].reset_index(drop=True)
        print(f"  Stripped {n_dropped} WTW metadata rows; {len(raw_df)} respondents remain")
    return raw_df


def coerce_numeric_columns(df):
    """Convert object columns that are mostly numeric (Likert responses) to float64.
    WTW Vibes embeds category-name strings in OP cells throughout the data sheet,
    so threshold is checked against total row count, not non-NaN count."""
    for col in df.columns:
        if df[col].dtype != object:
            continue
        converted = pd.to_numeric(df[col], errors='coerce')
        if converted.notna().sum() > 0.5 * len(df[col]):
            df[col] = converted
    return df


# ─── STAGE 3: Column Profiling ────────────────────────────────────────────────

def profile_columns(df):
    profiles = {}
    for col in df.columns:
        series = df[col].dropna()
        if len(series) == 0:
            profiles[col] = 'empty'
            continue
        n_unique = series.nunique()
        dtype    = series.dtype

        if n_unique / max(len(series), 1) > 0.85:
            profiles[col] = 'id'
            continue

        if dtype in ['int64', 'float64']:
            col_min = float(series.min())
            col_max = float(series.max())
            in_range = series[(series >= 1) & (series <= 6)]
            if n_unique <= 8 and col_min >= 0 and col_max <= 9 and len(in_range) / len(series) > 0.85:
                profiles[col] = 'likert'
                continue

        if dtype == object and series.astype(str).str.len().mean() > 30:
            profiles[col] = 'freetext'
            continue

        if n_unique <= 60:
            profiles[col] = 'demographic'
            continue

        profiles[col] = 'unknown'

    return profiles


# ─── STAGE 4: Relationship Mapping (legacy fallback) ─────────────────────────

def map_relationships(raw_df, col_profiles, lookup_sheets):
    decode_map = {}
    demographic_cols = [c for c, t in col_profiles.items() if t == 'demographic']
    for col in demographic_cols:
        try:
            col_codes = set(raw_df[col].dropna().astype(int).unique())
        except Exception:
            continue
        best_match = None
        best_overlap = 0
        for sheet_name, lookup_df in lookup_sheets.items():
            try:
                lookup_codes = set(lookup_df.iloc[:, 0].dropna().astype(int).unique())
                overlap = len(col_codes & lookup_codes) / max(len(col_codes), 1)
                if overlap > best_overlap and overlap > 0.7:
                    best_overlap = overlap
                    best_match   = lookup_df
            except Exception:
                continue
        if best_match is not None:
            decode_map[col] = dict(zip(
                best_match.iloc[:, 0].astype(int),
                best_match.iloc[:, 1].astype(str),
            ))
    return decode_map


# ─── STAGE 5a: Dimension Detection ───────────────────────────────────────────

BU_COL_SIGNALS = [
    'business unit', 'businessunit', 'business_unit', 'org structure',
    'department', 'dept', 'division', 'entity', 'segment', 'company',
    'organisation', 'organization', 'org unit', 'orgunit', 'subsidiary',
    'vertical', 'business name', 'business area', 'business line',
    'business level', 'cost centre', 'cost center', 'profit centre', 'profit center',
]
ORG_SIGNALS    = ['industries', 'cement', 'carbon', 'novelis', 'metals', 'retail',
                  'capital', 'insurance', 'telecom', 'mining', 'textiles', 'birla',
                  'grasim', 'hindalco', 'ultratech', 'chemicals']
GEN_SIGNALS    = ['gen z', 'millennial', 'gen x', 'boomer', 'generation']
GENDER_SIGNALS = ['male', 'female', 'gender', 'prefer not']
BAND_SIGNALS   = ['band', 'level', 'management', 'executive', 'non-mgmt', 'mgmt']
TENURE_SIGNALS = ['year', 'tenure', '0-2', '3-5', '6+', '< 1', 'months']

GEN_HEADER     = ['generation', 'age group', 'age_group', 'generation cohort']
AGE_HEADER     = ['cq23', ' age', 'age band', 'age_band', 'age range', 'age bracket']
GENDER_HEADER  = ['gender', 'sex']
BAND_HEADER    = ['band', 'job band', 'job_band', 'job level', 'job_level', 'grade']
TENURE_HEADER  = ['tenure', 'years of service', 'years_of_service', 'experience']
COUNTRY_HEADER = ['country', 'nation', 'location', 'geography', 'region', 'cq43']
MANAGER_HEADER = ['is_manager', 'ismanager', 'people manager', 'manager status',
                  'manages team', 'management status', 'cq52']
ABGLP_HEADER   = ['abglp', 'leadership programme', 'leadership program',
                  'high potential', 'hi po', 'hipo', 'cq35']

AGE_VALUE_SIGNALS     = ['<21', '21-', '25-', '30-', '35-', '40-', '45-', '50-', '>55']
COUNTRY_SIGNALS       = ['india', 'usa', 'united states', 'uk', 'china', 'europe',
                         'australia', 'canada', 'singapore', 'uae', 'germany']
MANAGER_SIGNALS       = ['people manager', 'individual contributor']
ABGLP_SIGNALS         = ['abglp', 'leadership programme']


def detect_dimensions(decoded_df, decode_map):
    dimensions = {}

    # Collect BU candidate columns — only decoded text columns (object dtype).
    # Raw float columns are either Likert OP questions or unparsed CQ hierarchies;
    # neither should be selected as a business dimension.
    bu_candidates = []  # (n_unique, col, is_explicit_bu)
    for col in decoded_df.columns:
        col_lower = str(col).strip().lower()
        n = decoded_df[col].nunique()
        if not (2 < n < 5000):
            continue

        # Skip OP question columns — their question text can contain BU signal words
        # (e.g., "organization", "department") and must not be mistaken for BU identifiers.
        if re.match(r'^\s*OP\d+', str(col), re.IGNORECASE):
            continue

        # Only decoded text columns are valid BU candidates.
        # Numeric columns are either Likert OP questions or unparsed CQ hierarchies.
        if pd.api.types.is_numeric_dtype(decoded_df[col]):
            continue

        is_bu_named   = col_lower in ('bu', 'b_u', 'b.u.') or any(s in col_lower for s in BU_COL_SIGNALS)
        is_explicit   = 'business unit' in col_lower
        is_value_org  = (n < 500 and
                         any(s in ' '.join(str(v) for v in decoded_df[col].dropna().unique()[:20]).lower()
                             for s in ORG_SIGNALS))

        if is_bu_named or is_value_org:
            bu_candidates.append((n, col, is_explicit))

    if bu_candidates:
        bu_candidates.sort(key=lambda x: x[0])
        # Lowest cardinality = top-level business
        dimensions['business_unit']   = bu_candidates[0][1]
        dimensions['_bu_cardinality'] = bu_candidates[0][0]
        # Sub-unit: prefer explicitly named "Business Unit" > next cardinality level
        for n, col, is_explicit in bu_candidates[1:]:
            if n > bu_candidates[0][0]:
                dimensions.setdefault('sub_unit', col)
                if is_explicit:
                    dimensions['sub_unit'] = col
                    break

    # Demographics by column name and value signals
    for col in decoded_df.columns:
        col_lower = str(col).strip().lower()
        n = decoded_df[col].nunique()
        sample = ''
        if not pd.api.types.is_numeric_dtype(decoded_df[col]):
            sample = ' '.join(str(v) for v in decoded_df[col].dropna().unique()[:20]).lower()

        if any(s in col_lower for s in GEN_HEADER) and n <= 8:
            dimensions.setdefault('generation', col)
        elif any(s in sample for s in GEN_SIGNALS) and n <= 6:
            dimensions.setdefault('generation', col)

        if any(s in col_lower for s in AGE_HEADER) and n <= 12:
            dimensions.setdefault('age_group', col)
        elif any(s in sample for s in AGE_VALUE_SIGNALS) and n <= 12:
            dimensions.setdefault('age_group', col)

        if any(s in col_lower for s in GENDER_HEADER) and n <= 5:
            dimensions.setdefault('gender', col)
        elif any(s in sample for s in GENDER_SIGNALS) and n <= 5:
            dimensions.setdefault('gender', col)

        if any(s in col_lower for s in BAND_HEADER) and n <= 12:
            dimensions.setdefault('job_band', col)
        elif any(s in sample for s in BAND_SIGNALS) and n <= 10:
            dimensions.setdefault('job_band', col)

        if any(s in col_lower for s in TENURE_HEADER) and n <= 10:
            dimensions.setdefault('tenure', col)
        elif any(s in sample for s in TENURE_SIGNALS) and n <= 8:
            dimensions.setdefault('tenure', col)

        if any(s in col_lower for s in COUNTRY_HEADER) and n <= 150:
            dimensions.setdefault('country', col)
        elif any(s in sample for s in COUNTRY_SIGNALS) and n <= 100:
            dimensions.setdefault('country', col)

        if any(s in col_lower for s in MANAGER_HEADER) and n <= 5:
            dimensions.setdefault('is_manager', col)
        elif any(s in sample for s in MANAGER_SIGNALS) and n <= 5:
            dimensions.setdefault('is_manager', col)

        if any(s in col_lower for s in ABGLP_HEADER) and n <= 5:
            dimensions.setdefault('abglp', col)
        elif any(s in sample for s in ABGLP_SIGNALS) and n <= 5:
            dimensions.setdefault('abglp', col)

    # Fallback BU: highest-cardinality text column if nothing found
    if not dimensions.get('business_unit'):
        known = {v for k, v in dimensions.items() if not k.startswith('_')}
        best_col, best_n = None, 0
        for col in decoded_df.columns:
            if col in known or pd.api.types.is_numeric_dtype(decoded_df[col]):
                continue
            n = decoded_df[col].nunique()
            if 3 <= n <= 500 and n > best_n:
                best_n, best_col = n, col
        if best_col:
            dimensions['business_unit']   = best_col
            dimensions['_bu_cardinality'] = best_n

    return dimensions


# ─── STAGE 5b: Category Group Detection ──────────────────────────────────────

STANDARD_CATEGORIES = [
    'Engagement', 'Leadership', 'Performance Culture',
    'Development & Career', 'Manager Effectiveness', 'Onboarding',
]


def detect_category_groups(df, col_profiles, metadata_sheets):
    likert_cols = [c for c, t in col_profiles.items() if t == 'likert']
    category_map = {}

    # Build OP number → column name index
    op_num_to_col = {}
    for col in likert_cols:
        m = re.search(r'OP(\d+)', str(col), re.IGNORECASE)
        if m:
            op_num_to_col[int(m.group(1))] = col

    # Try 'Category and Items' sheet (WTW Vibes format)
    for sheet_name, meta_df in metadata_sheets.items():
        if 'category' not in str(sheet_name).lower():
            continue
        cols_lower = [str(c).lower() for c in meta_df.columns]
        if not (any('category' in c for c in cols_lower) and
                any('item' in c or 'number' in c for c in cols_lower)):
            continue

        # Category col: skip 'Category Set', prefer plain 'Category'
        cat_col  = next((c for c in meta_df.columns
                         if 'category' in str(c).lower() and 'set' not in str(c).lower()), None)
        item_col = next((c for c in meta_df.columns
                         if 'item' in str(c).lower() or 'number' in str(c).lower()), None)
        if not (cat_col and item_col):
            continue

        current_cat = None
        for _, row in meta_df.iterrows():
            cat_val  = row[cat_col]
            item_val = row[item_col]

            if pd.notna(cat_val) and str(cat_val).strip() and str(cat_val).strip().lower() not in ('nan', ''):
                raw = str(cat_val).strip()
                m   = re.match(r'^\d+[\.\)]\s*(.+)', raw)
                current_cat = m.group(1).strip() if m else raw

            if pd.notna(item_val) and current_cat:
                try:
                    item_int = int(float(item_val))
                    if item_int in op_num_to_col:
                        category_map.setdefault(current_cat, []).append(op_num_to_col[item_int])
                except (ValueError, TypeError):
                    pass

        if category_map:
            print(f"  Categories from '{sheet_name}': {list(category_map.keys())}")
            return category_map

    # Generic metadata sheet detection
    for sheet_name, meta_df in metadata_sheets.items():
        cols_lower = [str(c).lower() for c in meta_df.columns]
        if any('category' in c or 'dimension' in c or 'group' in c for c in cols_lower):
            cat_col = next((c for c in meta_df.columns
                           if any(w in str(c).lower() for w in ['category', 'dimension', 'group'])), None)
            q_col   = next((c for c in meta_df.columns
                           if any(w in str(c).lower() for w in ['question', 'item', 'code', 'col'])), None)
            if cat_col and q_col:
                for _, row in meta_df.iterrows():
                    cat  = str(row[cat_col]).strip()
                    q_id = str(row[q_col]).strip()
                    matching = [c for c in likert_cols if q_id.lower() in str(c).lower()]
                    if matching:
                        category_map.setdefault(cat, []).extend(matching)
                if category_map:
                    return category_map

    # Prefix-based fallback (strips leading non-alpha chars)
    prefixes = {}
    for col in likert_cols:
        m      = re.search(r'([A-Za-z]+)', str(col))
        prefix = m.group(1).upper() if m else 'Q'
        prefixes.setdefault(prefix, []).append(col)

    if len(prefixes) == 1:
        all_q      = list(prefixes.values())[0]
        chunk_size = max(1, len(all_q) // len(STANDARD_CATEGORIES))
        for i, cat in enumerate(STANDARD_CATEGORIES):
            start = i * chunk_size
            end   = start + chunk_size if i < len(STANDARD_CATEGORIES) - 1 else len(all_q)
            if start < len(all_q):
                category_map[cat] = all_q[start:end]
    else:
        for i, (prefix, cols) in enumerate(prefixes.items()):
            cat_name = STANDARD_CATEGORIES[i] if i < len(STANDARD_CATEGORIES) else f'Category {i+1}'
            category_map[cat_name] = cols

    return category_map


# ─── STAGE 6: Score Computation ──────────────────────────────────────────────

def compute_scores(decoded_df, dimensions, category_groups, col_profiles):
    bu_col = dimensions.get('business_unit')
    su_col = dimensions.get('sub_unit')

    if not bu_col:
        raise ValueError("Could not detect a Business Unit column. Check the data.")

    def cat_score(group, cols):
        valid = [c for c in cols if c in decoded_df.columns]
        if not valid:
            return None
        return fav_score(pd.Series(group[valid].values.flatten()))

    businesses = []
    for bu_name, group in decoded_df.groupby(bu_col):
        if not bu_name or str(bu_name) in ['nan', 'None', '']:
            continue
        cat_scores = {cat: s for cat, cols in category_groups.items()
                      if (s := cat_score(group, cols)) is not None}
        overall  = round(float(np.mean(list(cat_scores.values()))), 2) if cat_scores else 0
        variance = compute_variance(cat_scores)
        businesses.append({
            "name":             str(bu_name).strip(),
            "overall":          overall,
            "band":             score_to_band(overall),
            "categories":       cat_scores,
            "variance":         variance,
            "respondent_count": len(group),
        })

    businesses.sort(key=lambda x: x['overall'], reverse=True)
    for i, b in enumerate(businesses):
        b['rank'] = i + 1

    units = []
    if su_col:
        raw_units = []
        for (bu_name, su_name), group in decoded_df.groupby([bu_col, su_col]):
            cat_scores = {cat: s for cat, cols in category_groups.items()
                          if (s := cat_score(group, cols)) is not None}
            overall  = round(float(np.mean(list(cat_scores.values()))), 2) if cat_scores else 0
            variance = compute_variance(cat_scores)
            raw_units.append({
                "name":             str(su_name).strip(),
                "business":         str(bu_name).strip(),
                "overall":          overall,
                "band":             score_to_band(overall),
                "categories":       cat_scores,
                "variance":         variance,
                "respondent_count": len(group),
            })
        # Compute medians for relative cluster classification
        if raw_units:
            all_scores    = sorted(u["overall"]  for u in raw_units)
            all_variances = sorted(u["variance"] for u in raw_units)
            mid           = len(raw_units) // 2
            med_score     = all_scores[mid]
            med_variance  = all_variances[mid]
        else:
            med_score, med_variance = 4.0, 0.15
        for u in raw_units:
            u["cluster"] = classify_cluster(u["overall"], u["variance"], med_score, med_variance)
        units = raw_units

    cohorts = {}
    for dim_name, dim_col in dimensions.items():
        if dim_name.startswith('_') or dim_col == bu_col or dim_col == su_col:
            continue
        cohort_scores = []
        for cohort_val, group in decoded_df.groupby(dim_col):
            cat_scores = {cat: s for cat, cols in category_groups.items()
                          if (s := cat_score(group, cols)) is not None}
            overall = round(float(np.mean(list(cat_scores.values()))), 2) if cat_scores else 0
            cohort_scores.append({
                "name":             str(cohort_val),
                "overall":          overall,
                "categories":       cat_scores,
                "respondent_count": len(group),
            })
        cohorts[dim_name] = sorted(cohort_scores, key=lambda x: x['overall'], reverse=True)

    return businesses, units, cohorts


# ─── Fallback: read_from_summary ─────────────────────────────────────────────

def read_from_summary(summary_sheets, metadata_sheets):
    businesses, units, cohorts = [], [], {}
    CAT_MAP = {
        'engagement': 'Engagement', 'leadership': 'Leadership',
        'performance culture': 'Performance Culture', 'perf culture': 'Performance Culture',
        'development': 'Development & Career', 'development & career': 'Development & Career',
        'manager effectiveness': 'Manager Effectiveness', 'manager': 'Manager Effectiveness',
        'onboarding': 'Onboarding',
    }

    def map_cat(col_name):
        cn = str(col_name).strip().lower()
        for k, v in CAT_MAP.items():
            if k in cn: return v
        return None

    for sheet_name, df in summary_sheets.items():
        if df.empty or len(df) < 3:
            continue
        name_col, score_cols = None, {}
        for col in df.columns:
            series = df[col].dropna()
            if series.dtype == object and series.nunique() > 2 and name_col is None:
                name_col = col
            elif series.dtype in ['float64', 'int64']:
                vals = series.dropna()
                if len(vals) > 0 and 1.0 <= float(vals.mean()) <= 6.0:
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
                try:    overall = float(row[overall_col])
                except: continue
            else:
                cat_vals = [float(row[c]) for c in score_cols if c != '_overall'
                            and pd.notna(row.get(c))]
                overall = round(float(np.mean(cat_vals)), 2) if cat_vals else 0
            cats = {}
            for cat, col in score_cols.items():
                if cat == '_overall': continue
                try:    cats[cat] = round(float(row[col]), 2)
                except: cats[cat] = round(overall * 0.98, 2)
            variance = compute_variance(cats) if cats else 0
            businesses.append({
                'name': name, 'overall': round(overall, 2),
                'band': score_to_band(overall), 'categories': cats,
                'variance': variance, 'respondent_count': 0,
            })
    businesses.sort(key=lambda x: x['overall'], reverse=True)
    for i, b in enumerate(businesses):
        b['rank'] = i + 1
    return businesses, units, cohorts


# ─── Phase 2: responses.json + questions.json extraction ─────────────────────

def extract_phase2_data(raw_df, decoded_df, xl, output_dir,
                        detected_dims=None, detected_cats=None):
    """
    Generate responses.json, questions.json, question_bu_scores.json.
    Uses detected_dims (from detect_dimensions) and detected_cats (from detect_category_groups)
    when available, falling back to hardcoded CQ/OP numbers for WTW Vibes standard format.
    """
    import re as _re

    def find_col(cq_code, df=raw_df):
        cq_norm = _re.sub(r'\s+', '', cq_code).upper()
        for col in df.columns:
            col_norm = _re.sub(r'\s+', '', str(col)).upper()
            if _re.search(rf'(?<![A-Z0-9]){cq_norm}(?![A-Z0-9])', col_norm):
                return col
        return None

    def find_op_col(op_id):
        op_norm = _re.sub(r'\s+', '', op_id).upper()
        for col in raw_df.columns:
            col_norm = _re.sub(r'\s+', '', str(col)).upper()
            if col_norm == op_norm or col_norm.startswith(op_norm):
                return col
        return None

    def _dim_col(dim_key, *cq_fallbacks):
        """Return column: detected dimension first, then CQ code fallbacks."""
        if detected_dims and detected_dims.get(dim_key):
            return detected_dims[dim_key]
        for cq in cq_fallbacks:
            col = find_col(cq)
            if col:
                return col
        return None

    # ── Demographic column resolution (detected → CQ fallback) ────────────────
    col_biz    = _dim_col('business_unit', 'CQ9', 'CQ9 Org')
    col_age    = _dim_col('age_group',     'CQ23')
    col_gen    = _dim_col('generation',    'CQ24')
    col_gender = _dim_col('gender',        'CQ25')
    col_job    = _dim_col('job_band',      'CQ27')
    col_tenure = _dim_col('tenure',        'CQ29')
    col_country= _dim_col('country',       'CQ43')
    col_mgr    = _dim_col('is_manager',    'CQ52')
    col_abglp  = _dim_col('abglp',         'CQ35')

    print(f"  [Phase 2] Demographic columns resolved:")
    for name, col in [('business', col_biz), ('generation', col_gen), ('gender', col_gender),
                      ('job_band', col_job), ('tenure', col_tenure), ('country', col_country),
                      ('manager', col_mgr), ('abglp', col_abglp)]:
        print(f"    {name}: {col or 'NOT FOUND'}")

    # ── Category → column mapping (detected groups → CQ/OP fallback) ──────────
    # Hardcoded WTW Vibes OP numbers used only when detected_cats is unavailable.
    HARDCODED_CATEGORIES = {
        'Engagement':            ['OP1', 'OP2', 'OP4', 'OP48'],
        'Development & Career':  ['OP29', 'OP30', 'OP31', 'OP32', 'OP33', 'OP34'],
        'Leadership':            ['OP5', 'OP6', 'OP7', 'OP8', 'OP9', 'OP10', 'OP11', 'OP12', 'OP13'],
        'Performance Culture':   ['OP14', 'OP15', 'OP16', 'OP17', 'OP18', 'OP19', 'OP20', 'OP21',
                                  'OP22', 'OP23', 'OP24', 'OP25', 'OP26', 'OP27', 'OP28'],
        'Manager Effectiveness': ['OP36', 'OP37', 'OP38', 'OP39', 'OP40', 'OP41',
                                  'OP42', 'OP43', 'OP44', 'OP45', 'OP46', 'OP47'],
        'Onboarding':            ['OP49', 'OP50', 'OP52'],
    }

    if detected_cats:
        # Use detected category groups — full column names already resolved
        CAT_COLS = {cat: [c for c in cols if c in raw_df.columns]
                    for cat, cols in detected_cats.items()}
        print(f"  [Phase 2] Using detected category groups: {list(CAT_COLS.keys())}")
    else:
        CAT_COLS = {
            cat: [find_op_col(op) for op in ops if find_op_col(op)]
            for cat, ops in HARDCODED_CATEGORIES.items()
        }
        print(f"  [Phase 2] Using hardcoded WTW Vibes category mapping")

    EXCLUDE_OPS = ['OP88', 'OP89', 'OP90', 'OP91', 'OP51']
    all_op_cols = [c for c in raw_df.columns if _re.sub(r'\s+', '', str(c)).upper().startswith('OP')
                   and not any(_re.sub(r'\s+', '', ex) in _re.sub(r'\s+', '', str(c)).upper()
                               for ex in EXCLUDE_OPS)]

    # Use full dataset — no row cap
    sample_n   = len(decoded_df)
    sample_df  = decoded_df.reset_index(drop=True)
    raw_sample = raw_df.reset_index(drop=True)

    responses = []
    for idx in range(len(sample_df)):
        dec_row = sample_df.iloc[idx]
        raw_row = raw_sample.iloc[idx]

        # Build nested OP scores (favourability = 6 - raw)
        scores_dict = {}
        for col in all_op_cols:
            op_id = str(col).strip().split(' ')[0]
            val = pd.to_numeric(raw_row.get(col), errors='coerce')
            if pd.notna(val) and 1 <= val <= 5:
                scores_dict[op_id] = round(float(6 - val), 2)

        # Compute flat theme averages (theme key fix: ' & ' → '_and_')
        theme_scores = {}
        for cat, cols in CAT_COLS.items():
            cat_vals = []
            for col in cols:
                val = pd.to_numeric(raw_row.get(col), errors='coerce')
                if pd.notna(val) and 1 <= val <= 5:
                    cat_vals.append(float(6 - val))
            key = cat.lower().replace(' & ', '_and_').replace(' ', '_')
            if key == 'engagement_index':
                key = 'engagement'
            theme_scores[key] = round(float(np.mean(cat_vals)), 2) if cat_vals else None

        all_theme_vals = [v for v in theme_scores.values() if v is not None]
        overall_val    = round(float(np.mean(all_theme_vals)), 2) if all_theme_vals else None

        def str_val(col, fallback='Unknown'):
            if not col: return fallback
            v = dec_row.get(col)
            return str(v).strip() if pd.notna(v) and str(v).strip() not in ['nan', ''] else fallback

        responses.append({
            'employee_id':            f'E{idx+1:05d}',
            'business':               str_val(col_biz),
            'age_group':              str_val(col_age),
            'generation':             str_val(col_gen),
            'gender':                 str_val(col_gender),
            'job_level':              str_val(col_job),
            'tenure':                 str_val(col_tenure),
            'country':                str_val(col_country),
            'is_manager':             str_val(col_mgr,   'No'),
            'abglp':                  str_val(col_abglp, 'No'),
            'is_active':              True,
            'year':                   '2026',
            'month':                  "Jan '26",
            **theme_scores,
            'overall':                overall_val,
            'scores':                 scores_dict,
        })

    # Build questions.json from resolved CAT_COLS (works for both detected and hardcoded mapping)
    questions = []
    for cat, cols in CAT_COLS.items():
        for col in cols:
            full_text = str(col).strip()
            # Strip leading OP-code prefix (e.g. "OP1 I feel proud…" → "I feel proud…")
            parts = full_text.split(' ', 1)
            text = parts[1].strip() if len(parts) > 1 and _re.match(r'^OP\d+$', parts[0]) else full_text
            words = text.split()
            short = ' '.join(words[:6]) + ('…' if len(words) > 6 else '')
            op_id = parts[0] if len(parts) > 1 and _re.match(r'^OP\d+$', parts[0]) else col
            questions.append({
                'id':          op_id,
                'text':        text,
                'short_label': short,
                'category':    cat,
                'type':        'likert_1_5',
            })

    with open(f"{output_dir}/responses.json", 'w', encoding='utf-8') as f:
        json.dump(responses, f, indent=2)
    print(f"  [Phase 2] responses.json — {len(responses)} employee records")

    with open(f"{output_dir}/questions.json", 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2)
    print(f"  [Phase 2] questions.json — {len(questions)} questions")

    # ── BU-level question means (full dataset, not sample) ────────────────────
    # Pearson on individual rows gives near-zero r (low within-person variance
    # when most respondents answer identically). Computing means per business
    # unit first (415 BUs) then correlating across BUs gives statistically
    # meaningful results that HR directors can actually interpret.
    from collections import defaultdict as _dd
    bu_q_sums  = _dd(lambda: _dd(list))   # bu → qid → [scores]
    col_bu_raw = col_biz  # already resolved via _dim_col('business_unit', 'CQ9', ...)

    for i in range(len(decoded_df)):
        dec_row = decoded_df.iloc[i]
        raw_row = raw_df.iloc[i]
        bu_name  = str(dec_row.get(col_bu_raw, 'Unknown')).strip() if col_bu_raw else 'Unknown'
        if not bu_name or bu_name in ('nan', ''):
            bu_name = 'Unknown'
        for op_col in all_op_cols:
            op_id = str(op_col).strip().split(' ')[0]
            val   = pd.to_numeric(raw_row.get(op_col), errors='coerce')
            if pd.notna(val) and 1 <= val <= 5:
                bu_q_sums[bu_name][op_id].append(float(6 - val))

    # {question_id → {bu_name → mean_score}}
    q_bu_scores = {}
    for bu, q_map in bu_q_sums.items():
        for qid, vals in q_map.items():
            if qid not in q_bu_scores:
                q_bu_scores[qid] = {}
            q_bu_scores[qid][bu] = round(sum(vals) / len(vals), 4)

    with open(f"{output_dir}/question_bu_scores.json", 'w', encoding='utf-8') as f:
        json.dump(q_bu_scores, f, indent=2)
    print(f"  [Phase 2] question_bu_scores.json — {len(q_bu_scores)} questions × {len(bu_q_sums)} BUs")


    # Create empty Phase 2 files if they don't exist
    for fname, default in [
        ('hypotheses.json',     []),
        ('saved_personas.json', []),
        ('open_text_raw.json',  []),
        ('sentiments.json',     {'responses': []}),
    ]:
        fpath = f"{output_dir}/{fname}"
        if not os.path.exists(fpath):
            with open(fpath, 'w') as f:
                json.dump(default, f)
            print(f"  [Phase 2] {fname} — created empty")


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def parse_excel(excel_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    xl = pd.ExcelFile(excel_path)
    print(f"Sheets found: {xl.sheet_names}")

    sheet_types = {}
    raw_dfs, lookup_sheets, summary_sheets, metadata_sheets = {}, {}, {}, {}

    # ── Pass 1: Parse all CQ lookup sheets by name pattern (WTW Vibes format) ──
    # Normalise sheet names so "CQ9", "CQ 9", "C Q9" are all treated as CQ lookup sheets.
    cq_lookup_maps = {}
    for sheet_name in xl.sheet_names:
        normalised = re.sub(r'\s+', '', str(sheet_name)).upper()
        if re.match(r'^CQ\d+$', normalised):
            df_raw  = xl.parse(sheet_name, header=None)
            mapping = parse_cq_lookup_sheet(df_raw)
            if mapping:
                cq_lookup_maps[normalised] = mapping   # store under normalised key
            sheet_types[sheet_name] = 'cq_lookup'
            print(f"  Sheet '{sheet_name}': cq_lookup ({len(mapping)} codes)")

    # ── Pass 2: Classify remaining sheets ─────────────────────────────────────
    for sheet_name in xl.sheet_names:
        normalised = re.sub(r'\s+', '', str(sheet_name)).upper()
        if re.match(r'^CQ\d+$', normalised):
            continue
        df = xl.parse(sheet_name)
        if df.empty:
            continue
        stype = classify_sheet(df, sheet_name)
        sheet_types[sheet_name] = stype
        print(f"  Sheet '{sheet_name}': {stype} ({len(df)} rows x {len(df.columns)} cols)")
        if stype == 'raw_data':   raw_dfs[sheet_name]        = df
        elif stype == 'lookup':   lookup_sheets[sheet_name]  = df
        elif stype == 'summary':  summary_sheets[sheet_name] = df
        elif stype == 'metadata': metadata_sheets[sheet_name]= df

    if raw_dfs:
        raw_sheet_name = max(raw_dfs, key=lambda k: len(raw_dfs[k]))
        raw_df         = raw_dfs[raw_sheet_name].copy()
        print(f"Using raw data sheet: '{raw_sheet_name}'")

        # Strip WTW embedded metadata rows (scale + category header rows)
        raw_df = strip_wtw_metadata_rows(raw_df)
        # Convert OP object columns back to numeric after stripping metadata strings
        raw_df = coerce_numeric_columns(raw_df)

        # Build decode map: CQ column names → lookup dicts
        decode_map = build_cq_decode_map(raw_df, cq_lookup_maps)
        if not decode_map:
            col_profiles_raw = profile_columns(raw_df)
            decode_map = map_relationships(raw_df, col_profiles_raw, lookup_sheets)

        # Apply decode map: convert numeric CQ codes to text labels
        decoded_df = raw_df.copy()
        for col, mapping in decode_map.items():
            if col in decoded_df.columns:
                decoded_df[col] = decoded_df[col].map(mapping)

        col_profiles    = profile_columns(decoded_df)
        dimensions      = detect_dimensions(decoded_df, decode_map)
        category_groups = detect_category_groups(decoded_df, col_profiles, metadata_sheets)
        print(f"Dimensions found: {[k for k in dimensions if not k.startswith('_')]}")
        print(f"Categories found: {list(category_groups.keys())}")

        businesses, units, cohorts = compute_scores(decoded_df, dimensions, category_groups, col_profiles)
        total_respondents = len(raw_df)

    elif summary_sheets:
        print("No raw data found — reading from summary sheet")
        businesses, units, cohorts = read_from_summary(summary_sheets, metadata_sheets)
        total_respondents = None
        dimensions = {'business_unit': 'Business', 'sub_unit': 'BU'}

    else:
        raise ValueError("No usable data found in this Excel file.")

    clusters = {"thriving": [], "atrisk": [], "polarised": [], "critical": []}
    for u in units:
        key = u.get('cluster')
        if key in clusters:
            clusters[key].append(u)

    group_avg = round(float(np.mean([b['overall'] for b in businesses])), 2) if businesses else 0

    # Normalize raw category names from the Excel source to clean display names
    _CAT_NAME_MAP = {
        'Engagement':            'Engagement',
        'Development & Career':  'Development and Career',
        'Performance culture':   'Performance Culture',
        'Performance Culture':   'Performance Culture',
        'Manager Effectiveness': 'Manager Effectiveness',
        'Leadership':            'Leadership',
        'Onboarding':            'Onboarding',
    }
    _VALID_CATS = set(_CAT_NAME_MAP.values())

    cat_avgs  = {}
    if businesses:
        for cat in businesses[0]['categories']:
            clean = _CAT_NAME_MAP.get(cat, cat)
            if clean not in _VALID_CATS:
                continue  # skip Uncategorized and other noise columns
            vals = [b['categories'].get(cat, 0) for b in businesses if b['categories'].get(cat)]
            if vals:
                cat_avgs[clean] = round(float(np.mean(vals)), 2)

    def _cohort_n(cohorts_dict, dimension, name):
        return next((
            c.get('respondent_count') or c.get('n') or 0
            for c in cohorts_dict.get(dimension, [])
            if c.get('name') == name
        ), 0)

    meta = {
        "survey_name":         sys.argv[3] if len(sys.argv) > 3 and sys.argv[3].strip() else os.path.basename(excel_path).replace('.xlsx', '').replace('.xls', ''),
        "total_businesses":    len(businesses),
        "total_units":         len(units),
        "total_respondents":   total_respondents,
        "group_avg":           group_avg,
        "top_business":        businesses[0]['name']     if businesses else '',
        "top_score":           businesses[0]['overall']  if businesses else 0,
        "lowest_business":     businesses[-1]['name']    if businesses else '',
        "lowest_score":        businesses[-1]['overall'] if businesses else 0,
        "strongest_category":  max(cat_avgs, key=cat_avgs.get) if cat_avgs else '',
        "weakest_category":    min(cat_avgs, key=cat_avgs.get) if cat_avgs else '',
        "category_averages":   cat_avgs,
        "dimensions_detected": [k for k in dimensions if not k.startswith('_')],
        "sheets_found":        sheet_types,
        "parsed_at":           pd.Timestamp.now().isoformat(),
        # Demographic totals — written here so ai.py can read them without hardcoding
        "male":               _cohort_n(cohorts, 'gender',     'Male'),
        "female":             _cohort_n(cohorts, 'gender',     'Female'),
        "gen_y":              _cohort_n(cohorts, 'generation', 'Gen Y'),
        "gen_x":              _cohort_n(cohorts, 'generation', 'Gen X'),
        "gen_z":              _cohort_n(cohorts, 'generation', 'Gen Z'),
        "dob_na":             _cohort_n(cohorts, 'generation', 'DOB not Available'),
        "baby_boomer":        _cohort_n(cohorts, 'generation', 'Baby Boomer'),
        "junior_management":  _cohort_n(cohorts, 'job_band',   'Junior Management'),
        "middle_management":  _cohort_n(cohorts, 'job_band',   'Middle Management'),
        "senior_management":  _cohort_n(cohorts, 'job_band',   'Senior Management'),
        "tenure_0_2":         _cohort_n(cohorts, 'tenure',     '0-2'),
        "tenure_2_5":         _cohort_n(cohorts, 'tenure',     '2-5'),
        "tenure_5_10":        _cohort_n(cohorts, 'tenure',     '5-10'),
        "tenure_10_15":       _cohort_n(cohorts, 'tenure',     '10-15'),
        "tenure_15_20":       _cohort_n(cohorts, 'tenure',     '15-20'),
        "tenure_20_25":       _cohort_n(cohorts, 'tenure',     '20-25'),
        "tenure_25_plus":     _cohort_n(cohorts, 'tenure',     '>25 (Equal or more than 25)'),
    }

    with open(f"{output_dir}/businesses.json", 'w') as f: json.dump(businesses, f, indent=2)
    with open(f"{output_dir}/units.json",      'w') as f: json.dump(units,      f, indent=2)
    with open(f"{output_dir}/clusters.json",   'w') as f: json.dump(clusters,   f, indent=2)
    with open(f"{output_dir}/cohorts.json",    'w') as f: json.dump(cohorts,    f, indent=2)
    with open(f"{output_dir}/meta.json",       'w') as f: json.dump(meta,       f, indent=2)

    # ── Phase 2: generate responses.json and questions.json ──────────────────
    if raw_dfs:
        try:
            extract_phase2_data(raw_df, decoded_df, xl, output_dir,
                                detected_dims=dimensions,
                                detected_cats=category_groups if category_groups else None)
        except Exception as e:
            print(f"  [Phase 2] Warning: could not generate responses/questions: {e}")

    print(f"\nDONE")
    print(f"  {len(businesses)} businesses | {len(units)} BUs | {total_respondents} respondents")
    print(f"  Group avg: {group_avg} | Top: {meta['top_business']} | Lowest: {meta['lowest_business']}")
    return meta


if __name__ == '__main__':
    meta = parse_excel(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else './data')
    print(f"Survey: {meta['survey_name']}")
    print(f"Businesses: {meta['total_businesses']}")
    print(f"BUs: {meta['total_units']}")
