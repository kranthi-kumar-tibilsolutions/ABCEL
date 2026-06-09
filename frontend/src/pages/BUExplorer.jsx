import { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Badge      from '../components/shared/Badge';
import Breadcrumb from '../components/shared/Breadcrumb';

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

export default function BUExplorer() {
  const { units, businesses, navigate } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [filterBiz, setFilterBiz] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  const bizList = useMemo(() => {
    const names = new Set(units?.map(u => u.business).filter(Boolean));
    return Array.from(names).sort();
  }, [units]);

  const filtered = useMemo(() => {
    if (!units) return [];
    let list = units.filter(u => {
      const matchName = !search || u.name?.toLowerCase().includes(search.toLowerCase());
      const matchBiz  = !filterBiz || u.business === filterBiz;
      return matchName && matchBiz;
    });
    list = list.slice().sort((a, b) => {
      let av, bv;
      if (sortBy === 'score') {
        av = +(a.score ?? a.overall ?? 0);
        bv = +(b.score ?? b.overall ?? 0);
      } else if (sortBy === 'name') {
        av = a.name ?? '';
        bv = b.name ?? '';
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      } else {
        av = a.business ?? '';
        bv = b.business ?? '';
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [units, search, filterBiz, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortArrow = ({ col }) => (
    <span style={{ marginLeft: 4, opacity: sortBy === col ? 1 : 0.3 }}>
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'BU Explorer' },
      ]} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Business Unit Explorer</h1>
          <p className="page-sub">{filtered.length} of {units?.length ?? 0} units</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bu-filters">
        <input
          className="bu-search"
          placeholder="Search business units…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="bu-filter-select"
          value={filterBiz}
          onChange={e => setFilterBiz(e.target.value)}
        >
          <option value="">All Businesses</option>
          {bizList.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Table */}
      <table className="data-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>#</th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>
              Unit <SortArrow col="name" />
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('business')}>
              Business <SortArrow col="business" />
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('score')}>
              Score <SortArrow col="score" />
            </th>
            <th>Band</th>
            <th>Respondents</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u, i) => {
            const sc = +(u.score ?? u.overall ?? 0);
            return (
              <tr
                key={u.name + i}
                onClick={() => navigate('bu-detail', { business: u.business, unit: u.name })}
                style={{ cursor: 'pointer' }}
              >
                <td>{i+1}</td>
                <td>{u.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.business ?? '—'}</td>
                <td style={{ color: scoreColor(sc), fontWeight: 700 }}>
                  {sc > 0 ? sc.toFixed(2) : '—'}
                </td>
                <td><Badge status={u.band} /></td>
                <td>{u.respondent_count?.toLocaleString() ?? '—'}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No units found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
