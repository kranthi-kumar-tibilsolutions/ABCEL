import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import Dropdown from '../shared/Dropdown';

const CLUSTERS = [
  { id: 'thriving',  label: 'Thriving',  color: '#16A34A' },
  { id: 'polarised', label: 'Polarised', color: '#D97706' },
  { id: 'atrisk',    label: 'At Risk',   color: '#EA580C' },
  { id: 'critical',  label: 'Critical',  color: '#DC2626' },
];

export default function FilterDrawer() {
  const { isFiltersOpen, setIsFiltersOpen, activeFilters, setActiveFilters, meta, businesses, units } = useContext(AppContext);

  const [local, setLocal] = useState(activeFilters);

  useEffect(() => {
    if (isFiltersOpen) setLocal(activeFilters);
  }, [isFiltersOpen]);

  if (!isFiltersOpen) return null;

  const selectedClusters = local.clusters || [];
  const minScore         = local.minScore  ?? 0;
  const selectedCompany  = local.company   || 'all';
  const selectedBU       = local.bu        || 'all';

  const companyList = businesses ? businesses.map(b => b.name) : [];
  const buList      = selectedCompany !== 'all' && units
    ? units.filter(u => u.business === selectedCompany).map(u => u.name)
    : [];

  const toggleCluster = (id) =>
    setLocal(prev => ({
      ...prev,
      clusters: selectedClusters.includes(id)
        ? selectedClusters.filter(c => c !== id)
        : [...selectedClusters, id],
    }));

  const apply = () => { setActiveFilters(local); setIsFiltersOpen(false); };
  const clear = () => { setActiveFilters({}); setLocal({}); setIsFiltersOpen(false); };

  const activeCount =
    (selectedClusters.length > 0 ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (selectedCompany !== 'all' ? 1 : 0) +
    (selectedBU !== 'all' ? 1 : 0);

  const sectionLabel = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 10,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 999 }}
        onClick={() => setIsFiltersOpen(false)}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 320,
        background: 'var(--bg-card)', zIndex: 1000,
        boxShadow: '-6px 0 32px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'inherit',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Filters</span>
            {activeCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, background: 'var(--blue-primary)', color: '#fff',
                borderRadius: 9999, padding: '2px 7px',
              }}>{activeCount} active</span>
            )}
          </div>
          <button
            onClick={() => setIsFiltersOpen(false)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>

          {/* Survey info */}
          {meta && (
            <div style={{
              background: '#EFF6FF', borderRadius: 8, padding: '10px 12px',
              marginBottom: 20, fontSize: 12, color: '#1E40AF',
            }}>
              <strong>{meta.survey_name || 'ABG Vibes 2026'}</strong>
              {' · '}{(meta.total_respondents || 0).toLocaleString()} respondents
              {' · '}{meta.total_units || 0} BUs
            </div>
          )}

          {/* Cluster filter */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 12,
            }}>Filter by Cluster</div>
            {CLUSTERS.map(c => (
              <label key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                background: selectedClusters.includes(c.id) ? '#F8FAFC' : 'transparent',
                border: `1px solid ${selectedClusters.includes(c.id) ? c.color + '55' : 'transparent'}`,
                marginBottom: 6, transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={selectedClusters.includes(c.id)}
                  onChange={() => toggleCluster(c.id)}
                  style={{ accentColor: c.color, width: 15, height: 15 }}
                />
                <span style={{ color: c.color, fontWeight: 600, fontSize: 13, flex: 1 }}>{c.label}</span>
              </label>
            ))}
          </div>

          {/* Company filter */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Filter by Company</div>
            <div className="fdd-full">
              <Dropdown
                variant="filter"
                value={selectedCompany}
                options={['all', ...companyList].map(c => ({ value: c, label: c === 'all' ? 'All Companies' : c }))}
                onChange={v => setLocal(prev => ({ ...prev, company: v, bu: 'all' }))}
              />
            </div>
          </div>

          {/* BU filter — only active when a company is selected */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...sectionLabel, color: selectedCompany === 'all' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
              Filter by Business Unit
            </div>
            <div className="fdd-full" style={{ opacity: selectedCompany === 'all' ? 0.45 : 1, pointerEvents: selectedCompany === 'all' ? 'none' : 'auto' }}>
              <Dropdown
                variant="filter"
                value={selectedBU}
                options={['all', ...buList].map(b => ({ value: b, label: b === 'all' ? 'All Business Units' : b }))}
                onChange={v => setLocal(prev => ({ ...prev, bu: v }))}
              />
            </div>
            {selectedCompany === 'all' && (
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>
                Select a company first to filter by BU.
              </p>
            )}
          </div>

          {/* Min score filter */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>Minimum Score</span>
              <span style={{
                fontSize: 14, fontWeight: 800, color: 'var(--blue-primary)',
                background: '#EFF6FF', borderRadius: 6, padding: '2px 8px',
              }}>{(+minScore).toFixed(1)}</span>
            </div>
            <input
              type="range" min="0" max="5" step="0.1"
              value={minScore}
              onChange={e => setLocal(prev => ({ ...prev, minScore: +e.target.value }))}
              style={{ width: '100%', accentColor: 'var(--blue-primary)', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>0.0 — No filter</span><span>5.0</span>
            </div>
          </div>

        </div>

        {/* Footer buttons */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={clear}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              border: '1px solid var(--border)', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', fontFamily: 'inherit',
            }}
          >Clear All</button>
          <button
            onClick={apply}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 8,
              background: 'var(--blue-primary)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: 700, fontFamily: 'inherit',
            }}
          >Apply Filters</button>
        </div>
      </div>
    </>
  );
}
