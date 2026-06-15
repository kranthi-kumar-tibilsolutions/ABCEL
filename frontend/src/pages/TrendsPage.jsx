import { useContext, useMemo, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Line, Bar } from 'react-chartjs-2';
import Breadcrumb from '../components/shared/Breadcrumb';

// Task 15 — wave labels instead of months
const MOCK_WAVES = ['Vibes 2022', 'Vibes 2023', 'Vibes Q1 2024', 'Vibes Q2 2024', 'Vibes 2025', 'Vibes 2026'];

const CATEGORIES  = ['Engagement', 'Leadership', 'Wellbeing', 'Performance Culture', 'Onboarding', 'Communication'];
const CAT_COLORS  = ['#2563EB', '#7C3AED', '#16A34A', '#F97316', '#0891B2', '#D97706'];

function jitter(base, amplitude = 0.08) {
  return MOCK_WAVES.map((_, i) => +(base + (Math.sin(i * 1.5) * amplitude)).toFixed(2));
}

// Task 16 — per-wave category scores for drill-down
function catScoresForWave(waveIdx) {
  return CATEGORIES.map((_, ci) =>
    +((3.8 + ci * 0.1 + Math.sin(waveIdx * 1.2 + ci) * 0.25)).toFixed(2)
  );
}

export default function TrendsPage() {
  const { businesses, meta } = useContext(AppContext);
  const [drillWave, setDrillWave] = useState(null);

  const top5 = useMemo(() =>
    businesses ? [...businesses].sort((a,b) => (b.overall??b.score??0)-(a.overall??a.score??0)).slice(0, 5) : [],
  [businesses]);

  const COLORS = ['#F97316','#2563EB','#16A34A','#7C3AED','#0891B2'];

  const lineData = {
    labels:   MOCK_WAVES,
    datasets: top5.map((b, i) => ({
      label:            b.name,
      data:             jitter(+(b.overall??b.score??4.0)),
      borderColor:      COLORS[i % COLORS.length],
      backgroundColor:  'transparent',
      tension:          0.3,
      pointRadius:      4,
      pointHoverRadius: 6,
    })),
  };

  const groupData = {
    labels:   MOCK_WAVES,
    datasets: [{
      label:            'Group Average',
      data:             jitter(meta?.group_avg ?? 4.46, 0.05),
      borderColor:      '#F97316',
      backgroundColor:  'rgba(249,115,22,0.08)',
      fill:             true,
      tension:          0.3,
      pointRadius:      4,
      pointHoverRadius: 6,
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

  // Task 16 — drill-down bar chart data
  const drillWaveIdx = drillWave !== null ? MOCK_WAVES.indexOf(drillWave) : -1;
  const drillData = drillWaveIdx >= 0 ? {
    labels:   CATEGORIES,
    datasets: [{
      label:           drillWave,
      data:            catScoresForWave(drillWaveIdx),
      backgroundColor: CAT_COLORS.map(c => c + 'CC'),
      borderColor:     CAT_COLORS,
      borderWidth:     1.5,
      borderRadius:    4,
    }],
  } : null;

  const drillOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: item => ` Score: ${Number(item.raw).toFixed(2)} / 5` } },
    },
    scales: {
      y: { min: 3.0, max: 5, ticks: { stepSize: 0.5 } },
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

      {/* Group trend — click a point to drill down */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
          Group Engagement Trend
          <span style={{ fontSize:10.5, fontWeight:400, color:'var(--text-muted)' }}>
            · Click a point to drill down by category
          </span>
        </div>
        <div style={{ height: 260 }}>
          <Line
            data={groupData}
            options={{
              ...lineOptions,
              onClick: (_, elements) => {
                if (!elements.length) return;
                const wave = MOCK_WAVES[elements[0].index];
                setDrillWave(prev => prev === wave ? null : wave);
              },
              onHover: (event, elements) => {
                event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
              },
            }}
          />
        </div>
      </div>

      {/* Drill-down panel */}
      {drillWave && drillData && (
        <div className="chart-card" style={{ marginBottom: 16, borderColor: '#F97316' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="chart-title" style={{ marginBottom:0 }}>
              <span style={{ color:'#F97316' }}>{drillWave}</span> — Category Breakdown
            </div>
            <button
              onClick={() => setDrillWave(null)}
              style={{
                background:'none', border:'1px solid var(--border)', borderRadius:6,
                padding:'3px 10px', fontSize:11, cursor:'pointer', color:'var(--text-muted)',
                fontFamily:'inherit',
              }}
            >✕ Close</button>
          </div>
          <div style={{ height: 220 }}>
            <Bar data={drillData} options={drillOptions} />
          </div>
        </div>
      )}

      {/* Top 5 businesses */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
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

      {/* Category placeholders */}
      <div className="chart-card" style={{ marginTop: 8 }}>
        <div className="chart-title" style={{ marginBottom: 8 }}>Category Trends</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Multi-wave category trend data requires historical survey uploads. Upload previous wave Excel files to enable this view.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {CATEGORIES.map(cat => (
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
