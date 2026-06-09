import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

export default function TopBar() {
  const { setIsFiltersOpen, meta, businesses, activeFilters } = useContext(AppContext);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const wave = meta?.survey_name || 'ABG Vibes 2026';
  const filterCount = Object.values(activeFilters || {}).filter(v =>
    Array.isArray(v) ? v.length < 4 : v !== 'all' && v !== 0
  ).length;

  const handleExportCSV = async () => {
    setShowExportMenu(false);
    try {
      const { default: Papa } = await import('papaparse');
      const csv = Papa.unparse((businesses || []).map(b => ({
        Rank: b.rank, Business: b.name, Overall: b.overall, Band: b.band,
        ...b.categories
      })));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'abg_engagement_scores.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  const handleUploadNew = () => {
    if (window.confirm('Upload a new Excel file? This will replace current data.')) {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
      window.location.reload();
    }
  };

  return (
    <div className="topbar">
      <button
        className="topbar-btn"
        onClick={() => setIsFiltersOpen(true)}
      >
        <span>⚙</span> Filters {filterCount > 0 && `(${filterCount})`}
      </button>

      <div className="topbar-group">
        <span className="topbar-label">Survey Wave</span>
        <select className="topbar-select" defaultValue={wave}>
          <option>{wave}</option>
          <option disabled>── Historical ──</option>
          <option disabled>Upload previous wave to compare</option>
        </select>
      </div>

      <div className="topbar-group">
        <span className="topbar-label">Compare to</span>
        <select className="topbar-select" defaultValue="none">
          <option value="none">Select wave…</option>
          <option disabled>Upload previous wave to enable</option>
        </select>
      </div>

      <div className="topbar-spacer" />

      <button className="topbar-btn" onClick={() => window.location.reload()}>
        ↺ Reset
      </button>

      <div style={{ position: 'relative' }}>
        <button className="topbar-btn" onClick={() => setShowExportMenu(m => !m)}>
          ⬇ Export ▾
        </button>
        {showExportMenu && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 50,
            minWidth: 200, overflow: 'hidden'
          }}>
            <button onClick={handleExportCSV} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Business Scores (CSV)
            </button>
            <button onClick={handlePrint} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              AI Summary (Print / PDF)
            </button>
          </div>
        )}
      </div>

      <button className="topbar-btn topbar-btn-primary" onClick={handleUploadNew}>
        ↑ Upload New Data
      </button>
    </div>
  );
}
