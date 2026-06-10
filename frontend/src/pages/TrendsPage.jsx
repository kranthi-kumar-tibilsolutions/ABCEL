import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Bar } from 'react-chartjs-2';
import Breadcrumb from '../components/shared/Breadcrumb';

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  return '#DC2626';
}

function DeltaBar({ value, max }) {
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  const color = value >= 0 ? '#16A34A' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 80, height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36 }}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

export default function TrendsPage() {
  const { businesses, meta, cohorts, navigate } = useContext(AppContext);

  const groupAvg = meta?.group_avg ?? 4.4;
  const catAvgs  = meta?.category_averages ?? {};

  // Category breakdown chart
  const catChartData = useMemo(() => {
    const cats   = Object.keys(catAvgs);
    const values = cats.map(c => catAvgs[c]);
    return {
      labels: cats,
      datasets: [
        {
          label:           'Category Score',
          data:            values,
          backgroundColor: values.map(v => v >= groupAvg ? '#2563EB' : '#F97316'),
          borderRadius:    4,
          barThickness:    22,
        },
        {
          label:           'Group Average',
          data:            cats.map(() => groupAvg),
          type:            'line',
          borderColor:     '#94A3B8',
          borderWidth:     1.5,
          borderDash:      [5, 4],
          pointRadius:     0,
          fill:            false,
        },
      ],
    };
  }, [catAvgs, groupAvg]);

  // Business score distribution buckets
  const distribution = useMemo(() => {
    if (!businesses?.length) return [];
    const buckets = [
      { label: '< 4.3',       min: 0,    max: 4.3,  color: '#DC2626' },
      { label: '4.3 – 4.35',  min: 4.3,  max: 4.35, color: '#D97706' },
      { label: '4.35 – 4.4',  min: 4.35, max: 4.4,  color: '#65A30D' },
      { label: '4.4 – 4.45',  min: 4.4,  max: 4.45, color: '#16A34A' },
      { label: '> 4.45',      min: 4.45, max: 99,   color: '#15803D' },
    ];
    return buckets.map(b => ({
      ...b,
      count: businesses.filter(biz => {
        const s = +(biz.overall ?? biz.score ?? 0);
        return s >= b.min && s < b.max;
      }).length,
    }));
  }, [businesses]);

  // Cohort analysis
  const cohortDims = useMemo(() => {
    if (!cohorts) return [];
    return Object.entries(cohorts)
      .filter(([, items]) => items?.length > 0 && items.length <= 12)
      .slice(0, 4);
  }, [cohorts]);

  const maxDelta = useMemo(() => {
    if (!cohortDims.length) return 0.2;
    let max = 0;
    cohortDims.forEach(([, items]) => items.forEach(i => {
      const d = Math.abs((+(i.overall ?? 0)) - groupAvg);
      if (d > max) max = d;
    }));
    return Math.max(max, 0.05);
  }, [cohortDims, groupAvg]);

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'Survey Analysis' },
      ]} />

      <div className="page-header">
        <h1 className="page-title">Survey Analysis</h1>
        <p className="page-sub">Category breakdown, score distribution and cohort comparisons from the 2026 Vibes survey</p>
      </div>

      {/* Category Performance */}
      {Object.keys(catAvgs).length > 0 && (
        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-title">Category Score vs Group Average</div>
          <div style={{ height: 280 }}>
            <Bar data={catChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw?.toFixed ? ctx.raw.toFixed(2) : ctx.raw}` } },
              },
              scales: {
                y: { min: 3.8, max: 5.0, ticks: { stepSize: 0.2 } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              },
            }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB' }} />
              Above group average
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F97316' }} />
              Below group average ({groupAvg.toFixed(2)})
            </div>
          </div>
        </div>
      )}

      {/* Score Distribution */}
      {businesses?.length > 0 && (
        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-title">Business Score Distribution</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            How {businesses.length} businesses are spread across engagement score bands
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 120 }}>
            {distribution.map(b => {
              const pct = businesses.length > 0 ? b.count / businesses.length : 0;
              return (
                <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.count}</span>
                  <div style={{
                    width: '100%', height: Math.max(4, pct * 90),
                    background: b.color, borderRadius: '3px 3px 0 0', opacity: 0.85,
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cohort Comparisons */}
      {cohortDims.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Engagement by Dimension</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
            {cohortDims.map(([dimName, items]) => (
              <div key={dimName} className="chart-card">
                <div className="chart-title" style={{ textTransform: 'capitalize', marginBottom: 12 }}>
                  {dimName.replace(/_/g, ' ')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item, i) => {
                    const sc    = +(item.overall ?? 0);
                    const delta = sc - groupAvg;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <DeltaBar value={delta} max={maxDelta} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(sc), minWidth: 30, textAlign: 'right' }}>
                          {sc.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                  Bar = deviation from group avg ({groupAvg.toFixed(2)})
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Multi-wave placeholder */}
      <div className="chart-card">
        <div className="chart-title">Multi-Wave Trend Analysis</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 4"/>
            <path d="M12 32 L18 22 L24 28 L30 18 L36 24" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="36" cy="24" r="3" fill="#CBD5E1"/>
          </svg>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
            Year-over-year trends require multiple survey waves
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400, margin: 0, lineHeight: 1.6 }}>
            Upload your 2025 Vibes Excel file alongside the 2026 data to unlock trend lines, improvement tracking, and YoY comparison charts.
          </p>
          <button
            className="sample-btn"
            style={{ marginTop: 8 }}
            onClick={() => navigate && navigate('upload')}
          >
            Upload historical data →
          </button>
        </div>
      </div>
    </div>
  );
}
