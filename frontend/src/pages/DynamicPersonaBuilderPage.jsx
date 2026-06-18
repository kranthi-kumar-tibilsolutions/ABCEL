import { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import Dropdown from '../components/shared/Dropdown';
import { apiFetch } from '../utils/api';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);


/* ── dimension color palette ── */
const DIM_COLORS = [
  { bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE' },
  { bg:'#F0FDF4', text:'#15803D', border:'#BBF7D0' },
  { bg:'#F5F3FF', text:'#6D28D9', border:'#DDD6FE' },
  { bg:'#FFF7ED', text:'#C2410C', border:'#FED7AA' },
  { bg:'#FDF4FF', text:'#7E22CE', border:'#E9D5FF' },
  { bg:'#FFF1F2', text:'#BE123C', border:'#FECDD3' },
  { bg:'#F0FDFA', text:'#0F766E', border:'#99F6E4' },
  { bg:'#FFFBEB', text:'#B45309', border:'#FDE68A' },
  { bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE' },
];

/* comparison cohorts sent with every query */
const COMPARISON_COHORT_IDS = ['gen_y', 'managers'];
const COMPARISON_LABELS = {
  gen_y:    { label: 'Gen Y (Millennials)', color: '#22C55E' },
  managers: { label: 'People Managers',     color: '#8B5CF6' },
};

/* ── helpers ────────────────────────────────────────────────────── */
function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ flexShrink:0, color:'var(--text-muted)', cursor:'default' }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function Delta({ score, baseline }) {
  const d = +(score - baseline).toFixed(2);
  const pos = d >= 0;
  return (
    <span style={{
      color: pos ? '#16A34A' : '#DC2626',
      fontSize:10.5, fontWeight:600,
      display:'inline-flex', alignItems:'center', gap:2, marginLeft:5,
    }}>
      {pos ? '↑' : '↓'} {pos ? '+' : ''}{d.toFixed(2)}
    </span>
  );
}

function SigBadge({ sig }) {
  const significant = sig && sig !== 'n.s.';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={significant ? '#DCFCE7' : '#F1F5F9'}/>
        {significant
          ? <path d="M4 7l2.5 2.5L10 4.5" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M5 5l4 4M9 5L5 9" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round"/>
        }
      </svg>
      <span style={{ fontSize:10, color: significant ? '#15803D' : '#94A3B8', fontWeight:600 }}>{significant ? sig : 'Not Significant'}</span>
    </div>
  );
}

/* ── dimension badge dropdown ── */
function DimSelect({ value, opts, color, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const isAll = value === 'All' || !value;
  return (
    <div ref={ref} style={{ position:'relative', flex:1 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:6,
        width:'100%', padding:'5px 10px',
        borderRadius:6,
        border:`1px solid ${isAll ? 'var(--border)' : color.border}`,
        background: isAll ? 'var(--bg-card)' : color.bg,
        color: isAll ? 'var(--text-secondary)' : color.text,
        fontSize:11.5, fontWeight: isAll ? 400 : 600,
        cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
        boxSizing:'border-box',
      }}>
        <span>{value || 'All'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ flexShrink:0, transition:'transform 0.18s', transform:open?'rotate(180deg)':'', opacity:0.5 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, minWidth:140,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:400, padding:4,
          maxHeight:220, overflowY:'auto',
          scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent',
        }}>
          {opts.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
              display:'block', width:'100%', textAlign:'left', padding:'7px 12px',
              fontSize:12, background: opt === value ? 'var(--blue-light)' : 'none',
              border:'none', cursor:'pointer', borderRadius:5, fontFamily:'inherit',
              color: opt === value ? 'var(--blue-primary)' : 'var(--text-primary)',
              fontWeight: opt === value ? 600 : 400,
            }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── radar chart ── */
const RADAR_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      min: 0, max: 5,
      ticks: { stepSize:1, font:{ size:9 }, color:'#94A3B8', backdropColor:'transparent', showLabelBackdrop:false },
      grid: { color:'#E2E8F0' },
      angleLines: { color:'#E2E8F0' },
      pointLabels: { font:{ size:10.5, weight:'600', family:'inherit' }, color:'#475569', padding:14 },
    },
  },
  plugins: {
    legend: { display:false },
    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(2)}` } },
  },
};

function RadarChart({ themes, personaScores, overallScores, compScores, height = 295 }) {
  if (!themes.length) return null;
  const labels = themes;
  const data = {
    labels,
    datasets: [
      {
        label: 'Persona',
        data: themes.map(t => personaScores[t] ?? 0),
        backgroundColor: 'rgba(59,130,246,0.18)', borderColor:'#3B82F6',
        borderWidth:2.5, pointBackgroundColor:'#3B82F6',
        pointBorderColor:'#fff', pointBorderWidth:1, pointRadius:3.5, pointHoverRadius:5, order:0,
      },
      {
        label: 'All Employees',
        data: themes.map(t => overallScores[t] ?? 0),
        backgroundColor: 'rgba(148,163,184,0.08)', borderColor:'#94A3B8',
        borderWidth:1.5, borderDash:[5,3], pointBackgroundColor:'#94A3B8', pointRadius:2.5, order:1,
      },
      ...COMPARISON_COHORT_IDS.map((cid, i) => ({
        label: COMPARISON_LABELS[cid]?.label || cid,
        data: themes.map(t => (compScores[cid] || {})[t] ?? 0),
        backgroundColor: `rgba(${i===0?'34,197,94':'139,92,246'},0.07)`,
        borderColor: COMPARISON_LABELS[cid]?.color || '#94A3B8',
        borderWidth:1.5, borderDash:[5,3],
        pointBackgroundColor: COMPARISON_LABELS[cid]?.color || '#94A3B8',
        pointRadius:2.5, order: i+2,
      })),
    ],
  };
  return (
    <div style={{ position:'relative', height }}>
      <Radar data={data} options={RADAR_OPTIONS} />
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────── */
export default function DynamicPersonaBuilderPage() {
  const {
    dpbResetSignal, setDpbResetSignal,
    dpbFilters, setDpbFilters,
    setBreadcrumb, meta,
    setActiveScreenContext,
  } = useContext(AppContext);

  const [personaName,   setPersonaName]   = useState('Custom Persona');
  const [dimensions,    setDimensions]    = useState([]);
  const [dims,          setDims]          = useState({});
  const [suggestions,   setSuggestions]   = useState([]);
  const [queryResult,   setQueryResult]   = useState(null);
  const [takeaways,     setTakeaways]     = useState([]);
  const [applyLoading,  setApplyLoading]  = useState(false);
  const [saveLoading,   setSaveLoading]   = useState(false);
  const [suggestLoading,setSuggestLoading]= useState(true);
  const [dimsLoading,   setDimsLoading]   = useState(true);
  const [error,         setError]         = useState(null);
  const [viewBy,        setViewBy]        = useState('Themes');

  useEffect(() => {
    setBreadcrumb([{ label:'Persona Explorer' }, { label:'Dynamic Persona Builder' }]);
  }, []);

  // Fetch dimensions + top5 suggestions on mount
  useEffect(() => {
    apiFetch('/api/persona/dimensions')
      .then(r => r.json())
      .then(d => {
        const dims_list = d.dimensions || [];
        setDimensions(dims_list);
        const defaults = {};
        dims_list.forEach(dim => { defaults[dim.id] = 'All'; });
        setDims(defaults);
      })
      .catch(() => {})
      .finally(() => setDimsLoading(false));

    apiFetch('/api/persona/top5')
      .then(r => r.json())
      .then(d => setSuggestions(d.personas || []))
      .catch(() => {})
      .finally(() => setSuggestLoading(false));
  }, []);

  // Reset dims when reset signal fires
  useEffect(() => {
    if (dpbResetSignal && dimensions.length) {
      const defaults = {};
      dimensions.forEach(dim => { defaults[dim.id] = 'All'; });
      setDims(defaults);
    }
  }, [dpbResetSignal, dimensions]);

  const setDim = (k, v) => setDims(d => ({ ...d, [k]: v }));

  // Build filter bar config from real dimension values — never show fake options
  const filterBarCfg = useMemo(() => {
    const businessDim = dimensions.find(d => d.id === 'business');
    const countryDim  = dimensions.find(d => d.id === 'country');
    const cfg = [];
    if (businessDim?.values?.length > 0) {
      cfg.push({ label:'Business', key:'business', opts:['All', ...businessDim.values] });
    }
    // Only show Country if dataset actually has multiple countries
    if (countryDim?.values?.length > 1) {
      cfg.push({ label:'Country', key:'country', opts:['All', ...countryDim.values] });
    }
    cfg.push({ label:'Inactive', key:'inactive', opts:['No', 'Yes'] });
    return cfg;
  }, [dimensions]);

  // Core query runner — accepts explicit filters + name so both Apply and suggestions can call it
  const runQuery = useCallback(async (filters, name) => {
    setApplyLoading(true);
    setError(null);
    setTakeaways([]);
    try {
      const surveyFilters = {};
      if (dpbFilters.business && dpbFilters.business !== 'All') surveyFilters.business = dpbFilters.business;
      if (dpbFilters.country  && dpbFilters.country  !== 'All') surveyFilters.country  = dpbFilters.country;
      surveyFilters.include_inactive = dpbFilters.inactive === 'Yes' ? 'Yes' : 'No';

      const res  = await apiFetch('/api/persona/query', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({
          filters,
          comparison_cohorts: COMPARISON_COHORT_IDS,
          persona_name: name,
          survey_filters: surveyFilters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Query failed. Try broadening your filters — too many specific criteria can result in 0 matches.');
        setApplyLoading(false);
        return;
      }
      setQueryResult(data);

      // Fetch takeaways (non-blocking)
      apiFetch('/api/persona/takeaways', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ persona_name: name, themes: data.themes, persona_n: data.persona_n }),
      })
        .then(r => r.json())
        .then(d => setTakeaways(d.takeaways || []))
        .catch(() => {});
    } catch {
      setError('Connection error. Make sure the server is running.');
    }
    setApplyLoading(false);
  }, [dpbFilters]);

  const handleApply = useCallback(() => {
    const filters = Object.entries(dims)
      .filter(([, v]) => v && v !== 'All')
      .map(([dimension, value]) => ({ dimension, operator:'eq', value }));
    runQuery(filters, personaName);
  }, [dims, personaName, runQuery]);

  // Suggestion click: populate dims + auto-run
  const handleSuggestion = useCallback((suggestion) => {
    const newDims = {};
    dimensions.forEach(dim => { newDims[dim.id] = 'All'; });
    suggestion.filters.forEach(f => {
      if (f.operator === 'eq') newDims[f.dimension] = f.value;
    });
    setDims(newDims);
    setPersonaName(suggestion.label);
    runQuery(suggestion.filters, suggestion.label);
  }, [dimensions, runQuery]);

  const handleSave = async () => {
    if (!queryResult) return;
    setSaveLoading(true);
    try {
      await apiFetch('/api/persona/save', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({
          persona_name: personaName,
          filters: Object.entries(dims)
            .filter(([, v]) => v && v !== 'All')
            .map(([dimension, value]) => ({ dimension, operator:'eq', value })),
          persona_n: queryResult.persona_n,
          scores: Object.fromEntries(
            (queryResult.themes || []).map(t => [t.theme, t.persona_score])
          ),
        }),
      });
    } catch {}
    setSaveLoading(false);
  };

  // Derived rendering data
  const themes      = queryResult ? queryResult.themes.map(t => t.theme) : [];
  const personaN    = queryResult?.persona_n ?? 0;
  const comparisons = queryResult?.comparisons ?? [];

  // Broadcast screen context to chatbot whenever persona state changes
  useEffect(() => {
    setActiveScreenContext({
      tab: 'dynamic_persona_builder',
      persona_name: personaName,
      filters: dims,
      persona_n: personaN,
      persona_scores: queryResult ? Object.fromEntries(
        (queryResult.themes || []).map(t => [t.theme, { persona: t.persona_score, overall: t.overall_score, delta: t.delta }])
      ) : null,
      comparisons: comparisons.slice(0, 5).map(c => ({ name: c.name, overall: c.overall })),
    });
  }, [personaName, dims, queryResult, personaN]);

  const personaScores = {};
  const overallScores = {};
  const compScores    = {};
  if (queryResult) {
    queryResult.themes.forEach(t => {
      personaScores[t.theme] = t.persona_score;
      overallScores[t.theme] = t.overall_score;
      COMPARISON_COHORT_IDS.forEach(cid => {
        if (!compScores[cid]) compScores[cid] = {};
        compScores[cid][t.theme] = t.comparisons?.[cid]?.score ?? 0;
      });
    });
  }

  const diffSummary  = queryResult?.diff_summary;
  const totalN       = meta?.total_respondents ?? 0;

  // Which comparison cohort columns are visible (toggleable)
  const [activeComps, setActiveComps] = useState(() => new Set(COMPARISON_COHORT_IDS));
  const toggleComp = (cid) => setActiveComps(prev => {
    const next = new Set(prev);
    if (next.has(cid)) next.delete(cid); else next.add(cid);
    return next;
  });

  const cohortChips = [
    { id:'persona',  label:'Persona (You)',          n: personaN,  color:'#3B82F6', fixed:true },
    { id:'overall',  label:'Overall (All Employees)', n: totalN,    color:'#94A3B8', fixed:true },
    ...COMPARISON_COHORT_IDS.map(cid => ({
      id: cid,
      label: COMPARISON_LABELS[cid]?.label || cid,
      n: comparisons.find(c => c.id === cid)?.n ?? null,
      color: COMPARISON_LABELS[cid]?.color || '#94A3B8',
      fixed: false,
    })),
  ];

  const statSummary = queryResult && diffSummary ? [
    {
      vs: 'Overall (All Employees)',
      val: `${diffSummary.vs_overall} / ${themes.length} Significant`,
      color: diffSummary.vs_overall >= themes.length * 0.6 ? '#15803D' : '#B45309',
      bg:    diffSummary.vs_overall >= themes.length * 0.6 ? '#DCFCE7' : '#FEF3C7',
      border:diffSummary.vs_overall >= themes.length * 0.6 ? '#86EFAC' : '#FDE68A',
    },
    ...COMPARISON_COHORT_IDS.map(cid => {
      const cnt = diffSummary.vs_cohorts?.[cid] ?? 0;
      return {
        vs: COMPARISON_LABELS[cid]?.label || cid,
        val: `${cnt} / ${themes.length} Significant`,
        color: cnt >= themes.length * 0.6 ? '#15803D' : '#B45309',
        bg:    cnt >= themes.length * 0.6 ? '#DCFCE7' : '#FEF3C7',
        border:cnt >= themes.length * 0.6 ? '#86EFAC' : '#FDE68A',
      };
    }),
  ] : [];

  const comp1 = COMPARISON_COHORT_IDS[0];
  const comp2 = COMPARISON_COHORT_IDS[1];
  const comp1Label = COMPARISON_LABELS[comp1]?.label || comp1;
  const comp2Label = COMPARISON_LABELS[comp2]?.label || comp2;
  const comp1Color = COMPARISON_LABELS[comp1]?.color || '#22C55E';
  const comp2Color = COMPARISON_LABELS[comp2]?.color || '#8B5CF6';
  const comp1N = comparisons.find(c => c.id === comp1)?.n ?? null;
  const comp2N = comparisons.find(c => c.id === comp2)?.n ?? null;

  return (
    <div className="page-container">

      {/* ── Filters + actions ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {filterBarCfg.map(f => (
            <Dropdown
              key={f.key}
              variant="topbar"
              label={f.label}
              value={dpbFilters[f.key] || f.opts[0]}
              options={f.opts.map(o => ({ value:o, label:o }))}
              onChange={v => setDpbFilters(prev => ({ ...prev, [f.key]:v }))}
            />
          ))}
          <button className="topbar-btn" onClick={() => setDpbResetSignal(s => s+1)} title="Reset filters">
            <RotateCcw size={13} />
          </button>

        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="topbar-btn" onClick={handleSave} disabled={!queryResult || saveLoading}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {saveLoading ? 'Saving…' : 'Save'}
          </button>
          <button className="topbar-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
            Share
          </button>
          <button className="topbar-btn topbar-btn-primary" onClick={handleApply} disabled={applyLoading}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {applyLoading ? 'Analysing…' : 'New Persona'}
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="dpb-main-grid">

        {/* ── LEFT: Build Persona ── */}
        <div className="sa-card dpb-build-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:12.5, fontWeight:800, color:'var(--text-primary)' }}>Build a New Persona</span>
            <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:3, display:'flex', borderRadius:4 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Persona Name */}
          <div style={{ marginBottom:14 }}>
            <div className="sa-filter-label" style={{ marginBottom:4 }}>Persona Name</div>
            <div style={{ position:'relative' }}>
              <input
                value={personaName}
                onChange={e => setPersonaName(e.target.value.slice(0, 60))}
                style={{
                  width:'100%', padding:'7px 44px 7px 8px',
                  border:'1px solid var(--border)', borderRadius:6,
                  fontSize:11.5, color:'var(--text-primary)',
                  background:'var(--bg-card)', fontFamily:'inherit',
                  outline:'none', boxSizing:'border-box',
                }}
              />
              <span style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', fontSize:9, color:'var(--text-muted)' }}>
                {personaName.length}/60
              </span>
            </div>
          </div>

          {/* Suggested Personas — hidden once a persona has been applied */}
          {suggestions.length > 0 && !queryResult && (
            <div style={{ marginBottom:14 }}>
              <div className="sa-filter-label" style={{ marginBottom:4 }}>Suggested Personas</div>
              <div style={{ fontSize:9, fontWeight:400, color:'var(--text-muted)', marginBottom:6 }}>click to apply instantly</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestion(s)}
                    disabled={applyLoading}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                      width:'100%', padding:'7px 10px', borderRadius:7, cursor:'pointer',
                      background:'#F8FAFC', border:'1px solid var(--border)',
                      fontFamily:'inherit', textAlign:'left', transition:'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='#EFF6FF'; e.currentTarget.style.borderColor='#BFDBFE'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor='var(--border)'; }}
                  >
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', marginBottom:1 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize:9.5, color:'var(--text-muted)' }}>
                        {s.key_finding} · n={s.n.toLocaleString()}
                      </div>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, color:'#94A3B8' }}>
                      <path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Select Dimensions */}
          <div style={{ marginBottom:12 }}>
            <div className="sa-filter-label" style={{ marginBottom:8 }}>Select Dimensions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {dimsLoading
                ? [...Array(6)].map((_, i) => (
                    <div key={i} className="dpb-dim-row">
                      <div className="skeleton" style={{ height:12, width:80, borderRadius:5 }}/>
                      <div className="skeleton" style={{ height:30, flex:1, borderRadius:6 }}/>
                    </div>
                  ))
                : dimensions.map((d, i) => (
                    <div key={d.id} className="dpb-dim-row">
                      <span className="dpb-dim-label">{d.label}</span>
                      <DimSelect
                        value={dims[d.id] || 'All'}
                        opts={['All', ...d.values]}
                        color={DIM_COLORS[i % DIM_COLORS.length]}
                        onChange={v => setDim(d.id, v)}
                      />
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Compare Against */}
          <div style={{ marginBottom:12 }}>
            <div className="sa-filter-label" style={{ marginBottom:6 }}>Compare Against</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {COMPARISON_COHORT_IDS.map(cid => {
                const on = activeComps.has(cid);
                const color = COMPARISON_LABELS[cid]?.color || '#94A3B8';
                const label = COMPARISON_LABELS[cid]?.label || cid;
                return on ? (
                  <div key={cid} style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    padding:'2px 5px 2px 7px', borderRadius:20,
                    border:`1.5px solid ${color}70`, background:`${color}12`,
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
                    <span style={{ fontSize:10, fontWeight:600, color }}>{label}</span>
                    <button onClick={() => toggleComp(cid)} title={`Remove ${label}`} style={{
                      display:'flex', alignItems:'center', justifyContent:'center',
                      width:12, height:12, borderRadius:'50%', border:'none',
                      background:`${color}25`, cursor:'pointer', padding:0, flexShrink:0, color, transition:'background 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${color}50`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${color}25`; }}
                    >
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1 1l5 5M6 1L1 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button key={cid} onClick={() => toggleComp(cid)} title={`Add ${label}`}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
                    style={{ opacity:0.5, display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:20, border:'1.5px dashed var(--border)', background:'transparent', cursor:'pointer', fontFamily:'inherit', transition:'opacity 0.15s' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M4 1v6M1 4h6" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active filter chips */}
          {(() => {
            const active = dimensions.filter(d => dims[d.id] && dims[d.id] !== 'All');
            if (!active.length) return null;
            return (
              <div style={{ marginBottom:12 }}>
                <div className="sa-filter-label" style={{ marginBottom:6 }}>Active Filters</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {active.map((d, i) => {
                    const color = DIM_COLORS[dimensions.indexOf(d) % DIM_COLORS.length];
                    return (
                      <div key={d.id} style={{
                        display:'inline-flex', alignItems:'center', gap:5,
                        padding:'3px 6px 3px 8px', borderRadius:20,
                        border:`1.5px solid ${color.border}`,
                        background: color.bg,
                      }}>
                        <span style={{ fontSize:10, fontWeight:600, color: color.text }}>
                          {d.label}: {dims[d.id]}
                        </span>
                        <button
                          onClick={() => setDim(d.id, 'All')}
                          title={`Remove ${d.label}`}
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'center',
                            width:14, height:14, borderRadius:'50%', border:'none',
                            background:`${color.text}20`, cursor:'pointer', padding:0, flexShrink:0,
                            color: color.text, transition:'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${color.text}40`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${color.text}20`; }}
                        >
                          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                            <path d="M1 1l5 5M6 1L1 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Error message */}
          {error && (
            <div style={{
              fontSize:11, color:'#DC2626', background:'#FEF2F2',
              border:'1px solid #FECACA', borderRadius:6,
              padding:'7px 10px', marginBottom:10, lineHeight:1.5,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', gap:7, justifyContent:'flex-end', paddingTop:10, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => {
              const defaults = {};
              dimensions.forEach(dim => { defaults[dim.id] = 'All'; });
              setDims(defaults);
              setPersonaName('');
              setQueryResult(null);
              setTakeaways([]);
              setError(null);
            }} style={{
              fontSize:11, fontWeight:600, background:'none', border:'none',
              cursor:'pointer', color:'var(--text-muted)', fontFamily:'inherit', padding:'5px 6px',
            }}>
              Clear All
            </button>
            <button onClick={handleApply} disabled={applyLoading} style={{
              fontSize:11, fontWeight:700, background:'var(--blue-primary)',
              border:'none', borderRadius:6, cursor:'pointer', color:'white',
              fontFamily:'inherit', padding:'5px 12px',
              opacity: applyLoading ? 0.7 : 1,
            }}>
              {applyLoading ? 'Analysing…' : 'Apply Persona'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

          {/* Comparison card */}
          <div className="sa-card" style={{ position:'relative' }}>

            {/* Loading overlay */}
            {applyLoading && (
              <div style={{
                position:'absolute', inset:0, borderRadius:'inherit',
                background:'var(--bg-card)', opacity:0.85,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:10, zIndex:10,
              }}>
                <div className="dpb-spinner"/>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)' }}>Analysing persona…</span>
              </div>
            )}

            {/* Card header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12.5, fontWeight:800, color:'var(--text-primary)' }}>
                  Comparing: {personaName}
                </span>
              </div>
              <button className="dpb-btn-outline" style={{ fontSize:10 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v8M5 9l3 3 3-3"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export
              </button>
            </div>

            {/* Cohort chips */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap' }}>
                {queryResult ? `Sample Size: ${personaN.toLocaleString()}` : 'Apply persona to see results'}
              </span>
              {queryResult && (
                <>
                  <div style={{ width:1, height:14, background:'var(--border)', flexShrink:0 }}/>
                  {cohortChips.filter(c => c.fixed).map(c => (
                    <div key={c.id} className="dpb-chip" style={{ borderColor:`${c.color}60` }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                      <span style={{ fontSize:10.5, fontWeight:500 }}>
                        {c.label}{c.n != null ? ` (n=${c.n.toLocaleString()})` : ''}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Comparison table */}
            {!queryResult ? (
              <div>
                {/* Quick-start header */}
                <div style={{ padding:'18px 20px 12px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>
                    Quick Start — Select a Suggested Persona
                  </div>
                  <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>
                    These personas show the most statistically interesting groups in your dataset. Click any to run the analysis instantly.
                  </div>
                </div>

                {/* Suggestion cards grid */}
                {suggestLoading ? (
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
                    gap:10, padding:'14px 16px',
                  }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{
                        display:'flex', flexDirection:'column', gap:10,
                        padding:'14px 16px', borderRadius:10,
                        border:'1.5px solid var(--border)', background:'var(--bg-page)',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="skeleton" style={{ width:9, height:9, borderRadius:'50%', flexShrink:0 }}/>
                          <div className="skeleton" style={{ height:13, flex:1, borderRadius:5 }}/>
                        </div>
                        <div className="skeleton" style={{ height:22, width:'80%', borderRadius:5 }}/>
                        <div className="skeleton" style={{ height:11, width:'50%', borderRadius:5 }}/>
                      </div>
                    ))}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
                    gap:10, padding:'14px 16px',
                  }}>
                    {suggestions.map((s, idx) => {
                      const colors = ['#3B82F6','#22C55E','#8B5CF6','#F59E0B','#EF4444'];
                      const color  = colors[idx % colors.length];
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleSuggestion(s)}
                          disabled={applyLoading}
                          style={{
                            display:'flex', flexDirection:'column', alignItems:'flex-start',
                            gap:8, padding:'14px 16px', borderRadius:10,
                            border:`1.5px solid ${color}30`,
                            background:`${color}08`,
                            cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                            transition:'all 0.18s', width:'100%',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = `${color}14`;
                            e.currentTarget.style.borderColor = `${color}60`;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${color}18`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = `${color}08`;
                            e.currentTarget.style.borderColor = `${color}30`;
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {/* Colour dot + label */}
                          <div style={{ display:'flex', alignItems:'center', gap:7, width:'100%' }}>
                            <div style={{ width:9, height:9, borderRadius:'50%', background:color, flexShrink:0 }}/>
                            <span style={{ fontSize:12.5, fontWeight:700, color:'var(--text-primary)', flex:1 }}>
                              {s.label}
                            </span>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, color }}>
                              <path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>

                          {/* Key finding */}
                          <div style={{
                            fontSize:10.5, color, fontWeight:600,
                            background:`${color}12`, borderRadius:5,
                            padding:'3px 8px', alignSelf:'flex-start',
                          }}>
                            {s.key_finding}
                          </div>

                          {/* n count */}
                          <div style={{ fontSize:9.5, color:'var(--text-muted)' }}>
                            {s.n.toLocaleString()} respondents
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:'32px 0', textAlign:'center', color:'var(--text-muted)', fontSize:11 }}>
                    Configure dimensions on the left and click <strong>Apply Persona</strong>.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="dpb-tbl">
                  <colgroup>
                    <col style={{ width:'15%' }}/>
                    <col style={{ width:'19%' }}/>
                    <col style={{ width:'13%' }}/>
                    {activeComps.has(comp1) && <col style={{ width:'16%' }}/>}
                    {activeComps.has(comp2) && <col style={{ width:'16%' }}/>}
                    <col style={{ width:'21%' }}/>
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Theme / Category</th>
                      <th style={{ color:'var(--blue-primary)', background:'#F0F6FF' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'#3B82F6', flexShrink:0 }}/>
                          Persona (You)
                        </div>
                        <div style={{ fontWeight:500, fontSize:9, color:'#3B82F6', opacity:0.9, paddingLeft:10 }}>
                          {personaName}
                        </div>
                        <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = {personaN.toLocaleString()})</div>
                      </th>
                      <th>
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'#94A3B8', flexShrink:0 }}/>
                          Overall (All Employees)
                        </div>
                        {totalN > 0 && <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = {totalN.toLocaleString()})</div>}
                      </th>
                      {activeComps.has(comp1) && (
                        <th style={{ color: comp1Color }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:comp1Color, flexShrink:0 }}/>
                            {comp1Label}
                          </div>
                          {comp1N != null && <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = {comp1N.toLocaleString()})</div>}
                        </th>
                      )}
                      {activeComps.has(comp2) && (
                        <th style={{ color: comp2Color }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:comp2Color, flexShrink:0 }}/>
                            {comp2Label}
                          </div>
                          {comp2N != null && <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = {comp2N.toLocaleString()})</div>}
                        </th>
                      )}
                      <th>vs Overall Significance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.themes.map(row => (
                      <tr key={row.theme}>
                        <td style={{ fontWeight:500, color:'var(--text-primary)', fontSize:11.5 }}>{row.theme}</td>
                        <td style={{ background:'#F5F9FF' }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#1D4ED8' }}>{row.persona_score.toFixed(2)}</span>
                          <Delta score={row.persona_score} baseline={row.overall_score}/>
                        </td>
                        <td>
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)' }}>{row.overall_score.toFixed(2)}</span>
                        </td>
                        {activeComps.has(comp1) && (
                          <td>
                            {row.comparisons?.[comp1] != null ? (
                              <>
                                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                                  {row.comparisons[comp1].score.toFixed(2)}
                                </span>
                                <Delta score={row.comparisons[comp1].score} baseline={row.overall_score}/>
                              </>
                            ) : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}
                          </td>
                        )}
                        {activeComps.has(comp2) && (
                          <td>
                            {row.comparisons?.[comp2] != null ? (
                              <>
                                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                                  {row.comparisons[comp2].score.toFixed(2)}
                                </span>
                                <Delta score={row.comparisons[comp2].score} baseline={row.overall_score}/>
                              </>
                            ) : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}
                          </td>
                        )}
                        <td><SigBadge sig={row.significance_label}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table footnotes */}
            {queryResult && (
              <div style={{ marginTop:8, display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>↑ / ↓ indicates difference vs Overall</span>
                <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>
                  Significance tested using two-sample z-test for means (α = 0.05)
                </span>
                <InfoIcon />
              </div>
            )}

            {/* ── Inline bottom: radar + stats + takeaways ── */}
            {queryResult && (
              <div style={{
                marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)',
                display:'grid', gridTemplateColumns:'minmax(0,1.1fr) minmax(0,0.6fr) minmax(0,1fr)',
                gap:14, alignItems:'start',
              }}>

                {/* Radar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)' }}>
                      Visual Comparison <InfoIcon />
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>View by:</span>
                      <Dropdown variant="filter" value={viewBy}
                        options={['Themes','Categories']} onChange={setViewBy}/>
                    </div>
                  </div>
                  <RadarChart
                    themes={themes}
                    personaScores={personaScores}
                    overallScores={overallScores}
                    compScores={compScores}
                    height={180}
                  />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px', marginTop:8 }}>
                    {cohortChips.map(c => (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                        <span style={{ fontSize:9, color:'var(--text-secondary)', lineHeight:1.3 }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistical summary */}
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', marginBottom:5 }}>
                    Stat. Difference <InfoIcon />
                  </div>
                  <p style={{ fontSize:9.5, color:'var(--text-muted)', margin:'0 0 8px', lineHeight:1.4 }}>
                    Themes significantly different vs:
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {statSummary.map(s => (
                      <div key={s.vs} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                        <span style={{ fontSize:9.5, color:'var(--text-secondary)', lineHeight:1.3 }}>{s.vs}</span>
                        <span style={{
                          fontSize:9.5, fontWeight:700, padding:'2px 7px',
                          borderRadius:10, background:s.bg, color:s.color,
                          border:`1px solid ${s.border}`, alignSelf:'flex-start',
                        }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Takeaways */}
                <div style={{ borderLeft:'1px solid var(--border)', paddingLeft:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26A6.99 6.99 0 0019 9c0-3.87-3.13-7-7-7z" fill="#F59E0B"/>
                      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" fill="#F59E0B"/>
                    </svg>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)' }}>Key Takeaways</span>
                  </div>
                  <ul style={{ margin:0, paddingLeft:13, display:'flex', flexDirection:'column', gap:5 }}>
                    {takeaways.length ? takeaways.map((t, i) => (
                      <li key={i} style={{ fontSize:10, color:'var(--text-secondary)', lineHeight:1.5 }}>{t}</li>
                    )) : (
                      <li style={{ listStyle:'none', display:'flex', alignItems:'center', gap:6, marginLeft:-13 }}>
                        <span className="dpb-spinner-sm"/>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>Generating takeaways…</span>
                      </li>
                    )}
                  </ul>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
