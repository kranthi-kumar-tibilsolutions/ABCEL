import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import { Bar, Radar } from 'react-chartjs-2';
import Badge       from '../components/shared/Badge';
import Breadcrumb  from '../components/shared/Breadcrumb';
import Skeleton    from '../components/shared/Skeleton';
import InfoTip     from '../components/shared/InfoTip';

const CATEGORY_COLORS = {
  'Engagement':          '#F97316',
  'Onboarding':          '#2563EB',
  'Wellbeing':           '#16A34A',
  'Performance Culture': '#7C3AED',
  'Leadership':          '#0891B2',
  'Communication':       '#D97706',
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
  const { selectedBusiness, navigate, units, businesses, dimension } = useContext(AppContext);
  const [insight,      setInsight]     = useState(null);
  const [loadInsight,  setLoadInsight] = useState(false);
  const [showAllBUs,   setShowAllBUs]  = useState(false);

  const biz = businesses?.find(b => b.name === selectedBusiness);
  const bizUnits = units?.filter(u => u.business === selectedBusiness) ?? [];

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
      <Breadcrumb items={[
        { label: 'Overview',   page: 'overview' },
        { label: biz.name },
      ]} />

      <div className="biz-detail-header">
        <div>
          <h1 className="page-title">{biz.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <Badge status={biz.band} />
            {biz.rank && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rank #{biz.rank} of {businesses?.length}</span>}
            {biz.respondent_count && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{biz.respondent_count?.toLocaleString()} respondents</span>}
          </div>
        </div>
        <div className="biz-score-big" style={{ color: scoreColor(biz.overall ?? biz.score ?? 0) }}>
          {(biz.overall ?? biz.score ?? 0).toFixed(2)}
          <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>/ 5.00</span>
        </div>
      </div>

      {/* Category scores */}
      {cats.length > 0 && (
        <div className="cat-scores-grid">
          {cats.map(([cat, val]) => (
            <div key={cat} className="cat-score-card" style={{ borderTop: `3px solid ${CATEGORY_COLORS[cat] || '#6B7280'}` }}>
              <div className="cat-score-label">{cat}</div>
              <div className="cat-score-value" style={{ color: scoreColor(+val) }}>{(+val).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="detail-grid">
        {/* Radar */}
        {catLabels.length > 2 && (
          <div className="chart-card">
            <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Category Profile</span><InfoTip tip="Radar chart showing this business's score across each engagement category, making strengths and weaknesses immediately visible." /></div>
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
            <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Business Units</span><InfoTip tip="Overall engagement scores for every business unit within this business, sorted from highest to lowest. Click a bar to drill into that unit's detail." /></div>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Business Intelligence<InfoTip tip="AI-generated narrative covering this business's key strengths, areas of concern, and recommended actions based on its category scores." /></span>
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
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Business Unit</th><th>Score</th><th>Band</th><th>Respondents</th>
              </tr>
            </thead>
            <tbody>
              {bizUnits
                .slice()
                .sort((a,b) => (b.score??b.overall??0)-(a.score??a.overall??0))
                .slice(0, showAllBUs ? undefined : 10)
                .map((u, i) => (
                  <tr
                    key={u.name}
                    onClick={() => navigate('bu-detail', { business: selectedBusiness, unit: u.name })}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{i+1}</td>
                    <td>{u.name}</td>
                    <td style={{ color: scoreColor(+(u.score??u.overall??0)), fontWeight: 700 }}>
                      {(+(u.score??u.overall??0)).toFixed(2)}
                    </td>
                    <td><Badge status={u.band} /></td>
                    <td>{u.respondent_count?.toLocaleString() ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {bizUnits.length > 10 && (
            <button
              onClick={() => setShowAllBUs(v => !v)}
              style={{
                marginTop: 10, width: '100%', padding: '9px 0',
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 12, fontWeight: 600,
                color: 'var(--blue-primary)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {showAllBUs ? `Show less ↑` : `View more (${bizUnits.length - 10} more) ↓`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
