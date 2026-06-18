"""
Demographic persona segmentation engine for Focus Spotlight.

Reads responses.json, groups employees by dimension combinations (single
then cross-dimensional), computes statistical significance vs. the group
mean, and returns ranked outlier segments.

Architecture: Statistical Engine → Segment Outlier Table → LLM Summary
The LLM never enumerates combinations — all statistics are precomputed here.
"""

import json
from itertools import combinations
from math      import sqrt
from pathlib   import Path

import numpy as np

from lib.stats import one_sample_z_test

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# Dimensions to segment on (order = priority)
SEGMENT_DIMS = ['gender', 'generation', 'tenure', 'job_level', 'is_manager']

# Per-segment category breakdown
CAT_KEYS = [
    'engagement', 'leadership', 'performance_culture',
    'development_and_career', 'manager_effectiveness', 'onboarding',
]

SCORE_KEY = 'overall'
MIN_N     = 30
MAX_DEPTH = 2   # depth 1 = single dim, depth 2 = cross-dim pairs


_RESP_CACHE: list = []
_RESP_MTIME: float = 0.0

def _load_responses() -> list:
    global _RESP_CACHE, _RESP_MTIME
    fp = DATA_DIR / "responses.json"
    if not fp.exists():
        return []
    try:
        mtime = fp.stat().st_mtime
        if mtime != _RESP_MTIME:
            _RESP_CACHE = json.loads(fp.read_text(encoding="utf-8"))
            _RESP_MTIME = mtime
        return _RESP_CACHE
    except Exception:
        return []


def _str_val(v) -> str:
    """Normalise any field value to a clean string for grouping."""
    if v is None:
        return ''
    s = str(v).strip()
    sl = s.lower()
    if sl in ('none', 'nan', 'n/a', '', 'null', 'false'):
        return ''
    # Reject placeholder / data-quality values
    if 'not available' in sl or 'not provided' in sl or 'unknown' == sl:
        return ''
    return s


def _is_manager_label(v) -> str:
    """Coerce is_manager to a display-friendly string."""
    raw = str(v).strip().lower()
    if raw in ('true', '1', 'yes'):
        return 'Manager'
    if raw in ('false', '0', 'no'):
        return 'Non-Manager'
    return ''


def _get_dim_val(row: dict, dim: str) -> str:
    """Return the display value for a dimension from a response row."""
    raw = row.get(dim)
    if dim == 'is_manager':
        return _is_manager_label(raw)
    return _str_val(raw)


def _band(z: float) -> str:
    if z <= -2: return 'much-lower'
    if z <= -1: return 'lower'
    if z >=  2: return 'much-higher'
    if z >=  1: return 'higher'
    return 'typical'


def compute_segments(
    business:      str  = None,
    filters:       dict = None,
    min_n:         int  = MIN_N,
    max_depth:     int  = MAX_DEPTH,
    active_filter: str  = 'all',   # 'all' | 'active' | 'inactive'
) -> dict | None:
    """
    Compute demographic persona segments from responses.json.

    Returns
    -------
    dict  {summary, thresholds, segments}  or  None if data is missing.
    """
    rows = _load_responses()
    if not rows:
        return None

    # Scope to one company if requested
    if business and business not in ('All', ''):
        rows = [r for r in rows if _str_val(r.get('business')) == business]

    # Filter by active status
    af = (active_filter or 'all').lower()
    if af == 'active':
        rows = [r for r in rows if str(r.get('is_active', 'true')).lower() not in ('false', '0', 'no')]
    elif af == 'inactive':
        rows = [r for r in rows if str(r.get('is_active', 'true')).lower() in ('false', '0', 'no')]
    # 'all' → no filter

    # Optional extra filters — use _get_dim_val so is_manager 'Yes'→'Manager' matches
    if filters:
        for k, v in filters.items():
            if k == 'business' or not v or v in ('All', ''):
                continue
            rows = [r for r in rows if _get_dim_val(r, k) == str(v).strip()]

    # Extract rows with a valid overall score
    valid_rows = [
        r for r in rows
        if r.get(SCORE_KEY) not in (None, '', 0)
        and float(str(r[SCORE_KEY]).replace(',', '') or 0) > 0
    ]
    if len(valid_rows) < min_n:
        return None

    all_scores = np.array([float(r[SCORE_KEY]) for r in valid_rows])
    group_mean = float(np.mean(all_scores))
    group_std  = float(np.std(all_scores, ddof=1))
    total_n    = len(valid_rows)

    if group_std < 1e-9:
        group_std = 1e-9   # prevent division by zero

    # Dimensions that have data AND were not used as scope filters
    # (scoped dimensions are fixed to one value — segmenting them adds no insight)
    scoped_dims = set(filters.keys()) if filters else set()
    available_dims = [
        d for d in SEGMENT_DIMS
        if d not in scoped_dims and any(_get_dim_val(r, d) for r in valid_rows[:200])
    ]

    segments = []
    seen_ids: set = set()

    for depth in range(1, max_depth + 1):
        for dim_combo in combinations(available_dims, depth):
            # Single pass: bucket scores AND row references together
            groups:      dict[tuple, list] = {}
            groups_rows: dict[tuple, list] = {}
            for r in valid_rows:
                parts = tuple(_get_dim_val(r, d) for d in dim_combo)
                if any(p == '' for p in parts):
                    continue
                groups.setdefault(parts, []).append(float(r[SCORE_KEY]))
                groups_rows.setdefault(parts, []).append(r)

            for vals, seg_scores_list in groups.items():
                n = len(seg_scores_list)
                if n < min_n:
                    continue

                seg_arr  = np.array(seg_scores_list)
                seg_mean = float(np.mean(seg_arr))
                delta    = seg_mean - group_mean

                # Descriptive z-score: how many population SDs from the mean
                z_display = delta / group_std

                # Statistical significance: one-sample z-test vs population mean
                stat  = one_sample_z_test(seg_mean, group_mean, group_std, n)
                p_val = stat.get('p_two_tailed', 1.0)

                # 95% CI for this segment's mean
                seg_std = float(np.std(seg_arr, ddof=1)) if n > 1 else 0.0
                margin  = 1.96 * (seg_std / sqrt(n))

                dim_dict = dict(zip(dim_combo, vals))
                seg_id   = '__'.join(f'{k}:{v}' for k, v in dim_dict.items())

                if seg_id in seen_ids:
                    continue
                seen_ids.add(seg_id)

                # Category means — use already-bucketed rows, no second scan
                seg_rows = groups_rows[vals]
                cat_means: dict = {}
                for ck in CAT_KEYS:
                    cat_vals = [float(r[ck]) for r in seg_rows
                                if r.get(ck) and float(str(r.get(ck, 0)) or 0) > 0]
                    if cat_vals:
                        cat_means[ck] = round(float(np.mean(cat_vals)), 2)

                segments.append({
                    'id':             seg_id,
                    'label':          ' · '.join(vals),
                    'dimensions':     dim_dict,
                    'depth':          depth,
                    'n':              n,
                    'mean':           round(seg_mean, 2),
                    'delta':          round(delta, 2),
                    'vs_mean':        ('+' if delta >= 0 else '') + str(round(delta, 2)),
                    'z_score':        round(z_display, 2),
                    'z_abs':          round(abs(z_display), 2),
                    'std_dev_label':  f'{abs(round(z_display, 2))} SD',
                    'p_value':        round(p_val, 4),
                    'ci_lower':       round(seg_mean - margin, 3),
                    'ci_upper':       round(seg_mean + margin, 3),
                    'band':           _band(z_display),
                    'category_means': cat_means,
                })

    # Re-compute z-scores relative to the distribution of SEGMENT MEANS, not
    # individual scores.  This answers "which groups are unusual vs. other groups?"
    # rather than "which groups deviate by a full individual-score SD?" — the latter
    # never shows outliers when the dataset is uniformly scored (SD ≈ 0.17).
    if segments:
        seg_mean_arr = np.array([s['mean'] for s in segments])
        seg_dist_mean = float(np.mean(seg_mean_arr))
        seg_dist_std  = float(np.std(seg_mean_arr, ddof=1)) if len(seg_mean_arr) > 1 else 1e-9
        if seg_dist_std < 1e-9:
            seg_dist_std = 1e-9

        for s in segments:
            z = (s['mean'] - seg_dist_mean) / seg_dist_std
            s['z_score']       = round(z, 2)
            s['z_abs']         = round(abs(z), 2)
            s['std_dev_label'] = f'{abs(round(z, 2))} SD'
            s['band']          = _band(z)

    # Rank by absolute z-score (strongest outliers first)
    segments.sort(key=lambda s: s['z_abs'], reverse=True)

    band_counts = {b: 0 for b in ('much-lower', 'lower', 'typical', 'higher', 'much-higher')}
    for s in segments:
        band_counts[s['band']] = band_counts.get(s['band'], 0) + 1

    thresholds = {
        'mean':            round(group_mean, 2),
        'std':             round(group_std,  4),
        'much_lower_max':  round(group_mean - 2 * group_std, 2),
        'lower_max':       round(group_mean - 1 * group_std, 2),
        'higher_min':      round(group_mean + 1 * group_std, 2),
        'much_higher_min': round(group_mean + 2 * group_std, 2),
    }

    return {
        'summary': {
            'total_segments':    len(segments),
            'total_respondents': total_n,
            'group_mean':        round(group_mean, 2),
            'group_std':         round(group_std,  4),
            'band_counts':       band_counts,
        },
        'thresholds': thresholds,
        'segments':   segments,
    }


def precompute_and_save(min_n: int = MIN_N) -> dict | None:
    """Run segmentation for all data and cache to spotlight_segments.json."""
    result = compute_segments(min_n=min_n)
    if result:
        out = DATA_DIR / 'spotlight_segments.json'
        out.write_text(json.dumps(result, indent=2), encoding='utf-8')
        n = result['summary']['total_segments']
        print(f"[Spotlight] {n} segments saved to {out.name}")
    return result
