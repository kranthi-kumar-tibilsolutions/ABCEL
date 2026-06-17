import { useState, useContext, useMemo, useRef, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import Dropdown from '../components/shared/Dropdown';
import { apiFetch } from '../utils/api';

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
  if (r >= 0.20) return '#22C55E';
  if (r <= -0.20) return '#EF4444';
  return '#CBD5E1';
}

function edgeStroke(r) {
  const a = Math.abs(r);
  if (a >= 0.50) return 3;
  if (a >= 0.30) return 2;
  if (a >= 0.15) return 1.5;
  return 1;
}

function fmtP(p) {
  if (p === null || p === undefined) return '—';
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

/* ── skeleton helper ──────────────────────────────────────────── */
function Sk({ w='100%', h=12, r=4, sx={} }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:r, flexShrink:0, ...sx }}/>;
}

/* ── sub-components ───────────────────────────────────────────── */
function StrengthBadge({ r }) {
  const str = strengthOf(r);
  if (str === 'None') return <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>No Correlation</span>;
  return (
    <span style={{ fontSize:10.5, fontWeight:600, color: r > 0 ? '#16A34A' : '#DC2626' }}>
      {str} {r > 0 ? '↑' : '↓'}
    </span>
  );
}

/* ── Correlogram ── */
function trunc(str, max) {
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

function Correlogram({ labels = [], fullLabels = [], matrix = [] }) {
  const containerRef = useRef(null);
  const [cw, setCw] = useState(0);
  const [tip, setTip] = useState(null); // { x, y, ri, ci, v }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const N   = labels.length;
  if (!N) return <div style={{ color:'var(--text-muted)', fontSize:11, padding:12 }}>Loading correlogram…</div>;

  const lfs    = 8;
  const maxLen = Math.max(...labels.map(l => l.length));
  const rotate = maxLen > 6;
  const LW     = rotate ? Math.min(100, maxLen * lfs * 0.55 + 8) : 40;
  const TH     = rotate ? Math.min(110, maxLen * lfs * 0.55 + 12) : 22;
  const CW     = cw > 0 ? Math.floor((cw - LW) / N) : 32;
  const CH     = 30;
  const W      = LW + N * CW;
  const H      = TH + N * CH + 26;
  const vfs    = Math.min(10, Math.max(7, CW * 0.15));
  const rowMax = Math.max(4, Math.floor(LW / (lfs * 0.58)));

  const showTip = (e, ri, ci, v) => setTip({ x: e.clientX, y: e.clientY, ri, ci, v });
  const moveTip = (e) => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  const hideTip = () => setTip(null);

  return (
    <div ref={containerRef} style={{ width:'100%', overflowX:'auto', position:'relative' }}>

      {/* custom tooltip — flips left/up when near screen edges */}
      {tip && (
        <div style={{
          position: 'fixed',
          left: tip.x + 280 + 20 > window.innerWidth ? tip.x - 294 : tip.x + 14,
          top:  tip.y + 120     > window.innerHeight  ? tip.y - 110 : tip.y - 14,
          zIndex: 9999,
          background: '#1E293B',
          color: '#F8FAFC',
          padding: '9px 12px',
          borderRadius: 8,
          fontSize: 11,
          width: 280,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          lineHeight: 1.55,
        }}>
          <div style={{ marginBottom: 3 }}>
            <span style={{ color:'#60A5FA', fontWeight:600 }}>{labels[tip.ri]}</span>
            {fullLabels[tip.ri] && fullLabels[tip.ri] !== labels[tip.ri] &&
              <span style={{ color:'#CBD5E1' }}> · {fullLabels[tip.ri]}</span>}
          </div>
          <div>
            <span style={{ color:'#60A5FA', fontWeight:600 }}>{labels[tip.ci]}</span>
            {fullLabels[tip.ci] && fullLabels[tip.ci] !== labels[tip.ci] &&
              <span style={{ color:'#CBD5E1' }}> · {fullLabels[tip.ci]}</span>}
          </div>
        </div>
      )}

      <svg width={Math.max(W, cw || 0)} height={H} style={{ display:'block', minWidth:'100%' }}>
        <defs>
          <linearGradient id="cgGrad" x1="0" x2="1">
            <stop offset="0%"   stopColor="rgb(37,99,235)"/>
            <stop offset="50%"  stopColor="rgb(248,250,252)"/>
            <stop offset="100%" stopColor="rgb(220,38,38)"/>
          </linearGradient>
        </defs>

        {/* column headers */}
        {labels.map((q, j) => {
          const cx = LW + j * CW + CW / 2;
          return rotate ? (
            <text key={q}
              transform={`translate(${cx},${TH - 4}) rotate(-45)`}
              textAnchor="start" fontSize={lfs} fontWeight={600} fill="#64748B">
              <title>{fullLabels[j] || q}</title>
              {trunc(q, 18)}
            </text>
          ) : (
            <text key={q} x={cx} y={TH - 5}
              textAnchor="middle" fontSize={lfs} fontWeight={600} fill="#64748B">
              <title>{fullLabels[j] || q}</title>
              {trunc(q, Math.max(4, Math.floor(CW / (lfs * 0.58))))}
            </text>
          );
        })}

        {/* rows */}
        {labels.map((q, i) => (
          <g key={q}>
            <text x={LW - 4} y={TH + i*CH + CH/2 + lfs*0.38}
              textAnchor="end" fontSize={lfs} fontWeight={600} fill="#64748B">
              <title>{fullLabels[i] || q}</title>
              {trunc(q, rowMax)}
            </text>
            {labels.map((_, j) => {
              const v = (matrix[i] || [])[j] ?? 0;
              return (
                <g key={j} style={{ cursor:'crosshair' }}
                  onMouseEnter={e => showTip(e, i, j, v)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}>
                  <rect x={LW + j*CW} y={TH + i*CH} width={CW-2} height={CH-2}
                    fill={corrBg(v)} rx={2}/>
                  <text x={LW + j*CW + CW/2} y={TH + i*CH + CH/2 + vfs*0.38}
                    textAnchor="middle" fontSize={vfs} fontWeight={600} fill={corrFg(v)}>
                    {v.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        <rect x={LW} y={TH + N*CH + 6} width={N*CW} height={7} fill="url(#cgGrad)" rx={2}/>
        <text x={LW}           y={TH + N*CH + 22} fontSize={7.5} fill="#94A3B8">-1.0</text>
        <text x={LW + N*CW/2}  y={TH + N*CH + 22} textAnchor="middle" fontSize={7.5} fill="#94A3B8">0</text>
        <text x={LW + N*CW}    y={TH + N*CH + 22} textAnchor="end"    fontSize={7.5} fill="#94A3B8">1.0</text>
      </svg>
      <p style={{ fontSize:9.5, color:'var(--text-muted)', margin:'6px 0 0' }}>
        Darker color indicates stronger correlation
      </p>
    </div>
  );
}

/* ── Network Graph ── radial layout from API nodes+edges */
function computePositions(nodes, edges) {
  const cx = 300, cy = 215;
  const center = nodes.find(n => n.is_center);
  const others = nodes.filter(n => !n.is_center);

  const edgeRMap = {};
  edges.forEach(e => { edgeRMap[e.target] = Math.abs(e.r); });
  const sorted = [...others].sort((a, b) => (edgeRMap[b.id] || 0) - (edgeRMap[a.id] || 0));

  const positions = {};
  if (center) positions[center.id] = { x: cx, y: cy };
  sorted.forEach((n, i) => {
    const angle  = (2 * Math.PI * i / sorted.length) - Math.PI / 2;
    const radius = 165;
    positions[n.id] = {
      x: Math.round(cx + radius * Math.cos(angle)),
      y: Math.round(cy + radius * Math.sin(angle)),
    };
  });
  return positions;
}

function NetworkGraph({ nodes = [], edges = [], maxR = 1 }) {
  if (!nodes.length) return <div style={{ color:'var(--text-muted)', fontSize:11, padding:12 }}>Loading network…</div>;

  const positions = computePositions(nodes, edges);
  const center    = nodes.find(n => n.is_center);

  return (
    <div style={{ background:'var(--bg-page)', borderRadius:8, overflow:'hidden' }}>
      <svg viewBox="0 0 600 475" style={{ width:'100%', height:'auto', display:'block' }}>
        {/* edges */}
        {edges.map((e, idx) => {
          const sp = positions[e.source];
          const tp = positions[e.target];
          if (!sp || !tp) return null;
          return (
            <line key={idx}
              x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y}
              stroke={edgeColor(e.r)}
              strokeWidth={edgeStroke(e.r)}
              strokeOpacity={Math.abs(e.r) < 0.20 ? 0.35 : 0.70}
            />
          );
        })}

        {/* peripheral nodes */}
        {nodes.filter(n => !n.is_center).map(n => {
          const pos = positions[n.id];
          if (!pos) return null;
          const edgeR = edges.find(e => e.target === n.id)?.r ?? 0;
          const a   = Math.abs(edgeR);
          const nr  = a >= 0.45 ? 14 : a >= 0.25 ? 12 : 10;
          const fill   = edgeR >= 0.20 ? '#DCFCE7' : edgeR <= -0.20 ? '#FEE2E2' : '#F1F5F9';
          const stroke = edgeR >= 0.20 ? '#22C55E' : edgeR <= -0.20 ? '#EF4444' : '#CBD5E1';
          return (
            <g key={n.id}>
              <title>{n.label || n.id}</title>
              <circle cx={pos.x} cy={pos.y} r={nr} fill={fill} stroke={stroke} strokeWidth={1.5}/>
              <text x={pos.x} y={pos.y+3.5} textAnchor="middle"
                fontSize={8} fontWeight={700} fill="#475569">{n.id}</text>
            </g>
          );
        })}

        {/* centre node */}
        {center && positions[center.id] && (
          <>
            <circle cx={positions[center.id].x} cy={positions[center.id].y} r={24} fill="#3B82F6" stroke="#2563EB" strokeWidth={2}/>
            <text x={positions[center.id].x} y={positions[center.id].y+3.5} textAnchor="middle"
              fontSize={9.5} fontWeight={800} fill="white">{center.id}</text>
            <rect x={positions[center.id].x-72} y={positions[center.id].y+30} width={144} height={22} rx={4}
              fill="white" stroke="#E2E8F0" strokeWidth={1}/>
            <text x={positions[center.id].x} y={positions[center.id].y+45} textAnchor="middle" fontSize={7.5} fill="#1E293B" fontWeight={600}>
              <title>{center.label || center.id}</title>
              {trunc(center.label || center.id, 30)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

const TILE_CONFIG = [
  { key:'strong_positive',   label:'Strong Positive',       r:'r ≥ 0.50',         bg:'#DCFCE7', border:'#86EFAC', tc:'#15803D', nc:'#15803D' },
  { key:'moderate_positive', label:'Moderate Positive',     r:'0.20 ≤ r < 0.50',  bg:'#F0FDF4', border:'#BBF7D0', tc:'#166534', nc:'#16A34A' },
  { key:'weak_none',         label:'Weak / No Correlation', r:'-0.20 < r < 0.20', bg:'#F8FAFC', border:'#E2E8F0', tc:'#64748B', nc:'#94A3B8' },
  { key:'negative',          label:'Negative Correlation',  r:'r ≤ −0.20',        bg:'#FEF2F2', border:'#FECACA', tc:'#B91C1C', nc:'#DC2626' },
];

/* ── page ─────────────────────────────────────────────────────── */
export default function StatisticalAnalysisPage() {
  const { setBreadcrumb, saFilters, saCache, setSaCache, meta, user, setActiveScreenContext } = useContext(AppContext);

  // Ref keeps the cache readable inside fetchQuestionData without adding it to deps
  const saCacheRef = useRef(saCache);
  saCacheRef.current = saCache;

  useEffect(() => {
    setBreadcrumb([{ label: 'Explore' }, { label: 'Statistical Analysis' }]);
  }, []);

  // Initialise from cache so data is visible immediately when navigating back
  const [questions,       setQuestions]       = useState([]);
  const [selectedQId,     setSelectedQId]     = useState(() => saCache?.selectedQId ?? null);
  const [correlations,    setCorrelations]    = useState(() => saCache?.correlations ?? []);
  const [tabCounts,       setTabCounts]       = useState(() => saCache?.tabCounts ?? {});
  const [baseN,           setBaseN]           = useState(() => saCache?.baseN ?? 0);
  const [dataBasis,       setDataBasis]       = useState(() => saCache?.dataBasis ?? '');
  const [correlogramData, setCorrelogramData] = useState(() => saCache?.correlogramData ?? null);
  const [networkData,     setNetworkData]     = useState(() => saCache?.networkData ?? null);
  const [insight,         setInsight]         = useState(() => saCache?.insight ?? '');
  const [activeTab,       setActiveTab]       = useState('all');
  const [expanded,        setExpanded]        = useState(false);
  const [topCorr,         setTopCorr]         = useState('Top 10');
  const [topNet,          setTopNet]          = useState('Top 15');
  const [loading,         setLoading]         = useState(false);

  // Broadcast screen context to chatbot
  useEffect(() => {
    const selQ = questions.find(q => q.id === selectedQId);
    setActiveScreenContext({
      tab: 'statistical_analysis',
      selected_question: selQ ? { id: selQ.id, text: selQ.text, category: selQ.category } : null,
      top_correlations: correlations.slice(0, 5).map(c => ({ id: c.question_id, text: c.question_text, r: c.pearson_r, strength: c.strength, p: c.p_value })),
      data_basis: dataBasis,
      filters: saFilters,
    });
  }, [selectedQId, correlations, saFilters, dataBasis, questions]);

  // Fetch questions on mount; don't override selectedQId if already set from cache
  useEffect(() => {
    apiFetch('/api/statistical/questions')
      .then(r => r.json())
      .then(d => {
        const qs = d.questions || [];
        setQuestions(qs);
        setSelectedQId(prev => prev || (qs.length ? qs[0].id : null));
      })
      .catch(() => {});
  }, []);

  // Fetch all data when selected question / filters change
  const topCorrN = parseInt(topCorr.replace('Top ', ''), 10) || 20;
  const topNetN  = parseInt(topNet.replace('Top ', ''), 10) || 25;

  const fetchQuestionData = useCallback(async (qId, corrN, netN, filters) => {
    if (!qId) return;
    const cacheKey = `${qId}|${corrN}|${netN}|${JSON.stringify(filters)}`;
    // Cache hit — data already in state from useState initialisers; skip all API calls
    if (saCacheRef.current?.key === cacheKey) return;

    setLoading(true);
    try {
      // Build query string from active filters
      const qs = new URLSearchParams();
      if (filters?.business && filters.business !== 'All') qs.set('business', filters.business);
      if (filters?.inactive === 'Yes') qs.set('include_inactive', 'Yes');
      const qStr = qs.toString() ? `&${qs}` : '';

      const [corrRes, cgramRes, netRes, insightRes] = await Promise.all([
        apiFetch(`/api/statistical/correlations/${qId}?${qStr.slice(1)}`),
        apiFetch(`/api/statistical/correlogram/${qId}?top=${corrN}${qStr}`),
        apiFetch(`/api/statistical/network/${qId}?top=${netN}${qStr}`),
        apiFetch(`/api/statistical/insights/${qId}?${qStr.slice(1)}`),
      ]);
      const [corrData, cgramData, netData, insData] = await Promise.all([
        corrRes.json(), cgramRes.json(), netRes.json(), insightRes.json(),
      ]);

      const tabCts = corrData.tab_counts || {};
      const bn     = corrData.n || 0;
      const corrs  = corrData.correlations || [];
      const basis  = corrData.data_basis || '';
      const ins    = insData.insight || '';

      setTabCounts(tabCts);
      setBaseN(bn);
      setDataBasis(basis);
      setCorrelations(corrs);
      setCorrelogramData(cgramData);
      setNetworkData(netData);
      setInsight(ins);

      // Persist to context so navigating back restores data without re-fetching
      setSaCache({
        key:             cacheKey,
        selectedQId:     qId,
        tabCounts:       tabCts,
        baseN:           bn,
        dataBasis:       basis,
        correlations:    corrs,
        correlogramData: cgramData,
        networkData:     netData,
        insight:         ins,
      });
    } catch {}
    setLoading(false);
  }, [setSaCache]);

  useEffect(() => {
    fetchQuestionData(selectedQId, topCorrN, topNetN, saFilters);
  }, [selectedQId, fetchQuestionData, topCorrN, topNetN, saFilters]);

  // Client-side tab filter on already-fetched correlations
  const tabRows = useMemo(() => {
    switch (activeTab) {
      case 'pos':  return correlations.filter(c => c.category_bucket === 'strong_positive' || c.category_bucket === 'moderate_positive');
      case 'neg':  return correlations.filter(c => c.category_bucket === 'negative' || c.category_bucket === 'moderate_negative' || c.category_bucket === 'strong_negative');
      case 'none': return correlations.filter(c => c.category_bucket === 'weak_none');
      default:     return correlations;
    }
  }, [activeTab, correlations]);

  const selectedQ  = questions.find(q => q.id === selectedQId);
  const posCount   = (tabCounts.strong_positive || 0) + (tabCounts.moderate_positive || 0);
  const negCount   = (tabCounts.negative || 0) + (tabCounts.moderate_negative || 0) + (tabCounts.strong_negative || 0);
  const noneCount  = tabCounts.weak_none || 0;
  const totalCount = tabCounts.all || correlations.length;

  const TABS = [
    { key:'all',  label:`All (${totalCount})`              },
    { key:'pos',  label:`Positive (${posCount})`           },
    { key:'neg',  label:`Negative (${negCount})`           },
    { key:'none', label:`No Correlation (${noneCount})`    },
  ];

  const corrLabels     = correlogramData?.question_ids    || correlogramData?.question_labels || [];
  const corrFullLabels = corrLabels.map(id => { const q = questions.find(q => q.id === id); return q?.text || q?.short_label || id; });
  const corrMatrix     = correlogramData?.matrix          || [];
  const netNodes   = networkData?.nodes || [];
  const netEdges   = networkData?.edges || [];
  const netMaxR    = networkData?.max_r || 1;

  const filteredNetEdges = useMemo(() => {
    switch (activeTab) {
      case 'pos':  return netEdges.filter(e => e.r >  0.15);
      case 'neg':  return netEdges.filter(e => e.r < -0.15);
      case 'none': return netEdges.filter(e => Math.abs(e.r) <= 0.15);
      default:     return netEdges;
    }
  }, [activeTab, netEdges]);

  const filteredNetNodes = useMemo(() => {
    if (activeTab === 'all') return netNodes;
    const visibleIds = new Set(filteredNetEdges.flatMap(e => [e.source, e.target]));
    return netNodes.filter(n => n.is_center || visibleIds.has(n.id));
  }, [activeTab, filteredNetEdges, netNodes]);

  return (
    <div className="page-container" style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* top grid */}
      <div className="sta-top-grid">

        {/* 1. Select a Question */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="sa-card-title">1. Select a Question <InfoIcon /></div>
          <div style={{ marginBottom:12 }}>
            <Dropdown
              variant="filter"
              className="fdd-full"
              value={selectedQId || ''}
              options={questions.map(q => ({ value: q.id, label: `${q.id}. ${q.text || q.short_label || q.id}` }))}
              onChange={v => setSelectedQId(v)}
            />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { label:'Question Type', sk:false,   value:'Likert Scale (1–5)' },
              { label:'Responses',     sk:loading, value:(() => { const n = user?.role === 'company' ? baseN : (meta?.total_respondents ?? baseN); return n > 0 ? n.toLocaleString() : '—'; })() },
            ].map(({ label, sk, value }) => (
              <div key={label} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'6px 10px', borderRadius:7,
                background:'var(--bg-page)', border:'1px solid var(--border)',
              }}>
                <span style={{ fontSize:10.5, fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
                {sk ? <Sk w={52} h={12}/> : <span style={{ fontSize:10.5, color:'var(--text-primary)', fontWeight:700 }}>{value}</span>}
              </div>
            ))}
          </div>

          <div style={{ flex:1 }} />

          {/* Analysis scope indicator */}
          {user?.role === 'company' ? (
            <div style={{
              marginTop:12, padding:'7px 10px', borderRadius:7,
              background:'#FFF7ED', border:'1px solid #FED7AA',
              fontSize:10, color:'#C2410C', lineHeight:1.5,
              display:'flex', alignItems:'flex-start', gap:6,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                <circle cx="6" cy="6" r="5.5" stroke="#C2410C" strokeWidth="1.2"/>
                <path d="M6 3.5v3M6 8v.5" stroke="#C2410C" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>
                {dataBasis || `Computed across generation × job-level cohorts within ${user?.company || 'your company'}`}
              </span>
            </div>
          ) : (
            <div style={{
              marginTop:12, padding:'7px 10px', borderRadius:7,
              background:'#EFF6FF', border:'1px solid #BFDBFE',
              fontSize:10, color:'#1D4ED8', lineHeight:1.5,
              display:'flex', alignItems:'flex-start', gap:6,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink:0, marginTop:1 }}>
                <circle cx="6" cy="6" r="5.5" stroke="#1D4ED8" strokeWidth="1.2"/>
                <path d="M6 3.5v3M6 8v.5" stroke="#1D4ED8" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>
                {dataBasis || 'Computed across all business unit averages'}
              </span>
            </div>
          )}
        </div>

        {/* Correlation Summary + Overall Insights */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>

          <div className="sa-card-title" style={{ marginBottom:8 }}>
            Correlation Summary with Other Questions <InfoIcon />
          </div>

          {/* 4 summary tiles */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:8, alignItems:'stretch', marginBottom:8 }}>
            {TILE_CONFIG.map(t => (
              <div key={t.key} style={{
                background:t.bg, border:`1px solid ${t.border}`,
                borderRadius:8, padding:'7px 9px',
                display:'flex', flexDirection:'column', gap:2,
              }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:t.tc, lineHeight:1.25 }}>
                  {t.label}
                </div>
                {loading
                  ? <Sk w={36} h={22} r={4} sx={{ margin:'2px 0' }}/>
                  : <div style={{ fontSize:20, fontWeight:800, color:t.nc, lineHeight:1 }}>{tabCounts[t.key] ?? 0}</div>
                }
                <div style={{ fontSize:9, color:t.tc, opacity:0.85 }}>Questions</div>
                <div style={{
                  marginTop:4, paddingTop:4, borderTop:`1px solid ${t.border}`,
                  fontSize:8.5, color:t.tc, fontStyle:'italic', opacity:0.8,
                }}>{t.r}</div>
              </div>
            ))}
          </div>

          {/* Overall Insights */}
          <div style={{
            background:'#FFFBEB', border:'1px solid #FDE68A',
            borderRadius:8, padding:'8px 12px',
            display:'flex', alignItems:'flex-start', gap:8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26A6.99 6.99 0 0019 9c0-3.87-3.13-7-7-7z"
                fill="#F59E0B"/>
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" fill="#F59E0B"/>
            </svg>
            <div>
              <span style={{ fontSize:10.5, fontWeight:700, color:'#92400E' }}>Overall Insights&nbsp;—&nbsp;</span>
              {loading
                ? <div style={{ flex:1 }}>
                    <Sk w="85%" h={9} sx={{ marginBottom:5 }}/>
                    <Sk w="65%" h={9}/>
                  </div>
                : <span style={{ fontSize:10, color:'#78350F', lineHeight:1.55 }}>
                    {insight || 'Select a question to view correlation insights.'}
                  </span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* bottom grid */}
      <div className="sta-bot-grid">

        {/* 2. Correlations table */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:8 }}>
            <div className="sa-card-title" style={{ marginBottom:0, minWidth:0, overflow:'hidden' }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>2. Correlations with All Questions</span>
              <InfoIcon />
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

          {/* tabs */}
          <div className="sta-tabs">
            {TABS.map(t => (
              <button key={t.key}
                className={`sta-tab${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* table */}
          <table className="sta-corr-tbl">
            <colgroup>
              <col style={{ width:'42%' }}/>
              <col style={{ width:'13%' }}/>
              <col style={{ width:'24%' }}/>
              <col style={{ width:'21%' }}/>
            </colgroup>
            <thead>
              <tr>
                <th>Question</th>
                <th style={{ textAlign:'right', whiteSpace:'nowrap' }}>Pearson r</th>
                <th style={{ whiteSpace:'nowrap' }}>Strength</th>
                <th style={{ textAlign:'right', whiteSpace:'nowrap' }}>p-value</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td><Sk h={10}/></td>
                      <td><Sk w={34} h={10}/></td>
                      <td><Sk w={68} h={10}/></td>
                      <td><Sk w={40} h={10}/></td>
                    </tr>
                  ))
                : (expanded ? tabRows : tabRows.slice(0, 10)).map(c => (
                    <tr key={c.question_id}>
                      <td style={{ fontSize:10.5, color:'var(--text-primary)' }}>
                        <span style={{ fontWeight:600, color:'var(--blue-primary)', marginRight:3 }}>{c.question_id}.</span>
                        <span style={{ wordBreak:'break-word' }}>{c.question_text}</span>
                      </td>
                      <td style={{
                        fontSize:11, fontWeight:700, textAlign:'right',
                        color: c.pearson_r > 0 ? '#16A34A' : c.pearson_r < 0 ? '#DC2626' : '#94A3B8',
                      }}>
                        {c.pearson_r > 0 ? '+' : ''}{c.pearson_r.toFixed(2)}
                      </td>
                      <td><StrengthBadge r={c.pearson_r}/></td>
                      <td style={{ fontSize:10.5, color:'var(--text-muted)', textAlign:'right' }}>{fmtP(c.p_value)}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>

          {/* empty state — outside table so it centres cleanly */}
          {!loading && tabRows.length === 0 && (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', padding:'36px 16px', gap:8,
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="17" stroke="#E2E8F0" strokeWidth="1.5"/>
                <path d="M11 18h14M18 11v14" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-secondary)' }}>
                {activeTab === 'pos'  && 'No positive correlations found'}
                {activeTab === 'neg'  && 'No negative correlations found'}
                {activeTab === 'none' && 'No weak / no-correlation questions'}
                {activeTab === 'all'  && 'No correlation data available'}
              </span>
              <span style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', maxWidth:260, lineHeight:1.6 }}>
                {activeTab === 'pos'  && 'No questions show a positive relationship with the selected question.'}
                {activeTab === 'neg'  && 'No questions show a negative relationship with the selected question.'}
                {activeTab === 'none' && 'All questions have some degree of correlation with the selected question.'}
                {activeTab === 'all'  && 'Select a question above to view its correlation profile.'}
              </span>
            </div>
          )}

          {/* footer */}
          {(loading || tabRows.length > 0) && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
              {loading
                ? <Sk w={160} h={9} sx={{ marginBottom:6 }}/>
                : <p style={{ fontSize:9.5, color:'var(--text-muted)', margin:0 }}>
                    Showing 1 to {Math.min(tabRows.length, expanded ? tabRows.length : 10)} of {tabRows.length} questions
                  </p>
              }
            </div>
          )}

          {/* legend — always at bottom */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:'auto', paddingTop:10 }}>
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

        {/* 4. Relationship Network */}
        <div className="sa-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              4. Relationship Network <InfoIcon />
            </div>
            <Dropdown variant="filter" value={topNet}
              options={['Top 15','Top 25','Top 50']} onChange={setTopNet} menuAlign="right"/>
          </div>
          {loading ? (
            <div style={{ background:'var(--bg-page)', borderRadius:8, overflow:'hidden' }}>
              <svg viewBox="0 0 600 475" style={{ width:'100%', height:'auto', display:'block' }}>
                <defs>
                  <style>{`@keyframes skpulse{0%,100%{opacity:1}50%{opacity:.4}}.skp{animation:skpulse 1.6s ease-in-out infinite}`}</style>
                </defs>
                <circle cx={300} cy={215} r={24} fill="#CBD5E1" className="skp"/>
                {Array.from({ length: 15 }).map((_, i) => {
                  const angle = (2 * Math.PI * i / 15) - Math.PI / 2;
                  const x = Math.round(300 + 165 * Math.cos(angle));
                  const y = Math.round(215 + 165 * Math.sin(angle));
                  return (
                    <g key={i} className="skp" style={{ animationDelay:`${(i * 0.08).toFixed(2)}s` }}>
                      <line x1={300} y1={215} x2={x} y2={y} stroke="#E2E8F0" strokeWidth={1}/>
                      <circle cx={x} cy={y} r={10} fill="#E2E8F0"/>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <NetworkGraph nodes={filteredNetNodes} edges={filteredNetEdges} maxR={netMaxR} />
          )}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:8 }}>
            {[
              { color:'#22C55E', label:'Positive Correlation'    },
              { color:'#EF4444', label:'Negative Correlation'    },
              { color:'#CBD5E1', label:'No / Weak Correlation'   },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:20, height:3, background:l.color, borderRadius:2 }}/>
                <span style={{ fontSize:9.5, color:'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize:9, color:'var(--text-muted)', margin:'4px 0 0' }}>
            Edge thickness represents strength of correlation (|r|)
          </p>
        </div>

        {/* 3. Correlogram — full width on second row */}
        <div className="sa-card" style={{ gridColumn:'1 / -1' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              3. Correlogram (Top {topCorrN} Related Questions) <InfoIcon />
            </div>
            <Dropdown variant="filter" value={topCorr}
              options={['Top 10','Top 20','Top 30']} onChange={setTopCorr} menuAlign="right"/>
          </div>
          {loading ? (() => {
            const cols = 10;
            const cells = [];
            cells.push(<div key="h0"/>);
            for (let j = 0; j < cols; j++) cells.push(<Sk key={`h${j}`} h={14} r={2}/>);
            for (let i = 0; i < cols; i++) {
              cells.push(<Sk key={`l${i}`} h={28} r={2}/>);
              for (let j = 0; j < cols; j++) cells.push(<Sk key={`c${i}-${j}`} h={28} r={2}/>);
            }
            return (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:`34px repeat(${cols}, 1fr)`, gap:2, marginBottom:8 }}>
                  {cells}
                </div>
                <Sk w={180} h={8} r={2}/>
              </div>
            );
          })() : (
            <Correlogram labels={corrLabels} fullLabels={corrFullLabels} matrix={corrMatrix} />
          )}
        </div>

      </div>

      {/* footnote */}
      <div style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'8px 12px',
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
