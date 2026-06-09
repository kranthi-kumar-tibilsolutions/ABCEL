import { useContext, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { AppContext } from '../../../context/AppContext';

// Score → colour: green ≥4.5, blue ≥4.0, amber ≥3.5, red <3.5
function scoreColor(s) {
  if (s >= 4.5) return '#16A34A';
  if (s >= 4.0) return '#2563EB';
  if (s >= 3.5) return '#D97706';
  return '#DC2626';
}

const DIM_LABELS = {
  overall:    'Business',
  gender:     'Gender',
  generation: 'Generation',
  tenure:     'Tenure',
  job_band:   'Job Band',
};

export default function EngagementBarChart({ onBarClick }) {
  const { businesses, cohorts, dimension } = useContext(AppContext);

  const { labels, scores, colors, title, sourceData } = useMemo(() => {
    let items = [];
    let chartTitle = 'Engagement Scores by Business';

    const dimKey = dimension === 'overall' ? null : dimension;
    if (dimKey && cohorts?.[dimKey]?.length) {
      items = [...cohorts[dimKey]].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
      chartTitle = `Engagement by ${DIM_LABELS[dimKey] ?? dimKey}`;
    } else if (businesses?.length) {
      items = [...businesses].sort((a, b) => (b.overall ?? b.score ?? 0) - (a.overall ?? a.score ?? 0));
    }

    return {
      labels:     items.map(b => b.name),
      scores:     items.map(b => +(b.overall ?? b.score ?? 0).toFixed(2)),
      colors:     items.map(b => scoreColor(+(b.overall ?? b.score ?? 0))),
      title:      chartTitle,
      sourceData: items,
    };
  }, [businesses, cohorts, dimension]);

  if (!labels.length) return (
    <div className="chart-card">
      <div className="chart-title">Engagement Scores by Business</div>
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No data available</div>
    </div>
  );

  const data = {
    labels,
    datasets: [{
      label:           'Engagement Score',
      data:            scores,
      backgroundColor: colors,
      borderRadius:    4,
      barThickness:    20,
    }],
  };

  const options = {
    indexAxis:   'y',
    responsive:  true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` Score: ${ctx.raw} / 5` },
      },
    },
    scales: {
      x: {
        min:   3.5,
        max:   5.0,
        grid:  { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, color: 'var(--text-muted)' },
      },
      y: {
        grid:  { display: false },
        ticks: { font: { size: 11 }, color: 'var(--text-primary)' },
      },
    },
    onClick: (_, elements) => {
      if (elements[0] && onBarClick) {
        onBarClick(sourceData[elements[0].index]?.name);
      }
    },
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        {onBarClick && (
          <button className="see-all-btn" onClick={() => onBarClick && onBarClick(null)}>
            View all →
          </button>
        )}
      </div>
      <div style={{ height: Math.max(260, labels.length * 28) }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
