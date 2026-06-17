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
    rightPanelCollapsed, breadcrumb, navigate,
    saFilters, setSaFilters,
    outliersTopN, setOutliersTopN,
    evFilters, setEvFilters,
    senFilters, setSenFilters,
    dpbFilters, setDpbFilters, setDpbResetSignal,
    dpbTopbarSlot,
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

  const isOverviewPage = page === 'overview';
  const isDetailPage = page === 'business-detail' || page === 'bu-detail' || page === 'cluster-detail';

  const renderBreadcrumb = () => (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
      {breadcrumb.map((item, i) => {
        const isLast = i === breadcrumb.length - 1;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
            {isLast
              ? <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 12 }}>{item.label}</span>
              : (
                <button
                  onClick={() => item.page && navigate(item.page, item.params || {})}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                >
                  {item.label}
                </button>
              )
            }
          </span>
        );
      })}
    </nav>
  );

  const renderExportDropdown = () => (
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
  );

  if (page === 'dynamic-persona-builder') {
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8, gap: 8, flexWrap: 'nowrap' }}>
        {breadcrumb?.length > 0 && (
          <div style={{ flexShrink: 0 }}>{renderBreadcrumb()}</div>
        )}
        <div className="topbar-spacer" />
        {dpbTopbarSlot}
      </div>
    );
  }

  if (page === 'statistical-analysis') {
    const saBusinessOpts = businesses?.length
      ? ['All', ...businesses.map(b => b.name)]
      : ['All'];
    const saFiltersCfg = [
      { key: 'business', opts: saBusinessOpts },
      { key: 'inactive', opts: ['No', 'Yes'] },
    ];
    const saLabels = { business: 'Business', inactive: 'Inactive' };
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8, gap: 8 }}>
        {breadcrumb?.length > 0 && (
          <>
            {renderBreadcrumb()}
            <div className="topbar-spacer" />
          </>
        )}
        {saFiltersCfg.map(f => (
          <Dropdown
            key={f.key}
            variant="topbar"
            label={saLabels[f.key]}
            value={saFilters[f.key]}
            options={f.opts.map(o => ({ value: o, label: o }))}
            onChange={v => setSaFilters(prev => ({ ...prev, [f.key]: v }))}
          />
        ))}
        <button
          className="topbar-btn"
          onClick={() => setSaFilters({ business: 'All', inactive: 'No' })}
          title="Reset filters"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    );
  }

  if (page === 'outliers' && breadcrumb?.length) {
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8 }}>
        {renderBreadcrumb()}
        <div className="topbar-spacer" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 600 }}>Show top / bottom</span>
          <select
            value={outliersTopN}
            onChange={e => setOutliersTopN(+e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', color: 'var(--text-primary)' }}
          >
            {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>units</span>
        </div>
        {renderExportDropdown()}
      </div>
    );
  }

  if (page === 'employee-voice' && breadcrumb?.length) {
    const COHORT_OPTIONS = ['All Cohorts', 'Tenure < 2yr', 'Tenure 2–5yr', 'Tenure > 5yr', 'Manager', 'Non-Manager', 'Grade 1–3', 'Grade 4–6', 'Female', 'Male'];
    const companyList = businesses ? ['All', ...businesses.map(b => b.name)] : ['All'];
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8, gap: 8 }}>
        {renderBreadcrumb()}
        <div className="topbar-spacer" />
        <Dropdown
          variant="topbar"
          label="Cohort"
          value={evFilters.cohort}
          options={COHORT_OPTIONS.map(o => ({ value: o, label: o }))}
          onChange={v => setEvFilters(prev => ({ ...prev, cohort: v }))}
        />
        <Dropdown
          variant="topbar"
          label="Company"
          value={evFilters.company}
          options={companyList.map(o => ({ value: o, label: o }))}
          onChange={v => setEvFilters({ cohort: evFilters.cohort, company: v, bu: 'All' })}
        />
        <Dropdown
          variant="topbar"
          label="BU"
          value={evFilters.bu}
          options={['All'].map(o => ({ value: o, label: o }))}
          onChange={v => setEvFilters(prev => ({ ...prev, bu: v }))}
        />
        {renderExportDropdown()}
      </div>
    );
  }

  if (page === 'sentiment-analysis' && breadcrumb?.length) {
    const SEN_FILTERS_CFG = [
      { key: 'survey',   label: 'Survey',   opts: ['Q4 2024 Employee Survey', 'Q3 2024', 'Q2 2024'] },
      { key: 'bu',       label: 'BU',       opts: ['All', 'ABG Corp', 'Tech', 'Operations'] },
      { key: 'dept',     label: 'Dept',     opts: ['All', 'HR', 'Finance', 'Engineering'] },
      { key: 'location', label: 'Location', opts: ['All', 'APAC', 'EMEA', 'Americas'] },
      { key: 'tenure',   label: 'Tenure',   opts: ['All', '0–1 yr', '1–3 yrs', '3+ yrs'] },
      { key: 'level',    label: 'Level',    opts: ['All', 'Junior', 'Mid', 'Senior', 'Lead'] },
      { key: 'inactive', label: 'Inactive', opts: ['No', 'Yes'] },
    ];
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8, gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0 }}>{renderBreadcrumb()}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {SEN_FILTERS_CFG.map(f => (
          <Dropdown
            key={f.key}
            variant="topbar"
            label={f.label}
            value={senFilters[f.key]}
            options={f.opts.map(o => ({ value: o, label: o }))}
            onChange={v => setSenFilters(prev => ({ ...prev, [f.key]: v }))}
          />
        ))}
        <button
          className="topbar-btn"
          onClick={() => setSenFilters({
            survey: 'Q4 2024 Employee Survey', bu: 'All', dept: 'All',
            location: 'All', tenure: 'All', level: 'All', inactive: 'No',
          })}
          title="Reset filters"
        >
          <RotateCcw size={13} />
        </button>
        </div>
      </div>
    );
  }

  if (isDetailPage) {
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8 }}>
        {renderBreadcrumb()}
        <div className="topbar-spacer" />
        {renderExportDropdown()}
      </div>
    );
  }

  if (breadcrumb?.length && !isOverviewPage) {
    return (
      <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8 }}>
        {renderBreadcrumb()}
        <div className="topbar-spacer" />
        {renderExportDropdown()}
      </div>
    );
  }

  return (
    <div className="topbar" style={{ marginRight: rightPanelCollapsed ? 16 : 8 }}>
      {/* Breadcrumb always shown on left */}
      {breadcrumb?.length > 0 && (
        <div style={{ flexShrink: 0 }}>{renderBreadcrumb()}</div>
      )}

      <div className="topbar-spacer" />

      {isOverviewPage && (
        <>
          {/* Filters */}
          <button className="topbar-btn" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal size={13} />
            Filters {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
          </button>

          {/* Compare to dropdown */}
          <Dropdown
            variant="topbar"
            label="Compare to"
            value={compareTo}
            options={compareOptions}
            onChange={setCompareTo}
          />
        </>
      )}

      {/* Survey Wave dropdown */}
      <Dropdown
        variant="topbar"
        label="Survey Wave"
        value={surveyWave}
        options={waveOptions}
        onChange={setSurveyWave}
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
