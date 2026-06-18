import { useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import InfoTip from '../components/shared/InfoTip';
import Dropdown from '../components/shared/Dropdown';
import { apiFetch } from '../utils/api';

/* ── band config ─────────────────────────────────────────────────── */
const BAND_CONFIG = [
  { key: 'much-lower',  label: 'Much Lower',  color: '#DC2626', bg: '#FEF2F2', range: '≤ −2 SD',      dotColor: '#DC2626' },
  { key: 'lower',       label: 'Lower',        color: '#F97316', bg: '#FFF7ED', range: '−2 to −1 SD',  dotColor: '#F97316' },
  { key: 'typical',     label: 'Typical',      color: '#16A34A', bg: '#F0FDF4', range: 'Within ±1 SD', dotColor: '#16A34A' },
  { key: 'higher',      label: 'Higher',       color: '#2563EB', bg: '#EFF6FF', range: '+1 to +2 SD',  dotColor: '#2563EB' },
  { key: 'much-higher', label: 'Much Higher',  color: '#7C3AED', bg: '#F5F3FF', range: '≥ +2 SD',      dotColor: '#7C3AED' },
];
const BAND_MAP = Object.fromEntries(BAND_CONFIG.map(b => [b.key, b]));

const OUTLIER_TABS = [
  { key: 'much-lower',  label: 'Much Lower',  sub: '≤ −2 SD' },
  { key: 'lower',       label: 'Lower',        sub: '−2 to −1 SD' },
  { key: 'higher',      label: 'Higher',       sub: '+1 to +2 SD' },
  { key: 'much-higher', label: 'Much Higher',  sub: '≥ +2 SD' },
];

/* ── helpers ─────────────────────────────────────────────────────── */
function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

function getBand(z) {
  if (z <= -2) return 'much-lower';
  if (z <= -1) return 'lower';
  if (z <   1) return 'typical';
  if (z <   2) return 'higher';
  return 'much-higher';
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="3"  cy="7"   r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.3 6.3l5.4-3M4.3 7.7l5.4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

/* ── engagement scale ─────────────────────────────────────────────── */
function EngagementScale({ mean, sd }) {
  // Fixed visual positions — prevents clustering when SD is tiny
  const POSITIONS = [8, 25, 50, 75, 92]; // % positions on the bar

  const markers = [
    { pos: POSITIONS[0], label: '−2 SD', val: `≤ ${(mean - 2*sd).toFixed(2)}`, color: '#DC2626', valPrefix: '≤' },
    { pos: POSITIONS[1], label: '−1 SD', val: `≤ ${(mean - sd).toFixed(2)}`,   color: '#F97316', valPrefix: '≤' },
    { pos: POSITIONS[2], label: `Mean (${mean.toFixed(2)})`, val: mean.toFixed(2), color: '#1E293B', isMean: true },
    { pos: POSITIONS[3], label: '+1 SD', val: `≥ ${(mean + sd).toFixed(2)}`,   color: '#2563EB', valPrefix: '≥' },
    { pos: POSITIONS[4], label: '+2 SD', val: `≥ ${(mean + 2*sd).toFixed(2)}`, color: '#7C3AED', valPrefix: '≥' },
  ];

  // Segments split at fixed positions
  const segments = [
    { left: 0,              width: POSITIONS[1],                    color: '#DC2626' },
    { left: POSITIONS[1],   width: POSITIONS[2] - POSITIONS[1],     color: '#F97316' },
    { left: POSITIONS[2],   width: POSITIONS[3] - POSITIONS[2],     color: '#16A34A' },
    { left: POSITIONS[3],   width: POSITIONS[4] - POSITIONS[3],     color: '#2563EB' },
    { left: POSITIONS[4],   width: 100 - POSITIONS[4],              color: '#7C3AED' },
  ];

  return (
    <div style={{ marginBottom: 4 }}>
      {/* SD labels above bar */}
      <div style={{ position: 'relative', height: 22 }}>
        {markers.map((m, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${m.pos}%`,
            transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 10, fontWeight: m.isMean ? 700 : 500, color: m.isMean ? '#1E293B' : 'var(--text-muted)' }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* colour bar */}
      <div style={{ position: 'relative', height: 16, borderRadius: 6, overflow: 'hidden', background: '#E2E8F0' }}>
        {segments.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${s.left}%`, width: `${s.width}%`,
            height: '100%', background: s.color,
          }} />
        ))}
        {/* white tick lines at each marker */}
        {POSITIONS.map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${p}%`, top: 0, bottom: 0,
            width: 2, background: 'rgba(255,255,255,0.75)',
            transform: 'translateX(-50%)',
          }} />
        ))}
      </div>

      {/* value labels below bar */}
      <div style={{ position: 'relative', height: 20, marginTop: 4 }}>
        {markers.map((m, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${m.pos}%`,
            transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────────── */
export default function FocusSpotlightPage() {
  const { setBreadcrumb, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Persona Explorer' },
      { label: 'Focus Spotlight' },
    ]);
    setActiveScreenContext({ tab: 'focus_spotlight', description: 'AI persona segmentation — statistical outliers across demographic dimensions for ABG Vibes 2026.' });
  }, []);

  const [dims,           setDimsState]    = useState({});
  const [inactive,       setInactive]     = useState('No');
  const [filterData,     setFilterData]   = useState({ businesses: [], dimensions: {}, has_active: false, has_inactive: false });
  const [dimsLoading,    setDimsLoading]  = useState(true);
  const [data,           setData]         = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [activeTab,    setActiveTab]    = useState('much-lower');
  const [showAll,      setShowAll]      = useState(false);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabScrollRef = useRef(null);

  const checkScroll = useCallback(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll]);
  const TABLE_LIMIT = 5;

  const setDim      = (k, v) => setDimsState(d => ({ ...d, [k]: v }));
  const resetFilters = () => {
    const defaults = { business: 'All' };
    Object.keys(filterData.dimensions || {}).forEach(k => { defaults[k] = 'All'; });
    setDimsState(defaults);
    setInactive('No');
  };

  // Fetch filter options once on mount
  useEffect(() => {
    apiFetch('/api/focus-spotlight/filters')
      .then(r => r.json())
      .then(d => {
        setFilterData(d);
        const defaults = { business: 'All' };
        Object.keys(d.dimensions || {}).forEach(k => { defaults[k] = 'All'; });
        setDimsState(defaults);
      })
      .catch(() => {})
      .finally(() => setDimsLoading(false));
  }, []);

  // Fetch results whenever filters change
  useEffect(() => {
    if (dimsLoading) return;
    const { business: bizVal, ...scopeDims } = dims;
    const scope = Object.fromEntries(
      Object.entries(scopeDims).filter(([, v]) => v && v !== 'All')
    );
    setResultsLoading(true);
    apiFetch('/api/focus-spotlight/results', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        business:      bizVal && bizVal !== 'All' ? bizVal : null,
        scope:         Object.keys(scope).length > 0 ? scope : null,
        active_filter: inactive === 'No' ? 'active' : 'all',
      }),
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setResultsLoading(false));
  }, [dims, inactive, dimsLoading]);

  // Derive display values from API response
  const personas        = useMemo(() => data?.segments        || [], [data]);
  const mean            = data?.summary?.group_mean           || 0;
  const sd              = data?.summary?.group_std            || 0;
  const bandCounts      = data?.summary?.band_counts          || {};
  const totalRespondents = data?.summary?.total_respondents   || 0;

  // segments use 'band' (not 'sdBand') — already set by backend
  const outlierPersonas = useMemo(() => personas.filter(p => p.band !== 'typical'), [personas]);
  const tabPersonas     = useMemo(() => outlierPersonas.filter(p => p.band === activeTab), [outlierPersonas, activeTab]);
  const displayed       = showAll ? tabPersonas : tabPersonas.slice(0, TABLE_LIMIT);

  const keyInsights = useMemo(() => {
    if (!personas.length) return [];
    const out = [];
    const ml = personas.filter(p => p.band === 'much-lower');
    const mh = personas.filter(p => p.band === 'much-higher');
    const lo = personas.filter(p => p.band === 'lower');
    if (ml.length) out.push(`${ml.length} persona${ml.length>1?'s are':' is'} ≥ 2 SD below the mean — priority areas for intervention.`);
    if (mh.length) out.push(`${mh.length} persona${mh.length>1?'s stand':' stands'} out as exceptional performers, more than 2 SD above average.`);
    if (lo.length) out.push(`${lo.length} persona${lo.length>1?'s fall':' falls'} in the Lower band, warranting focused HR attention.`);
    if (sd > 0 && sd < 0.3)  out.push(`Engagement scores are tightly clustered (SD = ${sd.toFixed(2)}), suggesting consistent experience.`);
    else if (sd > 0.6) out.push(`High score dispersion (SD = ${sd.toFixed(2)}) indicates significant variation in employee experience.`);
    const t = bandCounts['typical'] ?? 0;
    if (t) out.push(`${t} segment${t>1?'s sit':' sits'} within the typical band (±1 SD), near the group average of ${mean.toFixed(2)}.`);
    return out.slice(0, 5);
  }, [personas, bandCounts, mean, sd]);

  return (
    <div className="page-container" style={{ padding: '20px 24px' }}>

      {/* ── FILTER BAR ──────────────────────────────────────────── */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
          {dimsLoading
            ? [...Array(6)].map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="skeleton" style={{ height: 10, width: 70, borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 32, width: 110, borderRadius: 6 }} />
                </div>
              ))
            : <>
                {/* Business filter */}
                {filterData.businesses.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Business</span>
                    <Dropdown
                      variant="filter"
                      options={['All', ...filterData.businesses]}
                      value={dims.business || 'All'}
                      onChange={v => setDim('business', v)}
                    />
                  </div>
                )}
                {/* Demographic dimension filters */}
                {Object.entries(filterData.dimensions).map(([key, values]) => {
                  const LABELS = { gender: 'Gender', generation: 'Generation', tenure: 'Tenure', job_level: 'Job Level', is_manager: 'Manager' };
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{LABELS[key] || key}</span>
                      <Dropdown
                        variant="filter"
                        options={['All', ...values]}
                        value={dims[key] || 'All'}
                        onChange={v => setDim(key, v)}
                      />
                    </div>
                  );
                })}
              </>
          }
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Include Inactive</span>
            <Dropdown variant="filter" options={['No', 'Yes']} value={inactive} onChange={v => setInactive(v)} />
          </div>
          <button
            onClick={resetFilters}
            style={{
              padding: '5px 14px', borderRadius: 6, height: 32,
              border: '1px solid var(--border)', background: 'var(--bg-secondary)',
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ── ROW 1: Info | KPIs | Legend — single card ──────────── */}
      <div className="sa-card" style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 14, padding: '12px 16px', overflow: 'hidden' }}>

        {/* How it works — fixed narrow column */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: 180, minWidth: 180, paddingRight: 14, flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: '#EDE9FE', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
          }}>
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M9 2a5 5 0 0 1 3.5 8.55c-.5.48-.85 1.15-.85 1.95v.5H6.35v-.5c0-.8-.35-1.47-.85-1.95A5 5 0 0 1 9 2z"
                stroke="#7C3AED" strokeWidth="1.4" fill="#EDE9FE"/>
              <path d="M6.35 13h5.3M7 15.5h4" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
              How Focus Spotlight Works
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {resultsLoading
                ? 'Analysing demographic segments…'
                : `${personas.length || 'No'} demographic segment${personas.length !== 1 ? 's' : ''} identified as statistical outliers from the mean.`}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', flexShrink: 0 }} />

        {/* KPIs */}
        <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', alignSelf: 'center' }}>
          {[
            {
              val: personas.length,
              label: 'Total Segments',
              color: '#6366F1',
              tip: 'Statistically significant demographic segments (gender, generation, tenure, job level, manager status) that deviate more than ±1 SD from the group mean.',
            },
            {
              val: totalRespondents.toLocaleString(),
              label: 'Total Respondents',
              color: '#16A34A',
              tip: 'Number of survey respondents included in this analysis after applying the current filters.',
            },
            {
              val: mean > 0 ? mean.toFixed(2) : '—',
              label: 'Engagement Mean',
              color: '#F97316',
              tip: `Mean engagement score across the filtered respondents (scale 1–5). SD = ${sd > 0 ? sd.toFixed(2) : '—'}, indicating ${sd < 0.3 ? 'tight clustering' : sd > 0.6 ? 'high dispersion' : 'moderate spread'}.`,
            },
          ].map((kpi, i, arr) => (
            <div key={i} style={{
              textAlign: 'center', padding: '0 16px',
              borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              minWidth: 80,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, lineHeight: 1, whiteSpace: 'nowrap' }}>{kpi.val}</div>
              <div style={{ fontSize: 9.5, color: kpi.color, marginTop: 3, lineHeight: 1.3, whiteSpace: 'nowrap' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', flexShrink: 0 }} />

        {/* Statistical significance legend */}
        <div style={{ flex: 1, paddingLeft: 14, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, whiteSpace: 'nowrap' }}>
            Statistical Significance (vs. Overall Mean)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px 8px' }}>
            {[
              { color: '#16A34A', label: '≥ +2 SD (Much Higher)' },
              { color: '#2563EB', label: '+1 to +2 SD (Higher)' },
              { color: '#94A3B8', label: 'Within ±1 SD (Typical)' },
              { color: '#F97316', label: '−1 to −2 SD (Lower)' },
              { color: '#DC2626', label: '≤ −2 SD (Much Lower)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 9.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Scale + band counts | Personas table ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,3fr)', gap: 14, marginBottom: 14 }}>

        {/* Left: scale + distribution */}
        <div className="sa-card" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Overall Engagement Scale <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(Based on Overall Mean)</span>
              </span>
              <InfoTip tip={`Visualises where each business unit sits relative to the group mean (${mean.toFixed(2)}) on the 1–5 engagement scale. Coloured bands show ±1 SD (typical), ±2 SD (outlier) zones. SD = ${sd.toFixed(2)}.`} />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Engagement score scale showing mean and standard deviations
            </div>
          </div>

          <EngagementScale mean={mean} sd={sd} />

          {/* band count cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginTop: 6 }}>
            {BAND_CONFIG.map(b => {
              const count = bandCounts[b.key] ?? 0;
              return (
                <div key={b.key} style={{
                  border: `1.5px solid ${b.color}50`, borderRadius: 8,
                  padding: '10px 2px 8px', textAlign: 'center', background: b.bg,
                  minWidth: 0, overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: b.color, lineHeight: 1 }}>{count}</div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: b.color, marginTop: 5,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    padding: '0 2px',
                  }}>{b.label}</div>
                  <div style={{
                    fontSize: 8, color: 'var(--text-muted)', marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    padding: '0 2px',
                  }}>{b.range}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: personas outside ±1 SD */}
        <div className="sa-card" style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Personas Outside ±1 Standard Deviation
            </span>
            <InfoTip tip="Business units whose engagement score falls more than 1 standard deviation from the group mean — either significantly above or below average." />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 10 }}>
            Click any persona to explore detailed insights and benchmarks.
          </div>

          {/* tabs */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {/* left arrow */}
            {canScrollLeft && (
              <button onClick={() => { tabScrollRef.current.scrollBy({ left: -120, behavior: 'smooth' }); }}
                style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-60%)',
                  zIndex: 2, background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '2px 0 6px rgba(0,0,0,0.08)', padding: 0,
                }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M6.5 2L3.5 5l3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <div ref={tabScrollRef} style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', paddingLeft: canScrollLeft ? 24 : 0, paddingRight: canScrollRight ? 24 : 0 }}>
            {OUTLIER_TABS.map(tab => {
              const cfg   = BAND_MAP[tab.key];
              const count = outlierPersonas.filter(p => p.band === tab.key).length;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setShowAll(false); }}
                  style={{
                    padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: isActive ? `2px solid ${cfg.color}` : '2px solid transparent',
                    color: isActive ? cfg.color : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500, fontSize: 11,
                    marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {tab.label}
                  <span style={{ fontSize: 9, fontWeight: 400, marginLeft: 2, opacity: 0.7 }}>({tab.sub})</span>
                  {count > 0 && (
                    <span style={{
                      marginLeft: 5, fontSize: 10, fontWeight: 700,
                      background: cfg.color + '18', color: cfg.color,
                      padding: '1px 5px', borderRadius: 10,
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
            {/* right arrow */}
            {canScrollRight && (
              <button onClick={() => { tabScrollRef.current.scrollBy({ left: 120, behavior: 'smooth' }); }}
                style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-60%)',
                  zIndex: 2, background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '-2px 0 6px rgba(0,0,0,0.08)', padding: 0,
                }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M3.5 2L6.5 5l-3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* table */}
          {resultsLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Analysing segments…
            </div>
          ) : tabPersonas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No segments in this band.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: 11.5, minWidth: 480 }}>
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Engagement Score
                        <InfoTip tip="Mean engagement score (1–5) for this demographic segment, computed from all matching survey responses." />
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        vs Mean
                        <InfoTip tip={`Difference between this segment's score and the group mean of ${mean.toFixed(2)}. Negative = below average; positive = above average.`} />
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Std Dev
                        <InfoTip tip="Z-score: how many standard deviations this segment's score is from the group mean. Segments beyond ±1 SD are flagged as outliers." />
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Respondents
                        <InfoTip tip="Number of employees in this demographic segment who completed the survey. Segments with fewer than 30 respondents are excluded." />
                      </div>
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p, i) => {
                    const cfg   = BAND_MAP[p.band];
                    const vsPos = p.delta >= 0;
                    const dimLabel = Object.entries(p.dimensions || {})
                      .map(([k, v]) => `${k.replace('_',' ')}: ${v}`)
                      .join(' · ');
                    return (
                      <tr key={p.id || i}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{p.label}</div>
                          {dimLabel && (
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                              {dimLabel}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: cfg?.color, fontSize: 14 }}>
                          {(+p.mean).toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 600, color: vsPos ? '#16A34A' : '#DC2626' }}>
                          {p.vs_mean}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {(+p.z_score).toFixed(2)} SD
                        </td>
                        <td>{p.n ?? '—'}</td>
                        <td>
                          <button style={{
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: 6, cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '4px 6px',
                            display: 'flex', alignItems: 'center',
                          }} title="Share">
                            <ShareIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {tabPersonas.length > TABLE_LIMIT && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  style={{
                    marginTop: 10, background: 'none', border: 'none',
                    color: '#6366F1', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {showAll ? 'Show less ↑' : `View all ${tabPersonas.length} personas →`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── ROW 3: Key Insights | Explore panel ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Key insights */}
        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <path d="M9 2a5 5 0 0 1 3.5 8.55c-.5.48-.85 1.15-.85 1.95v.5H6.35v-.5c0-.8-.35-1.47-.85-1.95A5 5 0 0 1 9 2z"
                stroke="#F59E0B" strokeWidth="1.4" fill="#FEF3C7"/>
              <path d="M6.35 13h5.3M7 15.5h4" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Key Insights</span>
            <InfoTip tip="Automatically derived statistical observations based on SD band distribution across the filtered units. Highlights units needing immediate attention." />
          </div>

          {keyInsights.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data loaded yet.</div>
          ) : (
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {keyInsights.map((ins, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ins}</li>
              ))}
            </ul>
          )}

          {/* footer note */}
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: '#6366F1' }}>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 11, color: '#6366F1' }}>
              All {personas.length} persona combinations are calculated based on your selected dimensions.
            </span>
          </div>
        </div>

        {/* Explore panel */}
        <div className="sa-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#EDE9FE', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
          }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="#7C3AED" strokeWidth="1.6"/>
              <path d="M13.5 13.5l3.5 3.5" stroke="#7C3AED" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', marginBottom: 6 }}>
              Explore any persona in detail
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Click the chart icon next to a persona to view detailed engagement breakdown,
              theme scores, comparisons to benchmarks, and driver analysis.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
