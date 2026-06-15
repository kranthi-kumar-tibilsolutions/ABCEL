import { useContext, useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, Download, Upload, ChevronDown } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import Dropdown from '../shared/Dropdown';

const PAGE_TITLES = {
  overview:              'Employee Engagement Intelligence',
  'business-detail':     null,
  'bu-detail':           null,
  'cluster-detail':      'Cluster Analysis',
  'business-overview':   'Business Overview',
  'bu-explorer':         'BU Explorer',
  'ai-insights':         'AI Insights',
  outliers:              'Outliers',
  'insights-studio':     'Insights Studio',
  trends:                'Trends',
  'employee-voice':      'Employee Voice',
  reports:                    'Reports',
  benchmarks:                 'Benchmarks',
  'dynamic-persona-builder':  'Dynamic Persona Builder',
  'statistical-analysis':     'Statistical Analysis',
  'sentiment-analysis':       'Sentiment Analysis',
  'hypothesis-testing':       'Hypothesis Testing',
};


export default function TopBar() {
  const {
    setIsFiltersOpen, meta, businesses, activeFilters,
    page, selectedBusiness, selectedBU, selectedCluster,
  } = useContext(AppContext);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [surveyWave, setSurveyWave]         = useState('current');
  const [compareTo, setCompareTo]           = useState('none');
  const exportRef = useRef(null);

  const wave = meta?.survey_name || 'ABG Vibes 2026';

  const filterCount = Object.values(activeFilters || {}).filter(v =>
    Array.isArray(v) ? v.length < 4 : v !== 'all' && v !== 0
  ).length;

  let pageTitle = PAGE_TITLES[page] || 'Dashboard';
  if (page === 'business-detail' && selectedBusiness) pageTitle = selectedBusiness;
  if (page === 'bu-detail'       && selectedBU)       pageTitle = selectedBU;
  if (page === 'cluster-detail'  && selectedCluster)
    pageTitle = `${selectedCluster.charAt(0).toUpperCase() + selectedCluster.slice(1)} Cluster`;

  const subtitleMap = {
    overview:            `Group Overview · ${wave}`,
    'business-detail':   `Business Detail · ${wave}`,
    'bu-detail':         `Business Unit Detail · ${wave}`,
    'cluster-detail':    `Cluster Detail · ${wave}`,
    'business-overview': `All Businesses · ${wave}`,
    'bu-explorer':       `Business Unit Explorer · ${wave}`,
    'ai-insights':       `AI Analysis · ${wave}`,
    outliers:            `Statistical Outliers · ${wave}`,
    'insights-studio':   `Agentic HR Analysis · ${wave}`,
    trends:              `Trend Analysis · ${wave}`,
    'employee-voice':    `Employee Feedback · ${wave}`,
    reports:                   `Reports & Exports · ${wave}`,
    benchmarks:               `Peer Benchmarks · ${wave}`,
    'dynamic-persona-builder':`Persona Builder · ${wave}`,
    'statistical-analysis':   `Statistical Analysis · ${wave}`,
    'sentiment-analysis':     `Sentiment Analysis · ${wave}`,
    'hypothesis-testing':     `Hypothesis Testing · ${wave}`,
  };
  const pageSubtitle = subtitleMap[page] || wave;

  const waveOptions = [
    { value: 'current', label: wave },
    { value: 'divider', label: '── Historical ──', disabled: true },
    { value: 'upload',  label: 'Upload previous wave', disabled: true },
  ];

  const compareOptions = [
    { value: 'none',   label: 'Select wave…' },
    { value: 'upload', label: 'Upload previous wave to enable', disabled: true },
  ];

  const exportOptions = [
    { value: 'csv',   label: '📄  Business Scores (CSV)' },
    { value: 'print', label: '🖨  AI Summary (Print / PDF)' },
  ];

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
    }
    if (showExportMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  const handleExportSelect = async (val) => {
    setShowExportMenu(false);
    if (val === 'csv') {
      try {
        const { default: Papa } = await import('papaparse');
        const csv = Papa.unparse((businesses || []).map(b => ({
          Rank: b.rank, Business: b.name, Overall: b.overall, Band: b.band,
          ...b.categories,
        })));
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'abg_engagement_scores.csv'; a.click();
        URL.revokeObjectURL(url);
      } catch (err) { console.error('Export error:', err); }
    } else if (val === 'print') {
      window.print();
    }
  };

  const handleUploadNew = () => {
    if (window.confirm('Upload a new Excel file? This will replace current data.')) {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
      window.location.reload();
    }
  };

  return (
    <div className="topbar">
      {/* Left — page title */}
      <div className="topbar-title-block">
        <span className="topbar-page-title">{pageTitle}</span>
        {page === 'overview'
          ? <span className="topbar-page-sub">
              <span style={{ color: 'var(--blue-primary)', fontWeight: 700 }}>Listen.</span>
              {' Understand. Lead.'}
            </span>
          : <span className="topbar-page-sub">{pageSubtitle}</span>
        }
      </div>

      <div className="topbar-spacer" />

      {/* Filters */}
      <button className="topbar-btn" onClick={() => setIsFiltersOpen(true)}>
        <SlidersHorizontal size={13} />
        Filters {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
      </button>

      {/* Survey Wave dropdown */}
      <Dropdown
        variant="topbar"
        label="Survey Wave"
        value={surveyWave}
        options={waveOptions}
        onChange={setSurveyWave}
      />

      {/* Compare to dropdown */}
      <Dropdown
        variant="topbar"
        label="Compare to"
        value={compareTo}
        options={compareOptions}
        onChange={setCompareTo}
      />

      {/* Reset */}
      <button className="topbar-btn" onClick={() => window.location.reload()}>
        <RotateCcw size={13} />
        Reset
      </button>

      {/* Export */}
      <div className="tb-dropdown" ref={exportRef}>
        <button className="topbar-btn" onClick={() => setShowExportMenu(o => !o)}>
          <Download size={13} />
          Export
          <ChevronDown size={11} style={{ transition: 'transform 0.2s', transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
        {showExportMenu && (
          <div className="tb-dropdown-menu" style={{ right: 0, left: 'auto' }}>
            {exportOptions.map(opt => (
              <button key={opt.value} className="tb-dropdown-item" onClick={() => handleExportSelect(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload */}
      <button className="topbar-btn topbar-btn-primary" onClick={handleUploadNew}>
        <Upload size={13} />
        Upload New Data
      </button>
    </div>
  );
}
