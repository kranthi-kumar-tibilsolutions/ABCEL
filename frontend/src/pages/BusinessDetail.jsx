import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import { Bar, Radar } from 'react-chartjs-2';
import Badge from '../components/shared/Badge';
import Skeleton from '../components/shared/Skeleton';
import PaginatedTable from '../components/shared/PaginatedTable';

const CATEGORY_COLORS = {
  'Engagement Index':        '#F97316',
  'Development & Career':    '#16A34A',
  'Leadership':              '#D97706',
  'Performance culture':     '#7C3AED',
  'Manager Effectiveness':   '#EA580C',
  'Uncategorized':           '#94A3B8',
};

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  if (s >= 2.5) return '#EA580C';
  return '#DC2626';
}

export default function BusinessDetail() {
  const { selectedBusiness, navigate, units, businesses, dimension, setBreadcrumb } = useContext(AppContext);
  const [insight,      setInsight]     = useState(null);
  const [loadInsight,  setLoadInsight] = useState(false);

  const biz = businesses?.find(b => b.name === selectedBusiness);
  const bizUnits = units?.filter(u => u.business === selectedBusiness) ?? [];

  useEffect(() => {
    if (!selectedBusiness) return;
    setBreadcrumb([
      { label: 'Business Overview', page: 'business-overview' },
      { label: selectedBusiness },
    ]);
  }, [selectedBusiness]);

  useEffect(() => {
    if (!selectedBusiness) return;
    setInsight(null);
    setLoadInsight(true);
    apiFetch('/api/business-insight', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ business: selectedBusiness, dimension }),
    })
      .then(r => r.json())
      .then(d => { setInsight(d.error ? null : d); setLoadInsight(false); })
      .catch(() => setLoadInsight(false));
  }, [selectedBusiness]);

  if (!biz) return (
    <div className="page-container">
      <p style={{ color: 'var(--text-muted)', padding: 24 }}>No business selected.</p>
    </div>
  );

  const cats      = biz.categories ? Object.entries(biz.categories) : [];
  const catLabels = cats.map(([k]) => k);
  const catScores = cats.map(([, v]) => +v.toFixed(2));

  const radarData = {
    labels:   catLabels,
    datasets: [{
      label:            biz.name,
      data:             catScores,
      backgroundColor:  'rgba(249,115,22,0.15)',
      borderColor:      '#F97316',
      pointBackgroundColor: '#F97316',
    }],
  };

  const barData = {
    labels:   bizUnits.map(u => u.name.length > 18 ? u.name.slice(0,16)+'…' : u.name),
    datasets: [{
      label:           'Score',
      data:            bizUnits.map(u => +(u.score ?? u.overall ?? 0).toFixed(2)),
      backgroundColor: bizUnits.map(u => scoreColor(+(u.score ?? u.overall ?? 0))),
      borderRadius:    4,
      barThickness:    18,
    }],
  };

  return (
    <div className="page-container">
      {/* Header + Category scores in one container */}
      {cats.length > 0 && (
        <div className="chart-card" style={{ padding: '18px 20px 20px', background: '#F1F5F9' }}>
          <div className="biz-detail-header" style={{ marginBottom: 16 }}>
            <h1 className="page-title">{biz.name}</h1>
            {(() => {
              const sc = biz.overall ?? biz.score ?? 0;
              const color = scoreColor(sc);
              const size = 88, stroke = 7, r = (size - stroke) / 2;
              const circ = 2 * Math.PI * r;
              const pct  = sc / 5;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ position: 'relative', width: size, height: size }}>
                    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={stroke} />
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{sc.toFixed(2)}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>/ 5.00</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall</span>
                </div>
              );
            })()}
          </div>
          <div className="cat-scores-grid">
            {cats.map(([cat, val], idx) => {
              const sorted = [...cats].sort((a, b) => +b[1] - +a[1]);
              const rank = sorted.findIndex(([k]) => k === cat) + 1;
              const total = cats.length;
              const pct = rank / total;
              const theme = pct <= 0.33
                ? { color: '#16A34A', border: '#4ADE80', bg: 'rgba(74,222,128,0.06)', shadow: 'rgba(74,222,128,0.18)' }
                : pct <= 0.66
                ? { color: '#B45309', border: '#FCD34D', bg: 'rgba(252,211,77,0.06)',  shadow: 'rgba(252,211,77,0.18)'  }
                : { color: '#DC2626', border: '#FCA5A5', bg: 'rgba(252,165,165,0.06)', shadow: 'rgba(252,165,165,0.18)' };
              const color = theme.border;
              const bg    = theme.bg;
              const shadow = theme.shadow;
              return (
                <div key={cat} style={{
                  background: `linear-gradient(135deg, ${bg} 0%, var(--bg-card) 60%)`,
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 8,
                  padding: '14px 14px 12px',
                  boxShadow: `0 4px 16px ${shadow}, 0 1px 4px rgba(0,0,0,0.05)`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {/* Index + circle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: theme.color }}>{idx + 1}</span>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: `2.5px solid ${theme.border}`,
                      background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: theme.color, lineHeight: 1 }}>{(+val).toFixed(2)}</span>
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>{cat}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="detail-grid">
        {/* Radar */}
        {catLabels.length > 2 && (
          <div className="chart-card">
            <div className="chart-title">Category Profile</div>
            <div className="chart-inner">
              <div style={{ height: 280 }}>
                <Radar data={radarData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items) => items[0]?.label ?? '',
                        label: (item)  => `Score: ${Number(item.raw).toFixed(2)} / 5`,
                      },
                    },
                  },
                  scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 10 } }, pointLabels: { font: { size: 10 } } } },
                }} />
              </div>
            </div>
          </div>
        )}

        {/* BU bar */}
        {bizUnits.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">Business Units</div>
            <div className="chart-inner">
              <div style={{ height: Math.max(200, bizUnits.length * 26) }}>
                <Bar data={barData} options={{
                  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { min: 2, max: 5, ticks: { font: { size: 10 } } },
                    y: { ticks: { font: { size: 10 } } },
                  },
                  onClick: (_, el) => {
                    if (el[0]) {
                      const unit = bizUnits.slice().sort((a,b) => a.name.localeCompare(b.name))[el[0].index];
                      if (unit) navigate('bu-detail', { business: selectedBusiness, unit: unit.name });
                    }
                  },
                }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI insight */}
      <div className="ai-summary-card" style={{ marginTop: 24 }}>
        <div className="ai-summary-header">
          <span className="ai-badge">AI</span>
          <span>Business Intelligence</span>
        </div>
        {loadInsight ? <Skeleton count={3} height={10} /> :
         insight ? (
           <>
             {insight.summary && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight.summary}</p>}
             {insight.strengths?.length > 0 && (
               <div style={{ marginTop: 12 }}>
                 <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-positive)', marginBottom: 4 }}>STRENGTHS</div>
                 <ul className="ai-bullets">{insight.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul>
               </div>
             )}
             {insight.concerns?.length > 0 && (
               <div style={{ marginTop: 12 }}>
                 <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red-critical)', marginBottom: 4 }}>CONCERNS</div>
                 <ul className="ai-bullets">{insight.concerns.map((s,i)=><li key={i}>{s}</li>)}</ul>
               </div>
             )}
             {insight.recommendations?.length > 0 && (
               <div style={{ marginTop: 12 }}>
                 <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-primary)', marginBottom: 4 }}>RECOMMENDATIONS</div>
                 <ul className="ai-bullets">{insight.recommendations.map((s,i)=><li key={i}>{s}</li>)}</ul>
               </div>
             )}
           </>
         ) : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No AI insight available.</p>
        }
      </div>

      {/* BU Table */}
      {bizUnits.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="section-title">All Business Units</h3>
          <PaginatedTable
            pageSize={10}
            headers={<><th>#</th><th>Business Unit</th><th>Score</th><th>Band</th><th>Respondents</th></>}
            rows={bizUnits
              .slice()
              .sort((a,b) => (b.score??b.overall??0)-(a.score??a.overall??0))
              .map((u, i) => (
                <tr key={u.name} onClick={() => navigate('bu-detail', { business: selectedBusiness, unit: u.name })} style={{ cursor: 'pointer' }}>
                  <td>{i+1}</td>
                  <td>{u.name}</td>
                  <td style={{ color: scoreColor(+(u.score??u.overall??0)), fontWeight: 700 }}>{(+(u.score??u.overall??0)).toFixed(2)}</td>
                  <td><Badge status={u.band} /></td>
                  <td>{u.respondent_count?.toLocaleString() ?? '—'}</td>
                </tr>
              ))
            }
          />
        </div>
      )}
    </div>
  );
}
