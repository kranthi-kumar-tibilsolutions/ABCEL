import { useContext, useMemo } from 'react';
import { AppContext } from '../../../context/AppContext';

const CATEGORIES = [
  'Engagement',
  'Onboarding',
  'Wellbeing',
  'Performance Culture',
  'Leadership',
  'Communication',
];

function scoreToColor(score) {
  if (!score || isNaN(score)) return '#E5E7EB';
  if (score >= 4.5) return '#15803D';
  if (score >= 4.0) return '#16A34A';
  if (score >= 3.5) return '#65A30D';
  if (score >= 3.0) return '#D97706';
  if (score >= 2.5) return '#EA580C';
  return '#DC2626';
}

function scoreToText(score) {
  if (!score || isNaN(score)) return '#fff';
  return score >= 3.5 ? '#fff' : '#fff';
}

export default function EngagementHeatmap({ onCellClick }) {
  const { businesses } = useContext(AppContext);

  const { rows, cats } = useMemo(() => {
    if (!businesses?.length) return { rows: [], cats: CATEGORIES };
    const sorted = [...businesses]
      .sort((a, b) => (b.overall ?? b.score ?? 0) - (a.overall ?? a.score ?? 0))
      .slice(0, 15);
    const usedCats = businesses[0]?.categories
      ? Object.keys(businesses[0].categories)
      : CATEGORIES;
    return { rows: sorted, cats: usedCats };
  }, [businesses]);

  if (!rows.length) return null;

  return (
    <div className="chart-card">
      <div className="chart-title">Category Heatmap</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-biz-header">Business</th>
              {cats.map(c => (
                <th key={c} className="heatmap-cat-header" title={c}>
                  {c.length > 10 ? c.slice(0, 9) + '…' : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((biz) => (
              <tr key={biz.name}>
                <td className="heatmap-biz-name" title={biz.name}>
                  {biz.name.length > 20 ? biz.name.slice(0, 18) + '…' : biz.name}
                </td>
                {cats.map(cat => {
                  const score = biz.categories?.[cat] ?? biz.categories?.[cat.toLowerCase()] ?? null;
                  return (
                    <td
                      key={cat}
                      className="heatmap-cell"
                      style={{
                        background: scoreToColor(score),
                        color:      scoreToText(score),
                        cursor:     onCellClick ? 'pointer' : 'default',
                      }}
                      title={`${biz.name} · ${cat}: ${score?.toFixed(2) ?? 'N/A'}`}
                      onClick={() => onCellClick && onCellClick(biz.name, cat, score)}
                    >
                      {score ? score.toFixed(1) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap-legend">
        {[
          { color: '#15803D', label: '≥4.5' },
          { color: '#16A34A', label: '4.0–4.5' },
          { color: '#65A30D', label: '3.5–4.0' },
          { color: '#D97706', label: '3.0–3.5' },
          { color: '#EA580C', label: '2.5–3.0' },
          { color: '#DC2626', label: '<2.5' },
        ].map(l => (
          <div key={l.label} className="legend-item">
            <div className="legend-swatch" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
