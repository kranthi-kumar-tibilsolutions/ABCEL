import { useContext, useState, useMemo } from 'react';
import { AppContext } from '../../../context/AppContext';

const CATEGORY_COLORS = {
  'Engagement':         '#F97316',
  'Onboarding':         '#2563EB',
  'Wellbeing':          '#16A34A',
  'Performance Culture':'#7C3AED',
  'Leadership':         '#0891B2',
  'Communication':      '#D97706',
};

function scoreBar(score, max = 5) {
  const pct   = Math.max(0, Math.min(100, ((score - 1) / (max - 1)) * 100));
  const color = score >= 4.0 ? '#16A34A' : score >= 3.0 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

export default function DecompositionTree() {
  const { businesses, navigate } = useContext(AppContext);
  const [expandedBiz, setExpanded] = useState(null);

  const sorted = useMemo(() => {
    if (!businesses?.length) return [];
    return [...businesses].sort((a, b) => (b.overall ?? b.score ?? 0) - (a.overall ?? a.score ?? 0));
  }, [businesses]);

  if (!sorted.length) return null;

  return (
    <div className="chart-card">
      <div className="chart-title">Decomposition Tree — Business × Category</div>
      <div className="decomp-tree">
        <div className="decomp-root">
          <div className="decomp-root-label">ABG Group</div>
          {sorted[0] && (
            <div className="decomp-root-score">
              {(sorted.reduce((s, b) => s + (b.overall ?? b.score ?? 0), 0) / sorted.length).toFixed(2)}
            </div>
          )}
        </div>
        <div className="decomp-rows">
          {sorted.map((biz) => {
            const score = +(biz.overall ?? biz.score ?? 0);
            const isExpanded = expandedBiz === biz.name;
            const cats = biz.categories ? Object.entries(biz.categories) : [];
            return (
              <div key={biz.name} className="decomp-biz-row">
                <div
                  className="decomp-biz-header"
                  onClick={() => setExpanded(isExpanded ? null : biz.name)}
                >
                  <span className="decomp-expand">{isExpanded ? '▾' : '▸'}</span>
                  <span
                    className="decomp-biz-name"
                    onClick={(e) => { e.stopPropagation(); navigate('business-detail', { business: biz.name }); }}
                    title={biz.name}
                  >
                    {biz.name}
                  </span>
                  <div className="decomp-score-bar" style={{ flex: 1 }}>
                    {scoreBar(score)}
                  </div>
                  {biz.rank && (
                    <span className="decomp-rank">#{biz.rank}</span>
                  )}
                </div>

                {isExpanded && cats.length > 0 && (
                  <div className="decomp-categories">
                    {cats.map(([cat, val]) => (
                      <div key={cat} className="decomp-cat-row">
                        <span
                          className="decomp-cat-dot"
                          style={{ background: CATEGORY_COLORS[cat] || '#6B7280' }}
                        />
                        <span className="decomp-cat-name">{cat}</span>
                        <div className="decomp-score-bar" style={{ flex: 1 }}>
                          {scoreBar(+(val ?? 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
