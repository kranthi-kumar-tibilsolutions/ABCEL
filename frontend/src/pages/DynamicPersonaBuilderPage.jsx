import { useState, useRef, useEffect, useContext } from 'react';
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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/* ── static data ──────────────────────────────────────────────── */
const DIMS_DEFAULT = {
  'Region': 'APAC', 'Tenure': '> 3 Years', 'Job Level': 'Manager',
  'Potential': 'High', 'Function': 'All', 'Employment Type': 'Full-time',
};

const DPB_FILTERS_CFG = [
  { label: 'Business', key: 'business', opts: ['All', 'Finance', 'Operations', 'HR', 'Technology'] },
  { label: 'Year',     key: 'year',     opts: ['2024', '2023', '2022'] },
  { label: 'Country',  key: 'country',  opts: ['All', 'United Kingdom', 'United States', 'India'] },
  { label: 'Survey',   key: 'survey',   opts: ['Q4 2024 Employee Survey', 'Q3 2024 Employee Survey', 'Q2 2024'] },
  { label: 'Inactive', key: 'inactive', opts: ['No', 'Yes'] },
];

const DIMENSIONS_CFG = [
  { name:'Region',          opts:['All','APAC','EMEA','Americas','Global'],                        color:{ bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE' } },
  { name:'Tenure',          opts:['All','< 1 Year','1-3 Years','> 3 Years','> 5 Years'],            color:{ bg:'#F0FDF4', text:'#15803D', border:'#BBF7D0' } },
  { name:'Job Level',       opts:['All','Junior','Manager','Senior Manager','Director','VP'],       color:{ bg:'#F5F3FF', text:'#6D28D9', border:'#DDD6FE' } },
  { name:'Potential',       opts:['All','High','Medium','Low'],                                      color:{ bg:'#FFF7ED', text:'#C2410C', border:'#FED7AA' } },
  { name:'Function',        opts:['All','Engineering','Sales','HR','Finance','Operations'],          color:{ bg:'#F0FDF4', text:'#15803D', border:'#BBF7D0' } },
  { name:'Employment Type', opts:['All','Full-time','Part-time','Contract'],                         color:{ bg:'#EFF6FF', text:'#1D4ED8', border:'#BFDBFE' } },
];

const THEMES_DATA = [
  { name:'Leadership',       persona:4.32, overall:3.90, nj:3.48, eng:3.95, sig:'p < 0.01' },
  { name:'Career Growth',    persona:4.18, overall:3.70, nj:3.22, eng:3.82, sig:'p < 0.01' },
  { name:'Recognition',      persona:3.89, overall:3.56, nj:3.21, eng:3.61, sig:'p < 0.02' },
  { name:'Work Environment', persona:4.21, overall:3.80, nj:3.42, eng:3.88, sig:'p < 0.01' },
  { name:'Wellbeing',        persona:4.05, overall:3.70, nj:3.28, eng:3.76, sig:'p < 0.01' },
  { name:'Overall Rating',   persona:4.13, overall:3.70, nj:3.32, eng:3.80, sig:'p < 0.01', isTotal:true },
];

const RADAR_THEMES = ['Leadership','Career Growth','Recognition','Work Environment','Wellbeing'];

const COHORTS = [
  { id:'persona',    label:'Persona (You)',           n:642,  color:'#3B82F6' },
  { id:'overall',   label:'Overall (All Employees)',  n:4852, color:'#94A3B8' },
  { id:'newjoiners',label:'New Joiners (<1 yr)',       n:512,  color:'#22C55E' },
  { id:'engineers', label:'Engineers - APAC',          n:1204, color:'#8B5CF6' },
];

const STAT_SUMMARY = [
  { vs:'Overall (All Employees)', val:'5 / 5 Significant', color:'#15803D', bg:'#DCFCE7', border:'#86EFAC' },
  { vs:'New Joiners (<1 yr)',      val:'5 / 5 Significant', color:'#15803D', bg:'#DCFCE7', border:'#86EFAC' },
  { vs:'Engineers - APAC',        val:'3 / 5 Significant', color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
];

/* ── helpers ──────────────────────────────────────────────────── */
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
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="#DCFCE7"/>
        <path d="M4 7l2.5 2.5L10 4.5" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize:10, color:'#15803D', fontWeight:600 }}>{sig}</span>
    </div>
  );
}

/* dimension badge dropdown */
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
        <span>{value}</span>
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

/* radar chart — Chart.js */
const RADAR_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  scales: {
    r: {
      min: 0,
      max: 5,
      ticks: {
        stepSize: 1,
        font: { size: 9 },
        color: '#94A3B8',
        backdropColor: 'transparent',
        showLabelBackdrop: false,
      },
      grid:       { color: '#E2E8F0' },
      angleLines: { color: '#E2E8F0' },
      pointLabels: {
        font: { size: 10.5, weight: '600', family: 'inherit' },
        color: '#475569',
        padding: 14,
      },
    },
  },
  plugins: {
    legend:  { display: false },
    tooltip: {
      callbacks: {
        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(2)}`,
      },
    },
  },
};

function RadarChart({ personaScores, cohortScores }) {
  const data = {
    labels: RADAR_THEMES,
    datasets: [
      {
        label: 'Persona (You)',
        data: RADAR_THEMES.map(t => personaScores[t] ?? 0),
        backgroundColor: 'rgba(59,130,246,0.18)',
        borderColor: '#3B82F6',
        borderWidth: 2.5,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 3.5,
        pointHoverRadius: 5,
        order: 0,
      },
      {
        label: 'Overall (All Employees)',
        data: RADAR_THEMES.map(t => cohortScores[0]?.[t] ?? 0),
        backgroundColor: 'rgba(148,163,184,0.08)',
        borderColor: '#94A3B8',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointBackgroundColor: '#94A3B8',
        pointRadius: 2.5,
        order: 1,
      },
      {
        label: 'New Joiners (<1 yr)',
        data: RADAR_THEMES.map(t => cohortScores[1]?.[t] ?? 0),
        backgroundColor: 'rgba(34,197,94,0.07)',
        borderColor: '#22C55E',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointBackgroundColor: '#22C55E',
        pointRadius: 2.5,
        order: 2,
      },
      {
        label: 'Engineers - APAC',
        data: RADAR_THEMES.map(t => cohortScores[2]?.[t] ?? 0),
        backgroundColor: 'rgba(139,92,246,0.07)',
        borderColor: '#8B5CF6',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointBackgroundColor: '#8B5CF6',
        pointRadius: 2.5,
        order: 3,
      },
    ],
  };

  return (
    <div style={{ position:'relative', height:295 }}>
      <Radar data={data} options={{ ...RADAR_OPTIONS, maintainAspectRatio: false }} />
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────── */
export default function DynamicPersonaBuilderPage() {
  const {
    dpbResetSignal, setDpbResetSignal,
    dpbFilters, setDpbFilters,
    setBreadcrumb,
  } = useContext(AppContext);
  const [personaName, setPersonaName] = useState('High Potential Managers - APAC');
  const [dims,    setDims]    = useState({ ...DIMS_DEFAULT });
  const [viewBy, setViewBy] = useState('Themes');

  const setDim = (k,v) => setDims(d => ({ ...d, [k]: v }));

  useEffect(() => {
    setBreadcrumb([
      { label: 'Persona Explorer' },
      { label: 'Dynamic Persona Builder' },
    ]);
  }, []);

  useEffect(() => {
    if (dpbResetSignal) setDims({ ...DIMS_DEFAULT });
  }, [dpbResetSignal]);

  const personaRadarScores = Object.fromEntries(
    THEMES_DATA.filter(t => !t.isTotal).map(t => [t.name, t.persona])
  );
  const cohortRadarScores = [
    Object.fromEntries(THEMES_DATA.filter(t=>!t.isTotal).map(t=>[t.name,t.overall])),
    Object.fromEntries(THEMES_DATA.filter(t=>!t.isTotal).map(t=>[t.name,t.nj])),
    Object.fromEntries(THEMES_DATA.filter(t=>!t.isTotal).map(t=>[t.name,t.eng])),
  ];

  return (
    <div className="page-container">

      {/* ── Filters + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {DPB_FILTERS_CFG.map(f => (
            <Dropdown
              key={f.key}
              variant="topbar"
              label={f.label}
              value={dpbFilters[f.key]}
              options={f.opts.map(o => ({ value: o, label: o }))}
              onChange={v => setDpbFilters(prev => ({ ...prev, [f.key]: v }))}
            />
          ))}
          <button className="topbar-btn" onClick={() => setDpbResetSignal(s => s + 1)} title="Reset filters">
            <RotateCcw size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="topbar-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Save
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
          <button className="topbar-btn topbar-btn-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Persona
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
              {DIMENSIONS_CFG.map(d => (
                <div key={d.name} className="dpb-dim-row">
                  <span className="dpb-dim-label">{d.name}</span>
                  <DimSelect
                    value={dims[d.name]}
                    opts={d.opts}
                    color={d.color}
                    onChange={v => setDim(d.name, v)}
                  />
                </div>
              ))}
            </div>
            <button style={{
              display:'flex', alignItems:'center', gap:4, marginTop:10,
              background:'none', border:'none', cursor:'pointer',
              color:'var(--blue-primary)', fontSize:11, fontWeight:600,
              fontFamily:'inherit', padding:0,
            }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Add Dimension
            </button>
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
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', gap:7, justifyContent:'flex-end', paddingTop:10, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setDims({ ...DIMS_DEFAULT })} style={{
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
            <button style={{
              fontSize:11, fontWeight:700, background:'var(--blue-primary)',
              border:'none', borderRadius:6, cursor:'pointer', color:'white',
              fontFamily:'inherit', padding:'5px 12px',
            }}>
              Apply Persona
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

          {/* Comparison card */}
          <div className="sa-card">

            {/* Card header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, gap:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12.5, fontWeight:800, color:'var(--text-primary)' }}>
                  Comparing: {personaName}
                </span>
                <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M9.5 4.5l2 2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                </button>
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
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap' }}>
                Sample Size: 642
              </span>
              <div style={{ width:1, height:14, background:'var(--border)' }}/>
              {COHORTS.map(c => (
                <div key={c.id} className="dpb-chip" style={{ borderColor:`${c.color}60` }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                  <span style={{ fontSize:10.5, fontWeight:500 }}>{c.label}</span>
                </div>
              ))}
              <button style={{
                display:'flex', alignItems:'center', gap:3,
                fontSize:10.5, fontWeight:700, color:'var(--blue-primary)',
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Add Cohort
              </button>
            </div>

            {/* Comparison table */}
            <div style={{ overflowX:'auto' }}>
              <table className="dpb-tbl">
                <colgroup>
                  <col style={{ width:'15%' }}/>
                  <col style={{ width:'19%' }}/>
                  <col style={{ width:'13%' }}/>
                  <col style={{ width:'16%' }}/>
                  <col style={{ width:'16%' }}/>
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
                        High Potential Managers - APAC
                      </div>
                      <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = 642)</div>
                    </th>
                    <th>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#94A3B8', flexShrink:0 }}/>
                        Overall (All Employees)
                      </div>
                      <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = 4,852)</div>
                    </th>
                    <th style={{ color:'#16A34A' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#22C55E', flexShrink:0 }}/>
                        New Joiners (&lt;1 yr)
                      </div>
                      <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = 512)</div>
                    </th>
                    <th style={{ color:'#7C3AED' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#8B5CF6', flexShrink:0 }}/>
                        Engineers - APAC
                      </div>
                      <div style={{ fontWeight:400, fontSize:9, color:'var(--text-muted)', paddingLeft:10 }}>(n = 1,204)</div>
                    </th>
                    <th>vs Overall Significance</th>
                  </tr>
                </thead>
                <tbody>
                  {THEMES_DATA.map(row => (
                    <tr key={row.name} style={ row.isTotal ? { background:'var(--bg-page)', fontWeight:700 } : {} }>
                      <td style={{ fontWeight: row.isTotal ? 700 : 500, color:'var(--text-primary)', fontSize:11.5 }}>
                        {row.name}
                      </td>
                      <td style={{ background: row.isTotal ? '#EBF3FF' : '#F5F9FF' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1D4ED8' }}>{row.persona.toFixed(2)}</span>
                        <Delta score={row.persona} baseline={row.overall}/>
                      </td>
                      <td>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)' }}>{row.overall.toFixed(2)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{row.nj.toFixed(2)}</span>
                        <Delta score={row.nj} baseline={row.overall}/>
                      </td>
                      <td>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{row.eng.toFixed(2)}</span>
                        <Delta score={row.eng} baseline={row.overall}/>
                      </td>
                      <td><SigBadge sig={row.sig}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footnotes */}
            <div style={{ marginTop:8, display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>↑ / ↓ indicates difference vs Overall</span>
              <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>
                Significance tested using two-sample z-test for means (α = 0.05)
              </span>
              <InfoIcon />
            </div>
          </div>

          {/* ── Bottom row: radar + stats ── MOVED BELOW MAIN GRID */}
          <div style={{ display:'none' }}>

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
                  <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v8M5 9l3 3 3-3"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <RadarChart
                personaScores={personaRadarScores}
                cohortScores={cohortRadarScores}
              />

              {/* Legend — circle dots, 2-column grid */}
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr',
                gap:'5px 10px', marginTop:10,
                borderTop:'1px solid var(--border)', paddingTop:8,
              }}>
                {COHORTS.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
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
                {STAT_SUMMARY.map(s => (
                  <div key={s.vs} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, color:'var(--text-primary)', flex:1, minWidth:0, lineHeight:1.35 }}>{s.vs}</span>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'3px 8px',
                      borderRadius:12, background:s.bg, color:s.color,
                      border:`1px solid ${s.border}`, whiteSpace:'nowrap', flexShrink:0,
                    }}>{s.val}</span>
                  </div>
                ))}
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
                <ul style={{ margin:0, paddingLeft:14, display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    'Your persona scores significantly higher than overall across all themes.',
                    'Largest positive gap vs overall: Career Growth (+0.48)',
                    'Recognition shows the smallest gap vs overall (+0.33)',
                  ].map((t,i) => (
                    <li key={i} style={{ fontSize:10.5, color:'var(--text-secondary)', lineHeight:1.5 }}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Bottom row: radar + stats — full page width ── */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.45fr) minmax(0,1fr)', gap:10, alignItems:'start', marginTop:10 }}>

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
              <button style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v8M5 9l3 3 3-3"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <RadarChart
            personaScores={personaRadarScores}
            cohortScores={cohortRadarScores}
          />

          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr',
            gap:'5px 10px', marginTop:10,
            borderTop:'1px solid var(--border)', paddingTop:8,
          }}>
            {COHORTS.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
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
            {STAT_SUMMARY.map(s => (
              <div key={s.vs} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-primary)', flex:1, minWidth:0, lineHeight:1.35 }}>{s.vs}</span>
                <span style={{
                  fontSize:10, fontWeight:700, padding:'3px 8px',
                  borderRadius:12, background:s.bg, color:s.color,
                  border:`1px solid ${s.border}`, whiteSpace:'nowrap', flexShrink:0,
                }}>{s.val}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26A6.99 6.99 0 0019 9c0-3.87-3.13-7-7-7z" fill="#F59E0B"/>
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" fill="#F59E0B"/>
              </svg>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)' }}>Key Takeaways</span>
            </div>
            <ul style={{ margin:0, paddingLeft:14, display:'flex', flexDirection:'column', gap:6 }}>
              {[
                'Your persona scores significantly higher than overall across all themes.',
                'Largest positive gap vs overall: Career Growth (+0.48)',
                'Recognition shows the smallest gap vs overall (+0.33)',
              ].map((t,i) => (
                <li key={i} style={{ fontSize:10.5, color:'var(--text-secondary)', lineHeight:1.5 }}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
