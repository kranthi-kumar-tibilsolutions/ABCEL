import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Dropdown   from '../components/shared/Dropdown';

/* ── Static data ──────────────────────────────────────────── */

const TOPIC_BREAKDOWN = [
  { topic: 'Workload',          pct: 18.6, score: -0.54, trend: 'down'    },
  { topic: 'Career Growth',     pct: 15.2, score: +0.36, trend: 'up'      },
  { topic: 'Work Life Balance', pct: 13.8, score: -0.31, trend: 'down'    },
  { topic: 'Leadership',        pct: 12.1, score: +0.22, trend: 'up'      },
  { topic: 'Recognition',       pct:  8.7, score: -0.08, trend: 'neutral' },
  { topic: 'Compensation',      pct:  7.4, score: -0.42, trend: 'down'    },
  { topic: 'Communication',     pct:  6.3, score: +0.15, trend: 'up'      },
  { topic: 'Resources',         pct:  4.9, score: -0.21, trend: 'down'    },
  { topic: 'Others',            pct: 13.0, score: +0.05, trend: 'up'      },
];

const VALIDATION = [
  { driver: 'Workload',      finding: 'Strong negative impact on Engagement (r = -0.62)', alignment: 'Consistent',          pct: 86 },
  { driver: 'Career Growth', finding: 'Strong negative impact on Engagement (r = 0.58)',  alignment: 'Consistent',          pct: 79 },
  { driver: 'Recognition',   finding: 'Moderate positive impact (r = 0.33)',              alignment: 'Partially Consistent', pct: 61 },
  { driver: 'Leadership',    finding: 'Strong positive impact (r = 0.70)',                alignment: 'Consistent',          pct: 91 },
  { driver: 'Compensation',  finding: 'Moderate impact (r = -0.25)',                      alignment: 'Consistent',          pct: 72 },
];

const SAMPLES = [
  {
    type: 'negative', label: 'Negative', color: '#DC2626', bg: '#FFF5F5', count: 1248,
    quotes: [
      'The workload has become unmanageable. We are constantly expected to do more with less time and fewer resources.',
      "I don't feel recognized for the work I do. It's frustrating when your efforts go unnoticed.",
      'Work life balance is almost impossible in my team.',
    ],
  },
  {
    type: 'neutral', label: 'Neutral', color: '#64748B', bg: '#F8FAFC', count: 1612,
    quotes: [
      "Overall things are okay. Some areas need improvement but it's not terrible.",
      'There is room for growth and better communication.',
      "I don't have strong feelings either way.",
    ],
  },
  {
    type: 'positive', label: 'Positive', color: '#16A34A', bg: '#F0FDF4', count: 2032,
    quotes: [
      'Great place to work! I love the people I work with and the culture here.',
      'I have plenty of opportunities to learn and grow in my career.',
      'Leadership is supportive and values our input.',
    ],
  },
];

/* Sentiment over time — 12 months */
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const POS_DATA = [0.35,0.38,0.40,0.36,0.33,0.38,0.40,0.42,0.38,0.36,0.39,0.38];
const NEU_DATA = [0.05,0.08,0.05,0.06,0.04,0.05,0.03,0.05,0.04,0.06,0.04,0.05];
const NEG_DATA = [-0.25,-0.28,-0.22,-0.26,-0.30,-0.24,-0.22,-0.18,-0.24,-0.26,-0.22,-0.20];

/* ── Sub-components ─────────────────────────────────────────── */

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6.5" cy="6.5" r="6" stroke="#94A3B8" strokeWidth="1.2"/>
      <circle cx="6.5" cy="4.2" r="0.65" fill="#94A3B8"/>
      <rect x="5.9" y="5.6" width="1.2" height="3.5" rx="0.6" fill="#94A3B8"/>
    </svg>
  );
}

function ScoreGauge({ score = 0.28 }) {
  const W = 280, H = 56;
  const bx = 8, bw = W - 16, by = 20, bh = 14;
  const pct = (score + 1) / 2;
  const px  = bx + pct * bw;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sa-grd" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#DC2626"/>
          <stop offset="50%"  stopColor="#FBBF24"/>
          <stop offset="100%" stopColor="#16A34A"/>
        </linearGradient>
      </defs>
      {/* Background track */}
      <rect x={bx} y={by} width={bw} height={bh} rx={bh/2} fill="url(#sa-grd)" opacity="0.18"/>
      {/* Filled portion */}
      <rect x={bx} y={by} width={pct * bw} height={bh} rx={bh/2} fill="url(#sa-grd)"/>
      {/* Label bubble */}
      <rect x={px - 16} y={0} width={32} height={15} rx={4} fill="#0F172A"/>
      <text x={px} y={10.5} textAnchor="middle" fontSize="9" fill="white" fontWeight="700" fontFamily="inherit">
        {score >= 0 ? '+' : ''}{score.toFixed(2)}
      </text>
      {/* Triangle pointer */}
      <polygon points={`${px},${by-1} ${px-4},${by-7} ${px+4},${by-7}`} fill="#0F172A"/>
      {/* Axis ticks */}
      <text x={bx}      y={by+bh+12} textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="inherit">-1</text>
      <text x={bx+bw/2} y={by+bh+12} textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="inherit">0</text>
      <text x={bx+bw}   y={by+bh+12} textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="inherit">+1</text>
    </svg>
  );
}

function TimeChart() {
  const W = 280, H = 108;
  const pL = 20, pR = 34, pT = 10, pB = 22;
  const cW = W - pL - pR, cH = H - pT - pB;
  const N  = MONTHS.length;
  const toX = i => pL + (i / (N - 1)) * cW;
  const toY = v => pT + (1 - (v + 1) / 2) * cH;
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Y labels */}
      {[[1,'+1'],[0,'0'],[-1,'-1']].map(([v, l]) => (
        <text key={l} x={pL-3} y={toY(v)+3} textAnchor="end" fontSize="7.5" fill="#CBD5E1" fontFamily="inherit">{l}</text>
      ))}
      {/* Zero line */}
      <line x1={pL} y1={toY(0)} x2={W-pR} y2={toY(0)} stroke="#E2E8F0" strokeWidth="0.8"/>
      {/* Series */}
      <path d={path(POS_DATA)} fill="none" stroke="#16A34A" strokeWidth="1.6"/>
      <path d={path(NEU_DATA)} fill="none" stroke="#94A3B8"  strokeWidth="1.2" strokeDasharray="3,2"/>
      <path d={path(NEG_DATA)} fill="none" stroke="#DC2626"  strokeWidth="1.6"/>
      {/* Month labels (every 3rd) */}
      {MONTHS.map((m, i) => i % 3 === 0 && (
        <text key={m} x={toX(i)} y={H-4} textAnchor="middle" fontSize="7" fill="#CBD5E1" fontFamily="inherit">{m}</text>
      ))}
      {/* End badge */}
      <rect x={W-pR+3} y={toY(POS_DATA[N-1])-7} width={28} height={13} rx={3} fill="#16A34A"/>
      <text x={W-pR+17} y={toY(POS_DATA[N-1])+2.5} textAnchor="middle" fontSize="8" fill="white" fontWeight="700" fontFamily="inherit">+0.38</text>
    </svg>
  );
}

function WordCloud() {
  const words = [
    { t: 'Workload',          x: 8,   y: 70,  fs: 26, c: '#DC2626', w: 800 },
    { t: 'Management',        x: 152, y: 22,  fs: 19, c: '#0D9488', w: 700 },
    { t: 'Career Growth',     x: 45,  y: 118, fs: 21, c: '#16A34A', w: 800 },
    { t: 'Work Life Balance', x: 5,   y: 152, fs: 16, c: '#16A34A', w: 700 },
    { t: 'Leadership',        x: 168, y: 108, fs: 15, c: '#16A34A', w: 700 },
    { t: 'Communication',     x: 5,   y: 36,  fs: 11, c: '#DC2626', w: 500 },
    { t: 'Culture',           x: 5,   y: 96,  fs: 10, c: '#94A3B8', w: 500 },
    { t: 'Recognition',       x: 192, y: 62,  fs: 12, c: '#16A34A', w: 600 },
    { t: 'Teamwork',          x: 140, y: 44,  fs: 10, c: '#94A3B8', w: 500 },
    { t: 'Opportunities',     x: 188, y: 35,  fs: 13, c: '#16A34A', w: 600 },
    { t: 'Flexibility',       x: 5,   y: 175, fs: 9,  c: '#94A3B8', w: 500 },
    { t: 'Benefits',          x: 210, y: 145, fs: 9,  c: '#94A3B8', w: 500 },
    { t: 'Company Values',    x: 98,  y: 185, fs: 8,  c: '#94A3B8', w: 500 },
    { t: 'Future',            x: 170, y: 168, fs: 9,  c: '#94A3B8', w: 500 },
    { t: 'Teamworking',       x: 115, y: 158, fs: 11, c: '#16A34A', w: 600 },
  ];
  return (
    <svg width="100%" viewBox="0 0 285 195" style={{ display: 'block', overflow: 'hidden' }}>
      {words.map(({ t, x, y, fs, c, w }) => (
        <text key={t} x={x} y={y} fontSize={fs} fill={c} fontWeight={w}
          fontFamily="Inter, system-ui, sans-serif">
          {t}
        </text>
      ))}
    </svg>
  );
}

function CircleScore({ pct }) {
  const r = 10, cx = 12, cy = 12;
  const circ = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 70 ? '#16A34A' : pct >= 40 ? '#F97316' : '#DC2626';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth="2.5"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}/>
    </svg>
  );
}

function AlignBadge({ v }) {
  const map = {
    'Consistent':           { bg: '#DCFCE7', c: '#15803D' },
    'Partially Consistent': { bg: '#FFEDD5', c: '#C2410C' },
    'Not Consistent':       { bg: '#FEE2E2', c: '#DC2626' },
  };
  const s = map[v] || map['Consistent'];
  return (
    <span style={{ background: s.bg, color: s.c, fontSize: 9, fontWeight: 700,
      padding: '2px 5px', borderRadius: 8, display: 'inline-block', lineHeight: 1.4, wordBreak: 'break-word' }}>
      {v}
    </span>
  );
}

function TrendIcon({ t }) {
  if (t === 'up')   return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2l4 8H2z" fill="#16A34A"/></svg>;
  if (t === 'down') return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 10L2 2h8z" fill="#DC2626"/></svg>;
  return <span style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1 }}>—</span>;
}

/* ── Page ────────────────────────────────────────────────────── */
export default function SentimentAnalysisPage() {
  const { setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([{ label: 'Explore' }, { label: 'Sentiment Analysis' }]);
  }, []);

  const [period,  setPeriod]  = useState('Monthly');

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          <button className="topbar-btn" style={{ fontSize: 11 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Save View
          </button>
          <button className="topbar-btn" style={{ fontSize: 11 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v8M3.5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Share
          </button>
        </div>
      </div>

      {/* Row 1 — Score · Distribution · Over Time */}
      <div className="sa-grid-3">

        {/* Overall Sentiment Score */}
        <div className="sa-card">
          <div className="sa-card-title">Overall Sentiment Score <InfoIcon /></div>
          <ScoreGauge score={0.28} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>Very Negative</span>
            <span>Neutral</span>
            <span>Very Positive</span>
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 10 }}>Based on 4,892 responses</p>
        </div>

        {/* Sentiment Distribution */}
        <div className="sa-card">
          <div className="sa-card-title">Sentiment Distribution <InfoIcon /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Negative', n: 1248, pct: '25.5%', bg: '#FEE2E2', c: '#DC2626' },
              { label: 'Neutral',  n: 1612, pct: '33.0%', bg: '#F1F5F9', c: '#64748B' },
              { label: 'Positive', n: 2032, pct: '41.5%', bg: '#DCFCE7', c: '#16A34A' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 8, padding: '10px 8px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: s.c, marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{s.n.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.pct}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 10 }}>Total Responses: 4,892</p>
        </div>

        {/* Sentiment Over Time */}
        <div className="sa-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="sa-card-title" style={{ marginBottom: 0 }}>Sentiment Over Time <InfoIcon /></div>
            <Dropdown
              variant="filter"
              value={period}
              options={['Monthly', 'Weekly', 'Quarterly']}
              onChange={setPeriod}
            />
          </div>
          <TimeChart />
        </div>

      </div>

      {/* Row 2 — Word Cloud · Topic Breakdown · Statistical Validation */}
      <div className="sa-grid-3">

        {/* Top Topics word cloud */}
        <div className="sa-card">
          <div className="sa-card-title">
            Top Topics
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 400 }}>(by volume)</span>
            <InfoIcon />
          </div>
          <WordCloud />
          <div style={{ display: 'flex', gap: 14, marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {[['#DC2626','Negative'],['#94A3B8','Neutral'],['#16A34A','Positive']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Topic Sentiment Breakdown */}
        <div className="sa-card" style={{ padding: '14px 12px' }}>
          <div className="sa-card-title">Topic Sentiment Breakdown <InfoIcon /></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                {[
                  { l: 'Topic',    a: 'left'   },
                  { l: '% Resp.',  a: 'right'  },
                  { l: 'Score',    a: 'right'  },
                  { l: 'Trend',    a: 'center' },
                ].map(({ l, a }) => (
                  <th key={l} style={{ textAlign: a, padding: '4px 4px 7px', fontSize: 9, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden' }}>
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOPIC_BREAKDOWN.map(row => {
                const c = row.score > 0.1 ? '#16A34A' : row.score < -0.1 ? '#DC2626' : '#94A3B8';
                return (
                  <tr key={row.topic} style={{ borderBottom: '1px solid var(--bg-page)' }}>
                    <td style={{ padding: '6px 4px 6px 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.topic}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 10.5 }}>{row.pct}%</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: c, fontSize: 11 }}>
                      {row.score > 0 ? '+' : ''}{row.score.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <TrendIcon t={row.trend} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sentiments Validate Statistical Findings */}
        <div className="sa-card" style={{ padding: '14px 12px' }}>
          <div className="sa-card-title" style={{ marginBottom: 3, fontSize: 11 }}>
            Sentiments Validate Statistical Findings <InfoIcon />
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>
            Do open-text sentiments support key statistical drivers?
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '48%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                {['Driver & Finding', 'Alignment', 'Score'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '3px 4px 6px', fontSize: 9, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VALIDATION.map(row => (
                <tr key={row.driver} style={{ borderBottom: '1px solid var(--bg-page)', verticalAlign: 'top' }}>
                  <td style={{ padding: '6px 4px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 10.5, marginBottom: 2 }}>
                      {row.driver}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 9, lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {row.finding}
                    </div>
                  </td>
                  <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>
                    <AlignBadge v={row.alignment} />
                  </td>
                  <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CircleScore pct={row.pct} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{row.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              ['#16A34A', 'Consistent (≥70%)'],
              ['#F97316', 'Partially (40–69%)'],
              ['#DC2626', 'Not Consistent (<40%)'],
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }}/>
                {l}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 3 — Sample Responses */}
      <div className="sa-card">
        <div className="sa-card-title" style={{ marginBottom: 14 }}>
          Sample Responses by Sentiment <InfoIcon />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20 }}>
          {SAMPLES.map(s => (
            <div key={s.type}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{s.count.toLocaleString()} responses</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {s.quotes.map((q, i) => (
                  <div key={i} style={{
                    background: s.bg,
                    borderLeft: `3px solid ${s.color}`,
                    borderRadius: '0 6px 6px 0',
                    padding: '8px 10px',
                    fontSize: 11.5, color: 'var(--text-primary)', lineHeight: 1.55,
                  }}>
                    "{q}"
                  </div>
                ))}
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10,
                background: 'none', border: 'none', color: s.color, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                View all {s.label.toLowerCase()} responses →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer disclaimer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--text-muted)', paddingBottom: 4 }}>
        <InfoIcon />
        Sentiment scores are generated using NLP and may not capture sarcasm or context in all responses.
      </div>

    </div>
  );
}
