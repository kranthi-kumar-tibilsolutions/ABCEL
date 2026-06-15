import { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const COMPARISON_COHORTS = ['new_joiners', 'gen_y'];

const COHORT_META = {
  new_joiners: { label:'New Joiners (0-2 yrs)', color:'#22C55E' },
  gen_y:       { label:'Gen Y (Millennials)',   color:'#8B5CF6' },
};

/* Themes to show on radar (exclude Onboarding to keep 5 axes) */
const RADAR_THEMES = ['Engagement','Leadership','Performance Culture','Development & Career','Manager Effectiveness'];

const DIM_COLORS = [
  { bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE' },
  { bg:'#F0FDF4', text:'#15803D', border:'#BBF7D0' },
  { bg:'#F5F3FF', text:'#6D28D9', border:'#DDD6FE' },
  { bg:'#FFF7ED', text:'#C2410C', border:'#FED7AA' },
  { bg:'#FDF2F8', text:'#9D174D', border:'#FBCFE8' },
  { bg:'#ECFEFF', text:'#0E7490', border:'#A5F3FC' },
  { bg:'#FFF1F2', text:'#BE123C', border:'#FECDD3' },
  { bg:'#F7FEE7', text:'#3F6212', border:'#D9F99D' },
  { bg:'#FEF9C3', text:'#854D0E', border:'#FEF08A' },
];

// Filter options fetched dynamically — see useEffect below

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ flexShrink:0, color:'var(--text-muted)', cursor:'default' }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function Delta({ d }) {
  if (d == null) return null;
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

function SigBadge({ label }) {
  const ok = label && label !== 'n.s.';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      {ok ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" fill="#DCFCE7"/>
          <path d="M4 7l2.5 2.5L10 4.5" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" fill="#F1F5F9"/>
          <path d="M4.5 7h5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      <span style={{ fontSize:10, color: ok ? '#15803D' : '#94A3B8', fontWeight:600 }}>
        {label || 'n.s.'}
      </span>
    </div>
  );
}

function DimSelect({ value, opts, color, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const isAll = value === 'All';
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:'flex', alignItems:'center', gap:4,
        padding: isAll ? '4px 8px' : '3px 10px',
        borderRadius: isAll ? 6 : 12,
        border: `1px solid ${isAll ? 'var(--border)' : color.border}`,
        background: isAll ? 'var(--bg-card)' : color.bg,
        color: isAll ? 'var(--text-primary)' : color.text,
        fontSize:11, fontWeight: isAll ? 400 : 700,
        cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
      }}>
        {value}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ flexShrink:0, transform:open?'rotate(180deg)':'', opacity:0.6 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', right:0, minWidth:165,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:400, padding:4,
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

const RADAR_OPTIONS = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    r: {
      min:0, max:5,
      ticks: { stepSize:1, font:{size:9}, color:'#94A3B8', backdropColor:'transparent', showLabelBackdrop:false },
      grid: { color:'#E2E8F0' },
      angleLines: { color:'#E2E8F0' },
      pointLabels: { font:{size:10.5, weight:'600', family:'inherit'}, color:'#475569', padding:14 },
    },
  },
  plugins: {
    legend: { display:false },
    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(2)}` } },
  },
};

function RadarChart({ personaScores, cohort1Scores, cohort2Scores, cohort1Label, cohort2Label }) {
  const data = {
    labels: RADAR_THEMES,
    datasets: [
      {
        label:'Persona (You)',
        data: RADAR_THEMES.map(t => personaScores[t] ?? 0),
        backgroundColor:'rgba(59,130,246,0.18)', borderColor:'#3B82F6',
        borderWidth:2.5, pointBackgroundColor:'#3B82F6',
        pointBorderColor:'#fff', pointBorderWidth:1, pointRadius:3.5, pointHoverRadius:5, order:0,
      },
      {
        label:'Overall (All Employees)',
        data: RADAR_THEMES.map(t => cohort1Scores?.[t] ?? 0),
        backgroundColor:'rgba(148,163,184,0.08)', borderColor:'#94A3B8',
        borderWidth:1.5, borderDash:[5,3], pointBackgroundColor:'#94A3B8', pointRadius:2.5, order:1,
      },
      {
        label: cohort1Label || 'New Joiners',
        data: RADAR_THEMES.map(t => cohort2Scores?.[t] ?? 0),
        backgroundColor:'rgba(34,197,94,0.07)', borderColor:'#22C55E',
        borderWidth:1.5, borderDash:[5,3], pointBackgroundColor:'#22C55E', pointRadius:2.5, order:2,
      },
    ],
  };
  return (
    <div style={{ position:'relative', height:295 }}>
      <Radar data={data} options={RADAR_OPTIONS} />
    </div>
  );
}

export default function DynamicPersonaBuilderPage() {
  const [personaName, setPersonaName] = useState('Custom Persona');
  const [dimensions,  setDimensions]  = useState([]);
  const [dims,        setDims]        = useState({});
  const [bizOpts,     setBizOpts]     = useState(['All']);
  const [countryOpts, setCountryOpts] = useState(['All']);
  const [business,    setBusiness]    = useState('All');
  const [country,     setCountry]     = useState('India');   // default India
  const [viewBy,    setViewBy]    = useState('Themes');
  const [themes,    setThemes]    = useState([]);
  const [comps,     setComps]     = useState([]);
  const [personaN,  setPersonaN]  = useState(0);
  const [diffSummary, setDiffSummary] = useState({ vs_overall:0, vs_cohorts:{} });
  const [takeaways, setTakeaways] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [applied,   setApplied]   = useState(false);
  const [apiError,  setApiError]  = useState(null);

  const setDim = (id,v) => setDims(d => ({ ...d, [id]: v }));
  const resetAll = () => {
    setBusiness('All');
    setCountry('India');
    setDims(Object.fromEntries(dimensions.map(d => [d.id, 'All'])));
  };

  /* Fetch available dimensions + filter options on mount */
  useEffect(() => {
    fetch('/api/persona/dimensions')
      .then(r => r.json())
      .then(d => {
        const dims = d.dimensions || [];
        setDimensions(dims);
        const defaults = {};
        dims.forEach(dim => { defaults[dim.id] = 'All'; });
        setDims(defaults);
        const biz = dims.find(x => x.id === 'business');
        const ctr = dims.find(x => x.id === 'country');
        if (biz) setBizOpts(['All', ...biz.values]);
        if (ctr) setCountryOpts(['All', ...ctr.values]);
      });
    applyPersona([], 'All Employees (Default)');
  }, []);

  const applyPersona = async (filtersList, name) => {
    setLoading(true);
    setApiError(null);
    try {
      const surveyFilters = {};
      if (business !== 'All') surveyFilters.business = business;
      if (country  !== 'All') surveyFilters.country  = country;
      const res = await fetch('/api/persona/query', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          filters: filtersList,
          comparison_cohorts: COMPARISON_COHORTS,
          persona_name: name,
          survey_filters: surveyFilters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.detail || `Server error ${res.status}`);
        return;
      }
      if (data.themes) {
        setThemes(data.themes);
        setComps(data.comparisons || []);
        setPersonaN(data.persona_n || 0);
        setDiffSummary(data.diff_summary || { vs_overall:0, vs_cohorts:{} });
        setApplied(true);
        setApiError(null);
        loadTakeaways(name, data.themes, data.persona_n);
      } else {
        setApiError(data.error || 'No data returned from server.');
      }
    } catch (e) {
      setApiError(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const loadTakeaways = async (name, themesData, n) => {
    try {
      const res = await fetch('/api/persona/takeaways', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ persona_name: name, themes: themesData, persona_n: n }),
      });
      const data = await res.json();
      setTakeaways(data.takeaways || []);
    } catch { setTakeaways([]); }
  };

  const handleApply = () => {
    const activeFilters = Object.entries(dims)
      .filter(([, v]) => v && v !== 'All')
      .map(([id, v]) => ({ dimension: id, operator: 'eq', value: v }));
    applyPersona(activeFilters, personaName);
  };

  /* Build radar data from themes */
  const personaRadarScores  = Object.fromEntries(themes.map(t => [t.theme, t.persona_score]));
  const overallRadarScores  = Object.fromEntries(themes.map(t => [t.theme, t.overall_score]));
  const cohort0RadarScores  = Object.fromEntries(
    themes.map(t => [t.theme, t.comparisons?.[COMPARISON_COHORTS[0]]?.score ?? 0])
  );

  const comp0 = comps[0];
  const comp1 = comps[1];

  /* Statistical summary rows */
  const statRows = [
    { vs:'Overall (All Employees)', n: diffSummary.vs_overall },
    ...(comps.map(c => ({ vs: c.label, n: diffSummary.vs_cohorts?.[c.id] ?? 0 }))),
  ];
  const totalThemes = themes.length || 1;

  const cohortChips = [
    { id:'persona',   label:`Persona (You)`,           n:personaN, color:'#3B82F6' },
    { id:'overall',   label:`Overall (All Employees)`, n:null,     color:'#94A3B8' },
    ...comps.map(c => ({ id:c.id, label:c.label, n:c.n, color: COHORT_META[c.id]?.color || '#94A3B8' })),
  ];

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, gap:12 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <h1 style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
              Dynamic Persona Builder
            </h1>
            <InfoIcon />
          </div>
          <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0 }}>
            Build custom personas with advanced filters and compare against overall and other cohorts.
          </p>
        </div>
        <div style={{ display:'flex', gap:7, flexShrink:0 }}>
          <button className="dpb-btn-outline">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Save Persona
          </button>
          <button className="dpb-btn-outline">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
            Share
          </button>
          <button className="dpb-btn-primary" onClick={handleApply} disabled={loading}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Persona
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sa-filter-bar" style={{ marginBottom:12 }}>
        <div className="sa-filter-item">
          <span className="sa-filter-label">Business</span>
          <Dropdown variant="filter" value={business} options={bizOpts} onChange={setBusiness}/>
        </div>
        <div className="sa-filter-item">
          <span className="sa-filter-label">Country</span>
          <Dropdown variant="filter" value={country} options={countryOpts} onChange={setCountry}/>
        </div>
        <button className="sa-reset-btn" onClick={resetAll}>
          <RotateCcw size={12} />
          Reset Filters
        </button>
      </div>

      {/* Main grid */}
      <div className="dpb-main-grid">

        {/* LEFT: Build Persona */}
        <div className="sa-card dpb-build-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:12.5, fontWeight:800, color:'var(--text-primary)' }}>Build a New Persona</span>
          </div>

          {/* Persona Name */}
          <div style={{ marginBottom:14 }}>
            <div className="sa-filter-label" style={{ marginBottom:4 }}>Persona Name</div>
            <div style={{ position:'relative' }}>
              <input
                value={personaName}
                onChange={e => setPersonaName(e.target.value.slice(0,60))}
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

          {/* Select Dimensions */}
          <div style={{ marginBottom:12 }}>
            <div className="sa-filter-label" style={{ marginBottom:8 }}>Select Dimensions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {dimensions.map((dim, i) => (
                <div key={dim.id} className="dpb-dim-row">
                  <span className="dpb-dim-label">{dim.label}</span>
                  <DimSelect
                    value={dims[dim.id] ?? 'All'}
                    opts={['All', ...dim.values]}
                    color={DIM_COLORS[i % DIM_COLORS.length]}
                    onChange={v => setDim(dim.id, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div style={{ marginBottom:14 }}>
            <div className="sa-filter-label" style={{ marginBottom:6 }}>Advanced (Optional)</div>
            <div style={{ position:'relative' }}>
              <input placeholder="Add custom filter" style={{
                width:'100%', padding:'6px 30px 6px 8px',
                border:'1px solid var(--border)', borderRadius:6,
                fontSize:11, color:'var(--text-primary)',
                background:'var(--bg-card)', fontFamily:'inherit',
                outline:'none', boxSizing:'border-box',
              }}/>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:7, justifyContent:'flex-end', paddingTop:10, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setDims(Object.fromEntries(dimensions.map(d => [d.id,'All'])))} style={{
              fontSize:11, fontWeight:600, background:'none', border:'none',
              cursor:'pointer', color:'var(--text-muted)', fontFamily:'inherit', padding:'5px 6px',
            }}>
              Clear All
            </button>
            <button style={{
              fontSize:11, background:'none', border:'1px solid var(--border)',
              borderRadius:6, cursor:'pointer', color:'var(--text-secondary)',
              fontFamily:'inherit', padding:'5px 10px',
            }}>
              Cancel
            </button>
            <button onClick={handleApply} disabled={loading} style={{
              fontSize:11, fontWeight:700, background:'var(--blue-primary)',
              border:'none', borderRadius:6, cursor: loading ? 'not-allowed' : 'pointer',
              color:'white', fontFamily:'inherit', padding:'5px 12px',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Applying…' : 'Apply Persona'}
            </button>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

          {/* Comparison card */}
          <div className="sa-card">
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

            {/* API error banner */}
            {apiError && (
              <div style={{ fontSize:11, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FECACA',
                borderRadius:6, padding:'7px 10px', marginBottom:10 }}>
                {apiError}
              </div>
            )}

          {/* Cohort chips */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap' }}>
                Sample Size: {loading ? '…' : personaN.toLocaleString()}
              </span>
              <div style={{ width:1, height:14, background:'var(--border)' }}/>
              {cohortChips.map(c => (
                <div key={c.id} className="dpb-chip" style={{ borderColor:`${c.color}60` }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                  <span style={{ fontSize:10.5, fontWeight:500 }}>
                    {c.label}{c.n != null ? ` (${c.n.toLocaleString()})` : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div style={{ overflowX:'auto' }}>
              <table className="dpb-tbl">
                <colgroup>
                  <col style={{ width:'16%' }}/>
                  <col style={{ width:'18%' }}/>
                  <col style={{ width:'14%' }}/>
                  <col style={{ width:'16%' }}/>
                  <col style={{ width:'16%' }}/>
                  <col style={{ width:'20%' }}/>
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
                      <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>
                        (n = {personaN.toLocaleString()})
                      </div>
                    </th>
                    <th>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#94A3B8', flexShrink:0 }}/>
                        Overall (All Employees)
                      </div>
                    </th>
                    {comp0 && (
                      <th style={{ color: COHORT_META[comp0.id]?.color || '#22C55E' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background: COHORT_META[comp0.id]?.color || '#22C55E', flexShrink:0 }}/>
                          {comp0.label}
                        </div>
                        <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>
                          (n = {(comp0.n||0).toLocaleString()})
                        </div>
                      </th>
                    )}
                    {comp1 && (
                      <th style={{ color: COHORT_META[comp1.id]?.color || '#8B5CF6' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background: COHORT_META[comp1.id]?.color || '#8B5CF6', flexShrink:0 }}/>
                          {comp1.label}
                        </div>
                        <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>
                          (n = {(comp1.n||0).toLocaleString()})
                        </div>
                      </th>
                    )}
                    <th>vs Overall Significance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', fontSize:11, padding:'16px 0' }}>Loading…</td></tr>
                  ) : themes.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', fontSize:11, padding:'16px 0' }}>
                      Click "Apply Persona" to see results.
                    </td></tr>
                  ) : themes.map((row, i) => {
                    const isLast = i === themes.length - 1;
                    const c0 = row.comparisons?.[COMPARISON_COHORTS[0]];
                    const c1 = row.comparisons?.[COMPARISON_COHORTS[1]];
                    return (
                      <tr key={row.theme} style={isLast ? { background:'var(--bg-page)', fontWeight:700 } : {}}>
                        <td style={{ fontWeight: isLast ? 700 : 500, color:'var(--text-primary)', fontSize:11.5 }}>
                          {row.theme}
                        </td>
                        <td style={{ background: isLast ? '#EBF3FF' : '#F5F9FF' }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#1D4ED8' }}>
                            {row.persona_score?.toFixed(2)}
                          </span>
                          <Delta d={row.delta_overall} />
                        </td>
                        <td>
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)' }}>
                            {row.overall_score?.toFixed(2)}
                          </span>
                        </td>
                        {comp0 && (
                          <td>
                            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                              {c0?.score?.toFixed(2) ?? '—'}
                            </span>
                            {c0 && <Delta d={c0.delta} />}
                          </td>
                        )}
                        {comp1 && (
                          <td>
                            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                              {c1?.score?.toFixed(2) ?? '—'}
                            </span>
                            {c1 && <Delta d={c1.delta} />}
                          </td>
                        )}
                        <td><SigBadge label={row.significance_label} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop:8, display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>↑ / ↓ indicates difference vs Overall</span>
              <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>
                Significance tested using two-sample z-test for means (α = 0.05)
              </span>
              <InfoIcon />
            </div>
          </div>

          {/* Bottom row: radar + stats */}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.45fr) minmax(0,1fr)', gap:10, alignItems:'start' }}>

            {/* Radar chart */}
            <div className="sa-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
                <div className="sa-card-title" style={{ marginBottom:0 }}>
                  Visual Comparison Across Themes <InfoIcon />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>View by:</span>
                    <Dropdown variant="filter" value={viewBy}
                      options={['Themes','Categories']} onChange={setViewBy}/>
                  </div>
                </div>
              </div>
              <RadarChart
                personaScores={personaRadarScores}
                cohort1Scores={overallRadarScores}
                cohort2Scores={cohort0RadarScores}
                cohort1Label="Overall (All Employees)"
                cohort2Label={comp0?.label || 'New Joiners'}
              />
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr',
                gap:'5px 10px', marginTop:10,
                borderTop:'1px solid var(--border)', paddingTop:8,
              }}>
                {[
                  { label:`Persona (You): ${personaName}`, color:'#3B82F6' },
                  { label:'Overall (All Employees)', color:'#94A3B8' },
                  { label: comp0?.label || 'New Joiners', color:'#22C55E' },
                ].map(c => (
                  <div key={c.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                    <span style={{ fontSize:9.5, color:'var(--text-secondary)', lineHeight:1.3, minWidth:0 }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistical summary */}
            <div className="sa-card">
              <div className="sa-card-title">Statistical Difference Summary <InfoIcon /></div>
              <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'0 0 10px', lineHeight:1.45 }}>
                Number of themes where persona is significantly different vs:
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16 }}>
                {statRows.map(s => {
                  const allSig = s.n === totalThemes;
                  const bg     = allSig ? '#DCFCE7' : s.n >= totalThemes / 2 ? '#FEF3C7' : '#F1F5F9';
                  const color  = allSig ? '#15803D' : s.n >= totalThemes / 2 ? '#B45309' : '#64748B';
                  const border = allSig ? '#86EFAC' : s.n >= totalThemes / 2 ? '#FDE68A' : '#E2E8F0';
                  return (
                    <div key={s.vs} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'var(--text-primary)', flex:1, minWidth:0, lineHeight:1.35 }}>{s.vs}</span>
                      <span style={{
                        fontSize:10, fontWeight:700, padding:'3px 8px',
                        borderRadius:12, background:bg, color,
                        border:`1px solid ${border}`, whiteSpace:'nowrap', flexShrink:0,
                      }}>
                        {loading ? '…' : `${s.n} / ${totalThemes} Significant`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Key Takeaways */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26A6.99 6.99 0 0019 9c0-3.87-3.13-7-7-7z" fill="#F59E0B"/>
                    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" fill="#F59E0B"/>
                  </svg>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)' }}>Key Takeaways</span>
                </div>
                {loading ? (
                  <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:0 }}>Loading takeaways…</p>
                ) : takeaways.length > 0 ? (
                  <ul style={{ margin:0, paddingLeft:14, display:'flex', flexDirection:'column', gap:6 }}>
                    {takeaways.map((t,i) => (
                      <li key={i} style={{ fontSize:10.5, color:'var(--text-secondary)', lineHeight:1.5 }}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:0 }}>
                    Apply a persona to generate AI-powered key takeaways.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
