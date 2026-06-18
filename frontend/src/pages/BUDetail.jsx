import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Bar } from 'react-chartjs-2';
import Badge      from '../components/shared/Badge';
import Breadcrumb from '../components/shared/Breadcrumb';
import InfoTip    from '../components/shared/InfoTip';

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  if (s >= 2.5) return '#EA580C';
  return '#DC2626';
}

const CATEGORY_COLORS = ['#F97316','#2563EB','#16A34A','#7C3AED','#0891B2','#D97706'];

export default function BUDetail() {
  const { selectedBusiness, selectedBU, navigate, units, cohorts, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setActiveScreenContext({ tab: 'bu_detail', description: `Business unit detail view — ${selectedBU ?? 'unknown unit'} (${selectedBusiness ?? 'unknown business'}).` });
  }, [selectedBU, selectedBusiness]);

  const unit = units?.find(u => u.name === selectedBU && (!selectedBusiness || u.business === selectedBusiness));

  if (!unit) return (
    <div className="page-container">
      <p style={{ color: 'var(--text-muted)', padding: 24 }}>No business unit selected.</p>
    </div>
  );

  const cats    = unit.categories ? Object.entries(unit.categories) : [];
  const score   = +(unit.score ?? unit.overall ?? 0);

  const catBarData = {
    labels:   cats.map(([k]) => k),
    datasets: [{
      label:           'Score',
      data:            cats.map(([,v]) => +v.toFixed(2)),
      backgroundColor: CATEGORY_COLORS,
      borderRadius:    6,
      barThickness:    32,
    }],
  };

  const cohortDims = cohorts ? Object.keys(cohorts) : [];

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview',              page: 'overview' },
        { label: selectedBusiness || '—', page: 'business-detail', params: { business: selectedBusiness } },
        { label: unit.name },
      ]} />

      <div className="biz-detail-header">
        <div>
          <h1 className="page-title">{unit.name}</h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Badge status={unit.band} />
            {unit.business && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{unit.business}</span>}
            {unit.respondent_count && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{unit.respondent_count?.toLocaleString()} respondents</span>}
          </div>
        </div>
        <div className="biz-score-big" style={{ color: scoreColor(score) }}>
          {score.toFixed(2)}
          <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>/ 5.00</span>
        </div>
      </div>

      {/* Category bar */}
      {cats.length > 0 && (
        <div className="chart-card" style={{ marginTop: 24 }}>
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Category Scores</span><InfoTip tip="This business unit's mean score for each engagement category, showing where it is strong or needs improvement." /></div>
          <div style={{ height: 260 }}>
            <Bar data={catBarData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { min: 0, max: 5, ticks: { stepSize: 1 } },
                x: { grid: { display: false } },
              },
            }} />
          </div>
        </div>
      )}

      {/* Cohort breakdown */}
      {cohortDims.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Cohort Breakdown<InfoTip tip="Engagement scores segmented by demographic groups (gender, generation, tenure, job band) within this business unit, highlighting which cohorts need attention." /></h3>
          <div className="cohort-grid">
            {cohortDims.map(dim => {
              const groups = cohorts[dim] ?? [];
              return (
                <div key={dim} className="chart-card">
                  <div className="chart-title" style={{ textTransform: 'capitalize' }}>{dim.replace('_',' ')}</div>
                  {groups.map((g, i) => {
                    const val = +(g.score ?? g.overall ?? 0);
                    return (
                      <div key={i} className="cohort-row">
                        <span className="cohort-label">{g.label ?? g.name ?? g.group}</span>
                        <div className="cohort-bar-wrap">
                          <div className="cohort-bar" style={{ width: `${((val - 1) / 4) * 100}%`, background: scoreColor(val) }} />
                        </div>
                        <span className="cohort-score" style={{ color: scoreColor(val) }}>{val.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
