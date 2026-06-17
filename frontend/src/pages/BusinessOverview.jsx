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
  const { businesses, filteredBusinesses, navigate, setBreadcrumb, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Overview', page: 'overview' },
      { label: 'All Businesses' },
    ]);
  }, []);

  const [sortField, setSortField] = useState('score');
  const [sortDir,   setSortDir]   = useState('desc');

  const list = filteredBusinesses ?? businesses ?? [];

  useEffect(() => {
    setActiveScreenContext({
      tab: 'business_overview',
      visible_businesses: list.slice(0, 15).map(b => ({
        name: b.name, overall: b.overall, band: b.band, respondents: b.respondent_count,
      })),
      sort: { field: sortField, dir: sortDir },
    });
  }, [list, sortField, sortDir]);

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

  return (
    <div className="page-container">
      <div className="page-header">
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
        {sorted.map((biz) => {
          const sc = +(biz.overall ?? biz.score ?? 0);
          return (
            <div
              key={biz.name}
              className="biz-overview-card"
              onClick={() => navigate('business-detail', { business: biz.name })}
            >
              <div className="biz-card-top">
                <div className="biz-card-rank" style={{ color: scoreColor(sc) }}>
                  #{biz.rank ?? '—'}
                </div>
                <div className="biz-card-score" style={{ color: scoreColor(sc) }}>
                  {sc.toFixed(2)}
                </div>
              </div>
              <div className="biz-card-name" title={biz.name}>{biz.name}</div>
              <div style={{ marginTop: 8 }}>
                <Badge status={biz.band} />
              </div>
              {biz.respondent_count && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {biz.respondent_count.toLocaleString()} respondents
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
