import { useState, useMemo, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import Dropdown from '../components/shared/Dropdown';

const FILTER_CFG = [
  { label:'Survey',   key:'survey',   opts:['ABG Vibes 2026','ABG Vibes 2025','ABG Vibes 2024'] },
  { label:'Business', key:'business', opts:['All','Aditya Birla New Age Hospitality Pvt. Ltd.','Birla Carbon','ABG Renewables','Aditya Birla Global Trading','Aditya Birla Mgmt Co. Pvt Ltd.','Apparels','Birla Estates','Birla Pivot','CFI','Cement HO','Century Group HO','Financial Services HO','Metals','Mining','Novel Jewels Ltd.','Paints HO','Pulp and Fibre HO','Textiles HO','ABG Headquarters','Grasim CFD','Novelis','Seamex'] },
  { label:'Year',     key:'year',     opts:['2026','2025','2024'] },
  { label:'Country',  key:'country',  opts:['India'] },
  { label:'Include Inactive Employees', key:'inactive', opts:['No','Yes'] },
];

const TILE_CFG = [
  { key:'strong_positive', label:'Strong Positive',       r:'r ≥ 0.50',         bg:'#DCFCE7', border:'#86EFAC', tc:'#15803D', nc:'#15803D' },
  { key:'moderate_positive',label:'Moderate Positive',     r:'0.20 ≤ r < 0.50',  bg:'#F0FDF4', border:'#BBF7D0', tc:'#166534', nc:'#16A34A' },
  { key:'weak_none',        label:'Weak / No Correlation', r:'-0.20 < r < 0.20', bg:'#F8FAFC', border:'#E2E8F0', tc:'#64748B', nc:'#94A3B8' },
  { key:'negative',         label:'Negative Correlation',  r:'r ≤ −0.20',        bg:'#FEF2F2', border:'#FECACA', tc:'#B91C1C', nc:'#DC2626' },
];

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      style={{ flexShrink:0, color:'var(--text-muted)', cursor:'default' }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function corrBg(v) {
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    return `rgb(${Math.round(248-28*t)},${Math.round(250-212*t)},${Math.round(252-214*t)})`;
  }
  const i = -t;
  return `rgb(${Math.round(248-211*i)},${Math.round(250-151*i)},${Math.round(252-17*i)})`;
}

function corrFg(v) { return Math.abs(v) >= 0.45 ? '#fff' : '#1e293b'; }

function strengthOf(r) {
  const a = Math.abs(r);
  if (a >= 0.50) return 'Strong';
  if (a >= 0.20) return 'Moderate';
  return 'None';
}

function edgeColor(r) {
  if (r > 0.15) return '#22C55E';
  if (r < -0.15) return '#EF4444';
  return '#CBD5E1';
}

function edgeStroke(r) {
  const a = Math.abs(r);
  if (a >= 0.50) return 3;
  if (a >= 0.30) return 2;
  if (a >= 0.15) return 1.5;
  return 1;
}

function StrengthBadge({ r }) {
  const str = strengthOf(r);
  if (str === 'None') return <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>No Correlation</span>;
  return (
    <span style={{ fontSize:10.5, fontWeight:600, color: r > 0 ? '#16A34A' : '#DC2626' }}>
      {str} {r > 0 ? '↑' : '↓'}
    </span>
  );
}

function formatSig(p) {
  if (!p && p !== 0) return '—';
  if (p < 0.001) return '< 0.001';
  if (p < 0.01)  return '< 0.01';
  if (p < 0.05)  return '< 0.05';
  return p.toFixed(3);
}

/* Correlogram accepts real data from backend */
function Correlogram({ qs = [], matrix = [] }) {
  const CS = 30, LW = 30;
  const N = qs.length;
  if (N === 0) return <div style={{ color:'var(--text-muted)', fontSize:11, padding:12 }}>No data</div>;
  const W = LW + N * CS;
  const H = LW + N * CS + 28;
  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={W} height={H} style={{ display:'block' }}>
        <defs>
          <linearGradient id="cgGrad" x1="0" x2="1">
            <stop offset="0%"   stopColor="rgb(37,99,235)"/>
            <stop offset="50%"  stopColor="rgb(248,250,252)"/>
            <stop offset="100%" stopColor="rgb(220,38,38)"/>
          </linearGradient>
        </defs>
        {qs.map((q, j) => (
          <text key={q} x={LW + j*CS + CS/2} y={LW-5}
            textAnchor="middle" fontSize={8} fontWeight={600} fill="#64748B">{q}</text>
        ))}
        {qs.map((q, i) => (
          <g key={q}>
            <text x={LW-3} y={LW + i*CS + CS/2 + 3}
              textAnchor="end" fontSize={8} fontWeight={600} fill="#64748B">{q}</text>
            {(matrix[i] || []).map((v, j) => (
              <g key={j}>
                <rect x={LW + j*CS} y={LW + i*CS} width={CS-1} height={CS-1}
                  fill={corrBg(v)} rx={1}/>
                <text x={LW + j*CS + CS/2} y={LW + i*CS + CS/2 + 3}
                  textAnchor="middle" fontSize={7.5} fontWeight={600} fill={corrFg(v)}>
                  {v.toFixed(2)}
                </text>
              </g>
            ))}
          </g>
        ))}
        <rect x={LW} y={LW + N*CS + 6} width={N*CS} height={7} fill="url(#cgGrad)" rx={2}/>
        <text x={LW}          y={LW + N*CS + 22} fontSize={7.5} fill="#94A3B8">-1.0</text>
        <text x={LW + N*CS/2} y={LW + N*CS + 22} textAnchor="middle" fontSize={7.5} fill="#94A3B8">0</text>
        <text x={LW + N*CS}   y={LW + N*CS + 22} textAnchor="end"    fontSize={7.5} fill="#94A3B8">1.0</text>
      </svg>
      <p style={{ fontSize:9.5, color:'var(--text-muted)', margin:'4px 0 0' }}>
        Darker color indicates stronger correlation
      </p>
    </div>
  );
}

/* NetworkGraph: relative scaling — strongest edge is always visible */
function positionNodes(backendNodes, edges, maxR, CX=300, CY=215) {
  const center  = backendNodes.find(n => n.is_center);
  const others  = backendNodes.filter(n => !n.is_center);
  const edgeMap = new Map((edges || []).map(e => [e.target, e.r ?? 0]));
  // Sort by |r| descending (already sorted from backend, but re-sort for safety)
  const sorted  = [...others].sort((a, b) => Math.abs(edgeMap.get(b.id) || 0) - Math.abs(edgeMap.get(a.id) || 0));
  const N = sorted.length || 1;
  const placed = sorted.map((node, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    const r     = edgeMap.get(node.id) || 0;
    // Rank-based radius: strongest (rank 0) closest, weakest farthest
    const rank   = N === 1 ? 0.5 : i / (N - 1);
    const radius = 110 + 85 * rank;        // 110 (closest) → 195 (farthest)
    return { ...node, x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle), edgeR: r };
  });
  return { center: center ? { ...center, x: CX, y: CY, edgeR: 1 } : null, others: placed };
}

function NetworkGraph({ nodes = [], edges = [], maxR: propMaxR }) {
  const CX = 300, CY = 215;
  // Use backend-supplied maxR, or compute from edges, minimum 0.01 to avoid /0
  const maxR = propMaxR || Math.max(...edges.map(e => Math.abs(e.r || 0)), 0.01);
  const { center, others } = positionNodes(nodes, edges, maxR, CX, CY);

  if (!center) {
    return <div style={{ color:'var(--text-muted)', fontSize:11, padding:12 }}>No network data</div>;
  }

  const relColor = r => r > 0 ? '#22C55E' : r < 0 ? '#EF4444' : '#CBD5E1';
  const relOpacity = r => 0.30 + 0.65 * (Math.abs(r) / maxR);
  const relStroke  = r => 1.0  + 2.50 * (Math.abs(r) / maxR);
  const relNodeR   = (r, rank) => 12 - 4 * rank;   // 12 (strongest) → 8 (weakest)

  return (
    <div style={{ background:'var(--bg-page)', borderRadius:8, overflow:'hidden' }}>
      <svg viewBox="0 0 600 470" style={{ width:'100%', height:'auto', display:'block' }}>
        {/* edges */}
        {others.map(n => (
          <line key={n.id}
            x1={CX} y1={CY} x2={n.x} y2={n.y}
            stroke={relColor(n.edgeR)}
            strokeWidth={relStroke(n.edgeR)}
            strokeOpacity={relOpacity(n.edgeR)}
          />
        ))}
        {/* peripheral nodes */}
        {others.map((n, i) => {
          const rank  = others.length === 1 ? 0 : i / (others.length - 1);
          const nr    = relNodeR(n.edgeR, rank);
          const fill   = n.edgeR > 0 ? '#DCFCE7' : n.edgeR < 0 ? '#FEE2E2' : '#F1F5F9';
          const stroke = n.edgeR > 0 ? '#22C55E' : n.edgeR < 0 ? '#EF4444' : '#CBD5E1';
          const short  = (n.label || n.id).slice(0, 6);
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={nr} fill={fill} stroke={stroke} strokeWidth={1.5}/>
              <text x={n.x} y={n.y+3.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#475569">
                {short}
              </text>
            </g>
          );
        })}
        {/* centre node */}
        <circle cx={CX} cy={CY} r={24} fill="#3B82F6" stroke="#2563EB" strokeWidth={2}/>
        <text x={CX} y={CY+3.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="white">
          {(center.label || center.id || '').slice(0, 6)}
        </text>
        {/* tooltip */}
        <rect x={CX-82} y={CY+30} width={164} height={22} rx={4} fill="white" stroke="#E2E8F0" strokeWidth={1}/>
        <text x={CX} y={CY+45} textAnchor="middle" fontSize={7.5} fill="#64748B">
          {(center.label || center.id || '').slice(0, 50)}
        </text>
      </svg>
    </div>
  );
}

export default function StatisticalAnalysisPage() {
  const [activeTab,   setActiveTab]   = useState('all');
  const [expanded,    setExpanded]    = useState(false);
  const [topCorr,     setTopCorr]     = useState('Top 20');
  const [topNet,      setTopNet]      = useState('Top 25');
  const [filters, setFilters] = useState({
    survey:'ABG Vibes 2026', business:'All', year:'2026', country:'India', inactive:'No',
  });

  /* ── API state ── */
  const [questions,   setQuestions]   = useState([]);
  const [selQId,      setSelQId]      = useState('');
  const [selQText,    setSelQText]    = useState('');
  const [nResp,       setNResp]       = useState(0);
  const [tabCounts,   setTabCounts]   = useState({ all:0, strong_positive:0, moderate_positive:0, weak_none:0, negative:0 });
  const [correlations,setCorrelations]= useState([]);
  const [corrQs,      setCorrQs]      = useState([]);
  const [corrMatrix,  setCorrMatrix]  = useState([]);
  const [netNodes,    setNetNodes]    = useState([]);
  const [netEdges,    setNetEdges]    = useState([]);
  const [netMaxR,     setNetMaxR]     = useState(1);
  const [insight,     setInsight]     = useState('');
  const [loading,     setLoading]     = useState(false);

  const setF   = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const resetF = () => setFilters({ survey:'ABG Vibes 2026', business:'All', year:'2026', country:'India', inactive:'No' });

  /* fetch questions list on mount */
  useEffect(() => {
    fetch('/api/statistical/questions')
      .then(r => r.json())
      .then(d => {
        const qs = d.questions || [];
        setQuestions(qs);
        if (qs.length > 0) {
          setSelQId(qs[0].id);
          setSelQText(qs[0].text);
        }
      });
  }, []);

  /* fetch correlation data whenever selected question changes */
  useEffect(() => {
    if (!selQId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/statistical/correlations/${selQId}`).then(r => r.json()),
      fetch(`/api/statistical/correlogram/${selQId}`).then(r => r.json()),
      fetch(`/api/statistical/network/${selQId}`).then(r => r.json()),
      fetch(`/api/statistical/insights/${selQId}`).then(r => r.json()),
    ]).then(([corrData, cgData, netData, insData]) => {
      setNResp(corrData.n || 0);
      setTabCounts(corrData.tab_counts || { all:0, strong_positive:0, moderate_positive:0, weak_none:0, negative:0 });
      setCorrelations(corrData.correlations || []);
      setCorrQs(cgData.question_ids || []);
      setCorrMatrix(cgData.matrix || []);
      setNetNodes(netData.nodes || []);
      setNetEdges(netData.edges || []);
      setNetMaxR(netData.max_r || 1);
      setInsight(insData.insight || '');
    }).finally(() => setLoading(false));
  }, [selQId]);

  const tabRows = useMemo(() => {
    switch (activeTab) {
      case 'pos':  return correlations.filter(c => c.pearson_r >  0.20);
      case 'neg':  return correlations.filter(c => c.pearson_r < -0.20);
      case 'none': return correlations.filter(c => Math.abs(c.pearson_r) <= 0.20);
      default:     return correlations;
    }
  }, [activeTab, correlations]);

  const TABS = [
    { key:'all',  label:`All (${tabCounts.all})` },
    { key:'pos',  label:`Positive (${tabCounts.strong_positive + tabCounts.moderate_positive})` },
    { key:'neg',  label:`Negative (${tabCounts.negative})` },
    { key:'none', label:`No Correlation (${tabCounts.weak_none})` },
  ];

  const handleQChange = (e) => {
    const q = questions.find(q => q.id === e.target.value);
    if (q) { setSelQId(q.id); setSelQText(q.text); }
  };

  return (
    <div className="page-container">

      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <h1 style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
            Statistical Analysis
          </h1>
          <InfoIcon />
        </div>
        <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0 }}>
          Explore statistical relationships between survey questions using Pearson correlation.
        </p>
      </div>

      {/* filter bar */}
      <div className="sa-filter-bar" style={{ marginBottom:12 }}>
        {FILTER_CFG.map(f => (
          <div key={f.key} className="sa-filter-item">
            <span className="sa-filter-label">{f.label}</span>
            <Dropdown variant="filter" value={filters[f.key]} options={f.opts} onChange={v => setF(f.key, v)}/>
          </div>
        ))}
        <button className="sa-reset-btn" onClick={resetF}>
          <RotateCcw size={12} />
          Reset Filters
        </button>
        <span style={{ fontSize:10, color:'#92400E', background:'#FEF3C7', border:'1px solid #FDE68A',
          borderRadius:4, padding:'2px 7px', flexShrink:0 }}>
          Capability demo — filters will be fully functional with business-unit data
        </span>
      </div>

      {/* top grid */}
      <div className="sta-top-grid">

        {/* 1. Select a Question */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="sa-card-title">1. Select a Question <InfoIcon /></div>
          <select
            value={selQId}
            onChange={handleQChange}
            style={{
              width:'100%', padding:'7px 8px', border:'1px solid var(--border)',
              borderRadius:6, background:'var(--bg-card)', fontSize:11,
              color:'var(--text-primary)', fontFamily:'inherit',
              cursor:'pointer', outline:'none', marginBottom:10,
            }}
          >
            {questions.map(q => (
              <option key={q.id} value={q.id}>
                {q.id}. {q.text}
              </option>
            ))}
          </select>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>
              <span style={{ fontWeight:600, color:'var(--text-secondary)' }}>Question Type: </span>
              Likert Scale (1–5)
            </div>
            <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>
              <span style={{ fontWeight:600, color:'var(--text-secondary)' }}>Responses: </span>
              {loading ? '…' : nResp.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Correlation Summary + Overall Insights */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="sa-card-title" style={{ marginBottom:8 }}>
            Correlation Summary with Other Questions <InfoIcon />
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'stretch', flex:1 }}>

            {/* 4 tiles */}
            <div style={{ flex:1, minWidth:0, display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:8, alignContent:'start' }}>
              {TILE_CFG.map(t => (
                <div key={t.key} style={{
                  background:t.bg, border:`1px solid ${t.border}`,
                  borderRadius:8, padding:'10px 12px',
                }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:t.tc, marginBottom:4 }}>{t.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:t.nc, lineHeight:1.1, marginBottom:2 }}>
                    {loading ? '…' : tabCounts[t.key] ?? 0}
                  </div>
                  <div style={{ fontSize:10, color:t.tc, opacity:0.8, marginBottom:4 }}>Questions</div>
                  <div style={{ fontSize:10, color:t.tc, fontStyle:'italic', opacity:0.75 }}>{t.r}</div>
                </div>
              ))}
            </div>

            {/* Overall Insights */}
            <div style={{
              width:195, flexShrink:0,
              background:'#FFFBEB', border:'1px solid #FDE68A',
              borderRadius:8, padding:'10px 12px',
              display:'flex', flexDirection:'column', justifyContent:'center',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26A6.99 6.99 0 0019 9c0-3.87-3.13-7-7-7z" fill="#F59E0B"/>
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" fill="#F59E0B"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, color:'#92400E' }}>Overall Insights</span>
              </div>
              <p style={{ fontSize:10.5, color:'#78350F', lineHeight:1.55, margin:0 }}>
                {loading ? 'Loading…' : insight || 'Select a question to see insights.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* bottom grid */}
      <div className="sta-bot-grid">

        {/* 2. Correlations table */}
        <div className="sa-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              2. Correlations with All Questions <InfoIcon />
            </div>
            <button onClick={() => setExpanded(e => !e)} style={{
              fontSize:10, fontWeight:600, padding:'3px 8px',
              border:'1px solid var(--border)', borderRadius:5,
              background:'none', cursor:'pointer',
              color:'var(--text-secondary)', fontFamily:'inherit',
              whiteSpace:'nowrap', flexShrink:0,
            }}>
              {expanded ? 'Collapse' : 'Expand All'}
            </button>
          </div>

          <div className="sta-tabs">
            {TABS.map(t => (
              <button key={t.key}
                className={`sta-tab${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <table className="sta-corr-tbl">
            <colgroup>
              <col style={{ width:'46%' }}/>
              <col style={{ width:'14%' }}/>
              <col style={{ width:'22%' }}/>
              <col style={{ width:'18%' }}/>
            </colgroup>
            <thead>
              <tr>
                <th>Question</th>
                <th style={{ textAlign:'right' }}>Pearson r</th>
                <th>Strength</th>
                <th style={{ textAlign:'right' }}>Significance<br/>(p-value)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', fontSize:11, padding:'16px 0' }}>Loading…</td></tr>
              ) : (expanded ? tabRows : tabRows.slice(0, 10)).map(c => (
                <tr key={c.question_id}>
                  <td style={{ fontSize:10.5, color:'var(--text-primary)' }}>
                    <span style={{ fontWeight:600, color:'var(--blue-primary)', marginRight:3 }}>{c.question_id}.</span>
                    <span style={{ wordBreak:'break-word' }}>{c.question_text}</span>
                  </td>
                  <td style={{
                    fontSize:11, fontWeight:700, textAlign:'right',
                    color: c.pearson_r > 0 ? '#16A34A' : c.pearson_r < 0 ? '#DC2626' : '#94A3B8',
                  }}>
                    {c.pearson_r > 0 ? '+' : ''}{c.pearson_r?.toFixed(2)}
                  </td>
                  <td><StrengthBadge r={c.pearson_r}/></td>
                  <td style={{ fontSize:10.5, color:'var(--text-muted)', textAlign:'right' }}>
                    {formatSig(c.p_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
            <p style={{ fontSize:9.5, color:'var(--text-muted)', margin:'0 0 6px' }}>
              Showing 1 to {Math.min(tabRows.length, expanded ? tabRows.length : 10)} of {tabCounts.all} questions
            </p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { color:'#16A34A', label:'Strong |r| ≥ 0.50'          },
                { color:'#2563EB', label:'Moderate 0.20 ≤ |r| < 0.50' },
                { color:'#94A3B8', label:'Weak/None |r| < 0.20'        },
              ].map(l => (
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:l.color, flexShrink:0 }}/>
                  <span style={{ fontSize:9, color:'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Correlogram */}
        <div className="sa-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              3. Correlogram (Top Related Questions) <InfoIcon />
            </div>
            <Dropdown variant="filter" value={topCorr}
              options={['Top 10','Top 20','Top 30']} onChange={setTopCorr}/>
          </div>
          {loading
            ? <div style={{ color:'var(--text-muted)', fontSize:11, padding:8 }}>Loading…</div>
            : <Correlogram qs={corrQs} matrix={corrMatrix} />
          }
        </div>

        {/* 4. Relationship Network */}
        <div className="sa-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              4. Relationship Network <InfoIcon />
            </div>
            <Dropdown variant="filter" value={topNet}
              options={['Top 15','Top 25','Top 50']} onChange={setTopNet}/>
          </div>
          {loading
            ? <div style={{ color:'var(--text-muted)', fontSize:11, padding:8 }}>Loading…</div>
            : <NetworkGraph nodes={netNodes} edges={netEdges} maxR={netMaxR} />
          }
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:8 }}>
            {[
              { color:'#22C55E', label:'Positive Correlation'    },
              { color:'#EF4444', label:'Negative Correlation'    },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:20, height:3, background:l.color, borderRadius:2 }}/>
                <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize:9, color:'var(--text-muted)', margin:'4px 0 0' }}>
            Edge thickness and opacity represent <em>relative</em> correlation strength (max r = {netMaxR?.toFixed(3) ?? '—'})
          </p>
        </div>

      </div>

      <div style={{
        display:'flex', alignItems:'center', gap:6,
        marginTop:12, padding:'8px 12px',
        background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0 }}>
          <circle cx="6" cy="6" r="5" fill="#3B82F6"/>
          <path d="M6 5.5v3M6 3.5v.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize:10.5, color:'#1D4ED8' }}>
          Correlation does not imply causation. Results are based on Pearson correlation coefficient.
        </span>
      </div>

    </div>
  );
}
