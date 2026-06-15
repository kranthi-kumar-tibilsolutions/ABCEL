import { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { RotateCcw } from 'lucide-react';
import Dropdown from '../components/shared/Dropdown';

/* ── static data ──────────────────────────────────────────────── */
const CORR_QS = ['Q12','Q24','Q18','Q16','Q34','Q45','Q57','Q61','Q66','Q22'];

const CORR_MATRIX = [
  [ 1.00, 0.71, 0.63, 0.58, 0.52, 0.47,-0.46,-0.38,-0.31, 0.22],
  [ 0.71, 1.00, 0.66, 0.60, 0.55, 0.44,-0.41,-0.35,-0.28, 0.25],
  [ 0.63, 0.66, 1.00, 0.56, 0.56, 0.42,-0.38,-0.30,-0.25, 0.18],
  [ 0.58, 0.60, 0.56, 1.00, 0.56, 0.49,-0.30,-0.27,-0.20, 0.21],
  [ 0.52, 0.55, 0.56, 0.56, 1.00, 0.48,-0.27,-0.20,-0.18, 0.20],
  [ 0.47, 0.44, 0.42, 0.49, 0.48, 1.00,-0.23,-0.19,-0.12, 0.16],
  [-0.46,-0.41,-0.38,-0.30,-0.27,-0.23, 1.00, 0.62, 0.55,-0.21],
  [-0.38,-0.35,-0.30,-0.27,-0.20,-0.19, 0.62, 1.00, 0.58,-0.18],
  [-0.31,-0.28,-0.25,-0.20,-0.18,-0.12, 0.55, 0.58, 1.00,-0.15],
  [ 0.22, 0.25, 0.18, 0.21, 0.20, 0.16,-0.21,-0.18,-0.15, 1.00],
];

const ALL_CORR = [
  { id:'Q24', text:'I believe my manager supports me.',     r: 0.71, sig:'< 0.001' },
  { id:'Q18', text:'I feel valued at work.',                r: 0.63, sig:'< 0.001' },
  { id:'Q15', text:'I have opportunities to grow.',         r: 0.58, sig:'< 0.001' },
  { id:'Q34', text:'My achievements are celebrated.',       r: 0.52, sig:'< 0.001' },
  { id:'Q45', text:'I receive constructive feedback.',      r: 0.47, sig:'< 0.001' },
  { id:'Q57', text:'I feel overloaded with work.',          r:-0.48, sig:'< 0.001' },
  { id:'Q01', text:'I often feel stressed.',                r:-0.38, sig:'< 0.001' },
  { id:'Q66', text:'Work-life balance is poor.',            r:-0.31, sig:'< 0.001' },
  { id:'Q05', text:'I understand company policies.',        r: 0.03, sig:'0.245'   },
  { id:'Q09', text:'The office environment is good.',       r: 0.02, sig:'0.512'   },
];

const NET_NODES = [
  { id:'Q12', x:300, y:215, r: 1.0,  main:true  },
  { id:'Q24', x:183, y:108, r: 0.71 },
  { id:'Q18', x:418, y: 86, r: 0.63 },
  { id:'Q16', x:136, y:215, r: 0.58 },
  { id:'Q15', x:305, y: 78, r: 0.58 },
  { id:'Q34', x:448, y:296, r: 0.52 },
  { id:'Q45', x:470, y:170, r: 0.47 },
  { id:'Q22', x:442, y:382, r: 0.22 },
  { id:'Q57', x:150, y:335, r:-0.48 },
  { id:'Q01', x:288, y:396, r:-0.38 },
  { id:'Q66', x:422, y:418, r:-0.31 },
  { id:'Q61', x:173, y:392, r:-0.28 },
  { id:'Q23', x: 78, y: 86, r: 0.18 },
  { id:'Q05', x: 60, y:200, r: 0.03 },
  { id:'Q63', x: 76, y:340, r: 0.12 },
  { id:'Q68', x:128, y:438, r:-0.09 },
  { id:'Q84', x:230, y:456, r:-0.05 },
  { id:'Q27', x:530, y:116, r: 0.15 },
  { id:'Q37', x:556, y:225, r: 0.08 },
  { id:'Q31', x:530, y:330, r: 0.10 },
  { id:'Q42', x:490, y:432, r: 0.06 },
  { id:'Q33', x:350, y:452, r:-0.12 },
  { id:'Q14', x:500, y:402, r: 0.11 },
];

const QUESTIONS_LIST = [
  'Q12. I feel recognized for my contributions.',
  'Q24. I believe my manager supports me.',
  'Q18. I feel valued at work.',
  'Q15. I have opportunities to grow.',
  'Q34. My achievements are celebrated.',
  'Q45. I receive constructive feedback.',
  'Q01. I often feel stressed.',
  'Q57. I feel overloaded with work.',
  'Q66. Work-life balance is poor.',
];

const SUMMARY_TILES = [
  { label:'Strong Positive',       count:18, sub:'Questions', r:'r ≥ 0.50',         bg:'#DCFCE7', border:'#86EFAC', tc:'#15803D', nc:'#15803D' },
  { label:'Moderate Positive',     count:21, sub:'Questions', r:'0.20 ≤ r < 0.50',  bg:'#F0FDF4', border:'#BBF7D0', tc:'#166534', nc:'#16A34A' },
  { label:'Weak / No Correlation', count:23, sub:'Questions', r:'-0.20 < r < 0.20', bg:'#F8FAFC', border:'#E2E8F0', tc:'#64748B', nc:'#94A3B8' },
  { label:'Negative Correlation',  count:10, sub:'Questions', r:'r ≤ −0.20',        bg:'#FEF2F2', border:'#FECACA', tc:'#B91C1C', nc:'#DC2626' },
];

const TABS = [
  { key:'all',  label:'All (71)'            },
  { key:'pos',  label:'Positive (38)'       },
  { key:'neg',  label:'Negative (10)'       },
  { key:'none', label:'No Correlation (22)' },
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

function Correlogram() {
  const containerRef = useRef(null);
  const [cw, setCw] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const N   = CORR_QS.length;
  const LW  = 34;                                               // left label column width
  const TH  = 20;                                               // top label row height
  const CW  = cw > 0 ? Math.floor((cw - LW) / N) : 32;        // cell width — fills container
  const CH  = 30;                                               // fixed cell height — keeps grid compact
  const W   = LW + N * CW;
  const H   = TH + N * CH + 26;
  const vfs = Math.min(10, Math.max(7, CW * 0.15));            // value font scales with width
  const lfs = 8;                                                // fixed label font size

  return (
    <div ref={containerRef}>
      <svg width={W} height={H} style={{ display:'block' }}>
        <defs>
          <linearGradient id="cgGrad" x1="0" x2="1">
            <stop offset="0%"   stopColor="rgb(37,99,235)"/>
            <stop offset="50%"  stopColor="rgb(248,250,252)"/>
            <stop offset="100%" stopColor="rgb(220,38,38)"/>
          </linearGradient>
        </defs>

        {/* column labels */}
        {CORR_QS.map((q, j) => (
          <text key={q} x={LW + j*CW + CW/2} y={TH - 5}
            textAnchor="middle" fontSize={lfs} fontWeight={600} fill="#64748B">{q}</text>
        ))}

        {/* rows */}
        {CORR_QS.map((q, i) => (
          <g key={q}>
            <text x={LW - 4} y={TH + i*CH + CH/2 + lfs*0.38}
              textAnchor="end" fontSize={lfs} fontWeight={600} fill="#64748B">{q}</text>
            {CORR_QS.map((_, j) => {
              const v = CORR_MATRIX[i][j];
              return (
                <g key={j}>
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

        {/* colour scale bar */}
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

function NetworkGraph() {
  const CX = 300, CY = 215;
  return (
    <div style={{ background:'var(--bg-page)', borderRadius:8, overflow:'hidden' }}>
      <svg viewBox="0 0 600 475" style={{ width:'100%', height:'auto', display:'block' }}>
        {/* edges */}
        {NET_NODES.filter(n => !n.main).map(n => (
          <line key={n.id}
            x1={CX} y1={CY} x2={n.x} y2={n.y}
            stroke={edgeColor(n.r)}
            strokeWidth={edgeStroke(n.r)}
            strokeOpacity={Math.abs(n.r) < 0.15 ? 0.35 : 0.70}
          />
        ))}
        {/* peripheral nodes */}
        {NET_NODES.filter(n => !n.main).map(n => {
          const a   = Math.abs(n.r);
          const nr  = a >= 0.45 ? 14 : a >= 0.25 ? 12 : 10;
          const fill   = n.r > 0.15 ? '#DCFCE7' : n.r < -0.15 ? '#FEE2E2' : '#F1F5F9';
          const stroke = n.r > 0.15 ? '#22C55E' : n.r < -0.15 ? '#EF4444' : '#CBD5E1';
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={nr} fill={fill} stroke={stroke} strokeWidth={1.5}/>
              <text x={n.x} y={n.y+3.5} textAnchor="middle"
                fontSize={8} fontWeight={700} fill="#475569">{n.id}</text>
            </g>
          );
        })}
        {/* centre Q12 */}
        <circle cx={CX} cy={CY} r={24} fill="#3B82F6" stroke="#2563EB" strokeWidth={2}/>
        <text x={CX} y={CY+3.5} textAnchor="middle"
          fontSize={9.5} fontWeight={800} fill="white">Q12</text>
        {/* tooltip bubble */}
        <rect x={CX-82} y={CY+30} width={164} height={22} rx={4}
          fill="white" stroke="#E2E8F0" strokeWidth={1}/>
        <text x={CX} y={CY+45} textAnchor="middle" fontSize={7.5} fill="#64748B">
          Q12: I feel recognized for my contributions.
        </text>
      </svg>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────── */
export default function StatisticalAnalysisPage() {
  const { setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([{ label: 'Explore' }, { label: 'Statistical Analysis' }]);
  }, []);

  const [activeTab, setActiveTab] = useState('all');
  const [expanded,  setExpanded]  = useState(false);
  const [topCorr,   setTopCorr]   = useState('Top 20');
  const [topNet,    setTopNet]    = useState('Top 25');

  const tabRows = useMemo(() => {
    switch (activeTab) {
      case 'pos':  return ALL_CORR.filter(c => c.r >  0.20);
      case 'neg':  return ALL_CORR.filter(c => c.r < -0.20);
      case 'none': return ALL_CORR.filter(c => Math.abs(c.r) <= 0.20);
      default:     return ALL_CORR;
    }
  }, [activeTab]);

  return (
    <div className="page-container">

      {/* top grid */}
      <div className="sta-top-grid">

        {/* 1. Select a Question */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="sa-card-title">1. Select a Question <InfoIcon /></div>
          <select style={{
            width:'100%', padding:'7px 8px', border:'1px solid var(--border)',
            borderRadius:6, background:'var(--bg-card)', fontSize:11,
            color:'var(--text-primary)', fontFamily:'inherit',
            cursor:'pointer', outline:'none', marginBottom:12,
          }}>
            {QUESTIONS_LIST.map(q => <option key={q}>{q}</option>)}
          </select>

          {/* Metadata pills */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { label:'Question Type', value:'Likert Scale (1–5)' },
              { label:'Responses',     value:'4,892'              },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'6px 10px', borderRadius:7,
                background:'var(--bg-page)', border:'1px solid var(--border)',
              }}>
                <span style={{ fontSize:10.5, fontWeight:600, color:'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize:10.5, color:'var(--text-primary)', fontWeight:700 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ flex:1 }} />

          {/* Tip at bottom */}
          <div style={{
            marginTop:12, padding:'7px 10px', borderRadius:7,
            background:'#EFF6FF', border:'1px solid #BFDBFE',
            fontSize:10, color:'#3B82F6', lineHeight:1.5,
          }}>
            Select a different question above to explore its correlation profile.
          </div>
        </div>

        {/* Correlation Summary + Overall Insights */}
        <div className="sa-card" style={{ display:'flex', flexDirection:'column' }}>

          {/* title above the flex row so both tiles and Overall Insights start at the same Y */}
          <div className="sa-card-title" style={{ marginBottom:8 }}>
            Correlation Summary with Other Questions <InfoIcon />
          </div>

          {/* 4 summary tiles */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:8, alignItems:'stretch', marginBottom:8 }}>
            {SUMMARY_TILES.map(t => (
              <div key={t.label} style={{
                background:t.bg, border:`1px solid ${t.border}`,
                borderRadius:8, padding:'7px 9px',
                display:'flex', flexDirection:'column', gap:2,
              }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:t.tc, lineHeight:1.25 }}>
                  {t.label}
                </div>
                <div style={{ fontSize:20, fontWeight:800, color:t.nc, lineHeight:1 }}>
                  {t.count}
                </div>
                <div style={{ fontSize:9, color:t.tc, opacity:0.85 }}>{t.sub}</div>
                <div style={{
                  marginTop:4, paddingTop:4, borderTop:`1px solid ${t.border}`,
                  fontSize:8.5, color:t.tc, fontStyle:'italic', opacity:0.8,
                }}>{t.r}</div>
              </div>
            ))}
          </div>

          {/* Overall Insights — full width below tiles */}
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
              <span style={{ fontSize:10, color:'#78350F', lineHeight:1.55 }}>
                Q12 has the strongest positive correlation with Q24 (r&nbsp;=&nbsp;0.71) and
                strongest negative correlation with Q57 (r&nbsp;=&nbsp;−0.46).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* bottom grid */}
      <div className="sta-bot-grid">

        {/* 2. Correlations table */}
        <div className="sa-card">
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
              {(expanded ? tabRows : tabRows.slice(0,10)).map(c => (
                <tr key={c.id}>
                  <td style={{ fontSize:10.5, color:'var(--text-primary)' }}>
                    <span style={{ fontWeight:600, color:'var(--blue-primary)', marginRight:3 }}>{c.id}.</span>
                    <span style={{ wordBreak:'break-word' }}>{c.text}</span>
                  </td>
                  <td style={{
                    fontSize:11, fontWeight:700, textAlign:'right',
                    color: c.r > 0 ? '#16A34A' : c.r < 0 ? '#DC2626' : '#94A3B8',
                  }}>
                    {c.r > 0 ? '+' : ''}{c.r.toFixed(2)}
                  </td>
                  <td><StrengthBadge r={c.r}/></td>
                  <td style={{ fontSize:10.5, color:'var(--text-muted)', textAlign:'right' }}>{c.sig}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* footer */}
          <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
            <p style={{ fontSize:9.5, color:'var(--text-muted)', margin:'0 0 6px' }}>
              Showing 1 to {Math.min(tabRows.length, expanded ? tabRows.length : 10)} of 71 questions
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

        {/* 4. Relationship Network */}
        <div className="sa-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              4. Relationship Network <InfoIcon />
            </div>
            <Dropdown variant="filter" value={topNet}
              options={['Top 15','Top 25','Top 50']} onChange={setTopNet}/>
          </div>
          <NetworkGraph />
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
            <div className="sa-card-title" style={{ marginBottom:0 }}>
              3. Correlogram (Top 20 Related Questions) <InfoIcon />
            </div>
            <Dropdown variant="filter" value={topCorr}
              options={['Top 10','Top 20','Top 30']} onChange={setTopCorr}/>
          </div>
          <Correlogram />
        </div>

      </div>

      {/* footnote */}
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
