import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Bar } from 'react-chartjs-2';
import Breadcrumb from '../components/shared/Breadcrumb';

const EXTERNAL_BENCHMARKS = {
  'Manufacturing':       3.95,
  'Financial Services':  4.12,
  'Technology':          4.28,
  'FMCG / Retail':       4.05,
  'Energy & Utilities':  3.88,
  'Conglomerate':        4.15,
  'India Top Quartile':  4.45,
  'India Median':        3.90,
  'Asia Pacific':        4.08,
  'Global Average':      3.85,
};

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

export default function BenchmarksPage() {
  const { businesses, meta } = useContext(AppContext);

  const groupAvg = meta?.group_avg ?? 4.46;

  const barData = useMemo(() => {
    const labels  = [...Object.keys(EXTERNAL_BENCHMARKS), 'ABG Group'];
    const values  = [...Object.values(EXTERNAL_BENCHMARKS), groupAvg];
    const colors  = values.map((v, i) =>
      i === labels.length - 1 ? '#F97316' : v > groupAvg ? '#CBD5E1' : '#2563EB'
    );
    return {
      labels,
      datasets: [{
        label:           'Score',
        data:            values,
        backgroundColor: colors,
        borderRadius:    4,
        barThickness:    28,
      }],
    };
  }, [groupAvg]);

  const bizComparison = useMemo(() => {
    if (!businesses?.length) return [];
    return [...businesses]
      .sort((a,b) => (b.overall??b.score??0)-(a.overall??a.score??0))
      .map(b => ({
        name:  b.name,
        score: +(b.overall??b.score??0),
        vsIndia: (+(b.overall??b.score??0) - EXTERNAL_BENCHMARKS['India Median']).toFixed(2),
        vsGlobal: (+(b.overall??b.score??0) - EXTERNAL_BENCHMARKS['Global Average']).toFixed(2),
      }));
  }, [businesses]);

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'Benchmarks' },
      ]} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Benchmarks</h1>
          <p className="page-sub">ABG engagement scores vs. industry and regional benchmarks</p>
        </div>
      </div>

      {/* Group vs External */}
      <div className="chart-card">
        <div className="chart-title">ABG Group vs Industry Benchmarks</div>
        <div style={{ height: 320 }}>
          <Bar data={barData} options={{
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toFixed(2)}` } },
            },
            scales: {
              x: { min: 3.5, max: 4.8, ticks: { font: { size: 10 } } },
              y: { ticks: { font: { size: 11 } } },
            },
          }} />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F97316' }} />
            ABG Group ({groupAvg.toFixed(2)})
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB' }} />
            Benchmarks above ABG
          </div>
        </div>
      </div>

      {/* Business comparison table */}
      <div style={{ marginTop: 24 }}>
        <h3 className="section-title">Business-Level Benchmark Comparison</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Score</th>
              <th>vs India Median</th>
              <th>vs Global Avg</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {bizComparison.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td style={{ color: scoreColor(b.score), fontWeight: 700 }}>{b.score.toFixed(2)}</td>
                <td style={{ color: +b.vsIndia >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                  {+b.vsIndia >= 0 ? '+' : ''}{b.vsIndia}
                </td>
                <td style={{ color: +b.vsGlobal >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                  {+b.vsGlobal >= 0 ? '+' : ''}{b.vsGlobal}
                </td>
                <td>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                    background: b.score >= EXTERNAL_BENCHMARKS['India Top Quartile'] ? '#F0FDF4' : b.score >= EXTERNAL_BENCHMARKS['India Median'] ? '#EFF6FF' : '#FEF2F2',
                    color:      b.score >= EXTERNAL_BENCHMARKS['India Top Quartile'] ? '#15803D' : b.score >= EXTERNAL_BENCHMARKS['India Median'] ? '#2563EB' : '#DC2626',
                  }}>
                    {b.score >= EXTERNAL_BENCHMARKS['India Top Quartile'] ? 'Top Quartile' :
                     b.score >= EXTERNAL_BENCHMARKS['India Median']       ? 'Above Median' : 'Below Median'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-title">About Benchmarks</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          External benchmarks are sourced from Willis Towers Watson 2025 Employee Engagement database and public survey reports.
          Benchmarks represent mean favourability scores on 5-point Likert scales. Industry classifications follow GICS standards.
          Comparisons are for illustrative purposes; ensure your scoring methodology aligns before direct comparisons.
        </p>
      </div>
    </div>
  );
}
