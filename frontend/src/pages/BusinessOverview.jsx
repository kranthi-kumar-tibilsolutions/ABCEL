import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Badge      from '../components/shared/Badge';

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

function rankTheme(rank, total) {
  const pct = rank / total;
  if (pct <= 0.33) return { border: '#4ADE80', shadow: 'rgba(74,222,128,0.18)',  bg: 'rgba(74,222,128,0.06)',  text: '#16A34A' };
  if (pct <= 0.66) return { border: '#FCD34D', shadow: 'rgba(252,211,77,0.18)',  bg: 'rgba(252,211,77,0.06)',  text: '#B45309' };
  return              { border: '#FCA5A5', shadow: 'rgba(252,165,165,0.18)',  bg: 'rgba(252,165,165,0.06)', text: '#DC2626' };
}

const SORT_OPTIONS = [
  { field: 'score',      label: 'Engagement Score' },
  { field: 'responses', label: 'No. of Responses'  },
];

function SortArrow({ dir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
      {dir === 'asc'
        ? <path d="M5 2L9 8H1L5 2Z" fill="currentColor"/>
        : <path d="M5 8L1 2H9L5 8Z" fill="currentColor"/>}
    </svg>
  );
}

export default function BusinessOverview() {
  const { businesses, filteredBusinesses, navigate, setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([{ label: 'Business Overview' }]);
  }, []);

  const [sortField, setSortField] = useState('score');
  const [sortDir,   setSortDir]   = useState('desc');

  const list = filteredBusinesses ?? businesses ?? [];

  if (!list.length) return (
    <div className="page-container">
      <p style={{ color: 'var(--text-muted)', padding: 24 }}>No businesses match the current filters.</p>
    </div>
  );

  const handleSort = (field) => {
    if (field === sortField) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...list].sort((a, b) => {
    const va = sortField === 'score'
      ? +(a.overall ?? a.score ?? 0)
      : +(a.respondent_count ?? 0);
    const vb = sortField === 'score'
      ? +(b.overall ?? b.score ?? 0)
      : +(b.respondent_count ?? 0);
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const LEGEND = [
    { color: '#4ADE80', label: 'Top 33%'    },
    { color: '#FCD34D', label: 'Mid 34%'    },
    { color: '#FCA5A5', label: 'Bottom 33%' },
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="chart-card" style={{ padding: '14px 28px 28px', background: '#F1F5F9', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header row — legend left, sort right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0, border: `1.5px solid ${l.color}` }} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Sort */}
          <div className="biz-sort-row">
            <span className="biz-sort-label">Sort by</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.field}
                className={`biz-sort-btn${sortField === opt.field ? ' active' : ''}`}
                onClick={() => handleSort(opt.field)}
              >
                {opt.label}
                {sortField === opt.field && <SortArrow dir={sortDir} />}
              </button>
            ))}
          </div>
        </div>

        <div className="biz-cards-grid">
          {sorted.map((biz, idx) => {
            const sc    = +(biz.overall ?? biz.score ?? 0);
            const theme = rankTheme(idx + 1, sorted.length);
            return (
              <div
                key={biz.name}
                className="biz-overview-card"
                onClick={() => navigate('business-detail', { business: biz.name })}
                style={{
                  borderLeft: `4px solid ${theme.border}`,
                  background: `linear-gradient(135deg, ${theme.bg} 0%, var(--bg-card) 60%)`,
                  boxShadow: `0 4px 16px ${theme.shadow}, 0 1px 4px rgba(0,0,0,0.06)`,
                }}
              >
                {/* Rank + Score circle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.text }}>#{biz.rank ?? '—'}</span>
                  {/* Score circle */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: `2.5px solid ${theme.border}`,
                    background: theme.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: theme.text, lineHeight: 1 }}>{sc.toFixed(2)}</span>
                  </div>
                </div>
                {/* Name */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={biz.name}>{biz.name}</div>
                {/* Badge + Respondents */}
                {biz.respondent_count && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {biz.respondent_count.toLocaleString()} respondents
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
