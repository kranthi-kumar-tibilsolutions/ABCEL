import { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Bar } from 'react-chartjs-2';
import BENCHMARKS from '../data/benchmarks.json';

const TYPE_LABELS = { peer: 'Peer Conglomerate', industry: 'Industry', regional: 'Regional / Norm' };
const TYPE_COLORS = { peer: '#7C3AED', industry: '#2563EB', regional: '#0891B2' };
const REGION_FLAGS = { India: '🇮🇳', APAC: '🌏', 'South Asia': '🌏', Global: '🌐' };

function scoreColor(s, groupAvg) {
  if (s >= groupAvg + 0.1) return '#15803D';
  if (s >= groupAvg - 0.05) return '#16A34A';
  if (s >= groupAvg - 0.15) return '#D97706';
  return '#DC2626';
}

function GapBar({ score, groupAvg }) {
  const delta = score - groupAvg;
  const color  = delta >= 0 ? '#16A34A' : '#DC2626';
  const width  = Math.min(Math.abs(delta) / 0.6 * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 5, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: width + '%', height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 40 }}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
      </span>
    </div>
  );
}

export default function BenchmarksPage() {
  const { businesses, meta, setBreadcrumb } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('peers');

  useEffect(() => {
    setBreadcrumb([{ label: 'Benchmarks' }]);
  }, []);

  const groupAvg    = meta?.group_avg ?? 4.44;
  const catAvgs     = meta?.category_averages ?? {};
  const catBenchmarks = BENCHMARKS.categoryBenchmarks ?? {};

  const allExternal = [...BENCHMARKS.peers];

  // Main bar chart — filtered by active tab
  const barData = useMemo(() => {
    const source  = activeTab === 'peers' ? BENCHMARKS.peers
                  : activeTab === 'industry' ? BENCHMARKS.industry
                  : BENCHMARKS.regional;
    const entries = [...source.sort((a,b) => b.score - a.score), { name: 'ABG Group', score: groupAvg, type: 'abg' }];
    return {
      labels: entries.map(e => e.name),
      datasets: [{
        label:           'Score',
        data:            entries.map(e => e.score),
        backgroundColor: entries.map(e =>
          e.type === 'abg' ? '#F97316'
          : e.score > groupAvg ? '#CBD5E1' : '#2563EB'
        ),
        borderRadius: 4,
        barThickness: 24,
      }],
    };
  }, [activeTab, groupAvg]);

  // Category benchmark comparison
  const catRows = useMemo(() => {
    return Object.entries(catAvgs).map(([cat, abgScore]) => {
      const bench = catBenchmarks[cat] ?? {};
      return { cat, abgScore, ...bench };
    });
  }, [catAvgs, catBenchmarks]);

  const tabs = [
    { key: 'peers', label: 'Peer Conglomerates' },
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Position summary cards */}
      {(() => {
        const aboveAll  = allExternal.filter(e => groupAvg > e.score).length;
        const totalComp = allExternal.length;
        const indiaTop  = BENCHMARKS.regional.find(r => r.name === 'India Top Quartile')?.score ?? 4.45;
        const globalAvg = BENCHMARKS.regional.find(r => r.name === 'Global Average')?.score ?? 3.85;
        const cards = [
          { label: 'ABG Group Average',     value: groupAvg.toFixed(2),                                                                          border: '#F97316', bg: 'rgba(249,115,22,0.08)',  shadow: 'rgba(249,115,22,0.12)',  text: '#C2410C' },
          { label: 'Benchmarks Exceeded',   value: `${aboveAll} / ${totalComp}`,                                                                  border: '#16A34A', bg: 'rgba(22,163,74,0.08)',   shadow: 'rgba(22,163,74,0.12)',   text: '#15803D' },
          { label: 'vs India Top Quartile', value: groupAvg >= indiaTop ? 'Top Quartile' : `${(groupAvg - indiaTop).toFixed(2)} gap`,             border: groupAvg >= indiaTop ? '#15803D' : '#D97706', bg: groupAvg >= indiaTop ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)', shadow: groupAvg >= indiaTop ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)', text: groupAvg >= indiaTop ? '#15803D' : '#B45309' },
          { label: 'vs Global Average',     value: `+${(groupAvg - globalAvg).toFixed(2)}`,                                                       border: '#2563EB', bg: 'rgba(37,99,235,0.08)',   shadow: 'rgba(37,99,235,0.12)',   text: '#1D4ED8' },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {cards.map(c => (
              <div key={c.label} className="biz-overview-card" style={{
                borderLeft: `4px solid ${c.border}`,
                background: `linear-gradient(135deg, ${c.bg} 0%, var(--bg-card) 60%)`,
                boxShadow: `0 4px 16px ${c.shadow}, 0 1px 4px rgba(0,0,0,0.06)`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{c.label}</span>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: `2.5px solid ${c.border}`,
                  background: c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: c.text, lineHeight: 1.2, textAlign: 'center' }}>{c.value}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tabs + bar chart */}
      <div className="chart-card">
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
                background: activeTab === t.key ? 'var(--blue-primary)' : 'transparent',
                color:      activeTab === t.key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ height: 300 }}>
          <Bar data={barData} options={{
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` ${ctx.raw?.toFixed(2)}` } },
            },
            scales: {
              x: { min: 3.5, max: 4.8, ticks: { font: { size: 10 } } },
              y: { ticks: { font: { size: 11 } } },
            },
          }} />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F97316' }} /> ABG Group ({groupAvg.toFixed(2)})
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB' }} /> Below ABG
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#CBD5E1' }} /> Above ABG
          </div>
        </div>
      </div>

      {/* Detailed comparison table */}
      <div className="chart-card">
        <div className="chart-title" style={{ marginBottom: 12 }}>Full Benchmark Comparison</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Organisation / Norm</th>
              <th>Type</th>
              <th>Region</th>
              <th>Score</th>
              <th>vs ABG</th>
            </tr>
          </thead>
          <tbody>
            {allExternal.sort((a,b) => b.score - a.score).map((b, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                    background: TYPE_COLORS[b.type] + '18', color: TYPE_COLORS[b.type],
                  }}>
                    {TYPE_LABELS[b.type] ?? b.type}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {REGION_FLAGS[b.region] ?? ''} {b.region}
                </td>
                <td style={{ fontWeight: 700, color: scoreColor(b.score, groupAvg) }}>{b.score.toFixed(2)}</td>
                <td><GapBar score={b.score} groupAvg={groupAvg} /></td>
              </tr>
            ))}
            <tr style={{ background: '#FFF7ED', fontWeight: 700 }}>
              <td>ABG Group</td>
              <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: '#FED7AA', color: '#C2410C' }}>Your Organisation</span></td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>🇮🇳 India</td>
              <td style={{ fontWeight: 700, color: '#F97316' }}>{groupAvg.toFixed(2)}</td>
              <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Category-level benchmarks */}
      {catRows.length > 0 && (
        <div className="chart-card">
          <div className="chart-title" style={{ marginBottom: 4 }}>Category-Level Benchmark</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>ABG category scores vs India median and top-quartile norms</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>ABG Score</th>
                <th>India Median</th>
                <th>India Top Quartile</th>
                <th>Global Avg</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {catRows.map((r, i) => {
                const topQ = r.india_top_quartile ?? 4.4;
                const med  = r.india_median ?? 3.9;
                const pos  = r.abgScore >= topQ ? 'Top Quartile'
                           : r.abgScore >= med  ? 'Above Median'
                           : 'Below Median';
                const posColor = pos === 'Top Quartile' ? '#15803D' : pos === 'Above Median' ? '#2563EB' : '#DC2626';
                const posBg    = pos === 'Top Quartile' ? '#F0FDF4'  : pos === 'Above Median' ? '#EFF6FF'  : '#FEF2F2';
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.cat}</td>
                    <td style={{ fontWeight: 700, color: '#F97316' }}>{r.abgScore.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.india_median?.toFixed(2) ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.india_top_quartile?.toFixed(2) ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.global_avg?.toFixed(2) ?? '—'}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: posBg, color: posColor }}>
                        {pos}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="chart-card">
        <div className="chart-title">About These Benchmarks</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Benchmark data is sourced from Willis Towers Watson 2025 Employee Engagement Report, Korn Ferry 2024 Engagement Survey, Gallup State of the Global Workplace 2025, and Mercer 2024 Global Engagement Norms. All scores represent mean favourability on a 1–5 Likert scale. Industry and peer scores are aggregated from publicly available survey reports and anonymised proprietary databases. Comparisons are for strategic orientation; ensure your scoring methodology aligns before drawing direct conclusions.
        </p>
      </div>
    </div>
  );
}
