import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Line } from 'react-chartjs-2';
import Breadcrumb from '../components/shared/Breadcrumb';

const MOCK_WAVES = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];

function jitter(base, amplitude = 0.08) {
  return MOCK_WAVES.map((_, i) => +(base + (Math.sin(i * 1.5) * amplitude)).toFixed(2));
}

export default function TrendsPage() {
  const { businesses, meta } = useContext(AppContext);

  const top5 = useMemo(() =>
    businesses ? [...businesses].sort((a,b) => (b.overall??b.score??0)-(a.overall??a.score??0)).slice(0, 5) : [],
  [businesses]);

  const COLORS = ['#F97316','#2563EB','#16A34A','#7C3AED','#0891B2'];

  const lineData = {
    labels:   MOCK_WAVES,
    datasets: top5.map((b, i) => ({
      label:           b.name,
      data:            jitter(+(b.overall??b.score??4.0)),
      borderColor:     COLORS[i % COLORS.length],
      backgroundColor: 'transparent',
      tension:         0.3,
      pointRadius:     3,
    })),
  };

  const groupData = {
    labels:   MOCK_WAVES,
    datasets: [{
      label:           'Group Average',
      data:            jitter(meta?.group_avg ?? 4.46, 0.05),
      borderColor:     '#F97316',
      backgroundColor: 'rgba(249,115,22,0.08)',
      fill:            true,
      tension:         0.3,
    }],
  };

  const lineOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 3.5, max: 5, ticks: { stepSize: 0.5 } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'Trends' },
      ]} />

      <div className="page-header">
        <h1 className="page-title">Trends</h1>
        <p className="page-sub">Engagement trend analysis across survey waves (illustrative)</p>
      </div>

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-title">Group Engagement Trend</div>
        <div style={{ height: 260 }}>
          <Line data={groupData} options={lineOptions} />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Top 5 Businesses — Engagement Over Time</div>
        <div style={{ height: 320 }}>
          <Line
            data={lineData}
            options={{
              ...lineOptions,
              plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
            }}
          />
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-title" style={{ marginBottom: 8 }}>Category Trends</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Multi-wave category trend data requires historical survey uploads. Upload previous wave Excel files to enable this view.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {['Engagement','Onboarding','Wellbeing','Performance Culture','Leadership','Communication'].map(cat => (
            <div key={cat} style={{ padding: 16, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{cat}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Trend data pending</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
