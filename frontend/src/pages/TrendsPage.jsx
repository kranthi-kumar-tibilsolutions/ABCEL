import { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Breadcrumb from '../components/shared/Breadcrumb';

const WAVES = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];
const N = WAVES.length;

function jitter(base, amplitude = 0.08) {
  return WAVES.map((_, i) => +(base + (Math.sin(i * 1.5) * amplitude)).toFixed(2));
}

const COLORS = ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#0891B2'];

// SVG line chart — no external library
function LineChart({ datasets, yMin = 3.5, yMax = 5, height = 240, labels = WAVES }) {
  const W = 620, H = height, PAD_L = 44, PAD_R = 12, PAD_T = 12, PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xOf = i => PAD_L + (i / (N - 1)) * chartW;
  const yOf = v => PAD_T + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const yTicks = [];
  for (let v = yMin; v <= yMax + 0.01; v += 0.5) yTicks.push(+v.toFixed(1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {/* Y gridlines + labels */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD_L} y1={yOf(v)} x2={W - PAD_R} y2={yOf(v)} stroke="#E2E8F0" strokeWidth="1" />
          <text x={PAD_L - 6} y={yOf(v) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">{v.toFixed(1)}</text>
        </g>
      ))}

      {/* X labels */}
      {labels.map((lbl, i) => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94A3B8">{lbl}</text>
      ))}

      {/* Fill area for first dataset if it has fill */}
      {datasets.filter(d => d.fill).map((d, di) => {
        const pts = d.data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
        const first = d.data[0], last = d.data[N - 1];
        const fillPath = `M${xOf(0)},${yOf(first)} L${pts.replace(/^[\d.,]+ /, '')} L${xOf(N - 1)},${yOf(last)} L${xOf(N - 1)},${H - PAD_B} L${xOf(0)},${H - PAD_B} Z`;
        return <path key={`fill-${di}`} d={`M${xOf(0)},${yOf(first)} L${d.data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' L')} L${xOf(N - 1)},${H - PAD_B} L${xOf(0)},${H - PAD_B} Z`} fill={d.fillColor ?? '#F97316'} fillOpacity={0.08} />;
      })}

      {/* Lines */}
      {datasets.map((d, di) => {
        const pts = d.data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
        return (
          <g key={`line-${di}`}>
            <polyline points={pts} fill="none" stroke={d.color} strokeWidth={d.strokeWidth ?? 2}
              strokeDasharray={d.dashed ? '5,4' : undefined} strokeLinecap="round" strokeLinejoin="round" />
            {!d.hidePoints && d.data.map((v, i) => (
              <circle key={i} cx={xOf(i)} cy={yOf(v)} r="3" fill={d.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ width: 24, height: 2.5, background: item.color, borderRadius: 2 }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export default function TrendsPage() {
  const { businesses, meta } = useContext(AppContext);

  const top5 = useMemo(() =>
    businesses ? [...businesses].sort((a, b) => (b.overall ?? b.score ?? 0) - (a.overall ?? a.score ?? 0)).slice(0, 5) : [],
  [businesses]);

  const groupAvg = meta?.group_avg ?? 4.46;

  const groupDatasets = [{
    label: 'Group Average',
    data: jitter(groupAvg, 0.05),
    color: '#F97316',
    fill: true,
    fillColor: '#F97316',
  }];

  const bizDatasets = top5.map((b, i) => ({
    label: b.name,
    data: jitter(+(b.overall ?? b.score ?? groupAvg)),
    color: COLORS[i % COLORS.length],
  }));

  const CATS = ['Engagement', 'Onboarding', 'Wellbeing', 'Performance Culture', 'Leadership', 'Communication'];

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: 'Overview', page: 'overview' }, { label: 'Trends' }]} />

      <div className="page-header">
        <h1 className="page-title">Trends</h1>
        <p className="page-sub">Engagement trend analysis across survey waves (illustrative)</p>
      </div>

      {/* Group trend */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-title">Group Engagement Trend</div>
        <LineChart datasets={groupDatasets} yMin={3.5} yMax={5} />
        <ChartLegend items={[{ label: `Group Average (${groupAvg.toFixed(2)})`, color: '#F97316' }]} />
      </div>

      {/* Top 5 businesses */}
      <div className="chart-card">
        <div className="chart-title">Top 5 Businesses — Engagement Over Time</div>
        {top5.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading business data…
          </div>
        ) : (
          <>
            <LineChart datasets={bizDatasets} yMin={3.5} yMax={5} height={300} />
            <ChartLegend items={top5.map((b, i) => ({ label: b.name, color: COLORS[i % COLORS.length] }))} />
          </>
        )}
      </div>

      {/* Category trends placeholder */}
      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-title" style={{ marginBottom: 8 }}>Category Trends</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Multi-wave category trend data requires historical survey uploads. Upload previous wave Excel files to enable this view.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          {CATS.map(cat => (
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
