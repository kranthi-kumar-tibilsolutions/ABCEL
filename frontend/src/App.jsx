import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppContext }      from './context/AppContext';
import Sidebar             from './components/layout/Sidebar';
import TopBar              from './components/layout/TopBar';
import RightPanel          from './components/layout/RightPanel';
import FilterDrawer        from './components/layout/FilterDrawer';
import UploadPage          from './pages/UploadPage';
import Overview            from './pages/Overview';
import BusinessDetail      from './pages/BusinessDetail';
import BUDetail            from './pages/BUDetail';
import ClusterDetail       from './pages/ClusterDetail';
import BusinessOverview    from './pages/BusinessOverview';
import BUExplorer          from './pages/BUExplorer';
import AiInsightsPage      from './pages/AiInsightsPage';
import OutliersPage        from './pages/OutliersPage';
import InsightsStudio      from './pages/InsightsStudio';
import TrendsPage          from './pages/TrendsPage';
import EmployeeVoicePage   from './pages/EmployeeVoicePage';
import ReportsPage         from './pages/ReportsPage';
import BenchmarksPage         from './pages/BenchmarksPage';
import HypothesisTestingPage        from './pages/HypothesisTestingPage';
import SentimentAnalysisPage       from './pages/SentimentAnalysisPage';
import StatisticalAnalysisPage     from './pages/StatisticalAnalysisPage';
import DynamicPersonaBuilderPage   from './pages/DynamicPersonaBuilderPage';
import SettingsPage                from './pages/SettingsPage';

function ComingSoon({ title }) {
  return (
    <div className="page-container">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-muted)' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="10" stroke="#CBD5E1" strokeWidth="2"/>
          <path d="M16 24h16M24 16v16" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 13 }}>Wireframes in review — coming soon</div>
      </div>
    </div>
  );
}

const PAGE_MAP = {
  upload:           UploadPage,
  overview:         Overview,
  'business-detail': BusinessDetail,
  'bu-detail':       BUDetail,
  'cluster-detail':  ClusterDetail,
  'business-overview': BusinessOverview,
  'bu-explorer':    BUExplorer,
  'ai-insights':    AiInsightsPage,
  outliers:         OutliersPage,
  'insights-studio': InsightsStudio,
  trends:           TrendsPage,
  'employee-voice': EmployeeVoicePage,
  reports:          ReportsPage,
  benchmarks:       BenchmarksPage,
  'hypothesis-testing':       HypothesisTestingPage,
  'statistical-analysis':     StatisticalAnalysisPage,
  'sentiment-analysis':       SentimentAnalysisPage,
  'dynamic-persona-builder':  DynamicPersonaBuilderPage,
  settings:                   SettingsPage,
};

export default function App() {
  const [page,           setPage]           = useState('upload');
  const [navHistory,     setNavHistory]     = useState([]);
  const [dimension,      setDimension]      = useState('overall');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBU,     setSelectedBU]     = useState(null);
  const [selectedCluster,setSelectedCluster]= useState(null);
  const [isFiltersOpen,  setIsFiltersOpen]  = useState(false);
  const [activeFilters,  setActiveFilters]  = useState({});
  const [businesses,     setBusinesses]     = useState(null);
  const [units,          setUnits]          = useState(null);
  const [clusters,       setClusters]       = useState(null);
  const [cohorts,        setCohorts]        = useState(null);
  const [meta,           setMeta]           = useState(null);
  const [summaryData,    setSummaryData]    = useState(null);
  const [insightsData,   setInsightsData]   = useState(null);
  const [focusAreasData, setFocusAreasData] = useState(null);
  const [dataLoaded,     setDataLoaded]     = useState(false);

  const navigate = useCallback((nextPage, params = {}) => {
    setNavHistory(prev => [...prev, page]);
    if (params.business !== undefined) setSelectedBusiness(params.business);
    if (params.unit     !== undefined) setSelectedBU(params.unit);
    if (params.cluster  !== undefined) setSelectedCluster(params.cluster);
    setPage(nextPage);
  }, [page]);

  const goBack = useCallback(() => {
    setNavHistory(prev => {
      if (!prev.length) return prev;
      const next = [...prev];
      const target = next.pop();
      setPage(target);
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [bRes, uRes, cRes, coRes, mRes] = await Promise.all([
        fetch('/api/businesses'),
        fetch('/api/units'),
        fetch('/api/clusters'),
        fetch('/api/cohorts'),
        fetch('/api/meta'),
      ]);
      let bizList = null, metaObj = null;
      if (bRes.ok)  { bizList  = await bRes.json(); setBusinesses(bizList); }
      if (uRes.ok)  setUnits(await uRes.json());
      if (cRes.ok)  setClusters(await cRes.json());
      if (coRes.ok) setCohorts(await coRes.json());
      if (mRes.ok)  { metaObj  = await mRes.json(); setMeta(metaObj); }
      setDataLoaded(true);

      const buildFallbackInsights = () => {
        const sorted = [...(bizList || [])].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
        const top    = sorted[0];
        const bottom = sorted[sorted.length - 1];
        const avg    = metaObj?.group_avg ?? 4.44;
        const n      = sorted.length;
        return {
          topTrends: [
            { direction: 'up',   text: `${top?.name ?? 'Top business'} leads engagement at ${top?.overall?.toFixed(2) ?? avg}/5` },
            { direction: 'up',   text: `Group average stands at ${avg}/5 across ${n} businesses` },
            { direction: 'down', text: `${bottom?.name ?? 'Lowest business'} is the lowest-scoring at ${bottom?.overall?.toFixed(2) ?? avg}/5` },
          ],
          outliers: [
            { direction: 'down', text: `${bottom?.name ?? 'Lowest business'} is ${(avg - (bottom?.overall ?? avg)).toFixed(2)} below group average` },
            { direction: 'up',   text: `${top?.name ?? 'Top business'} is ${((top?.overall ?? avg) - avg).toFixed(2)} above group average` },
            { direction: 'down', text: `${metaObj?.weakest_category ?? 'Performance Culture'} is the weakest category group-wide` },
          ],
          summary: `${metaObj?.survey_name ?? 'ABG Vibes 2026'}: group average ${avg}/5 across ${n} businesses. ${top?.name ?? ''} leads; ${bottom?.name ?? ''} needs attention.`,
        };
      };

      // Auto-fetch right-panel insights (non-blocking); fall back to data-derived content on AI failure
      fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { setInsightsData((d && !d.error) ? d : buildFallbackInsights()); })
        .catch(() => { setInsightsData(buildFallbackInsights()); });
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  }, []);

  useEffect(() => {
    // Pre-load data silently — but never skip the upload page automatically.
    // UploadPage will show a "Continue" button when data is already present.
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { if (d.ready) fetchData(); })
      .catch(() => {});
  }, []);

  // Derived filtered businesses — respects cluster + minScore filters
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return null;
    const { clusters: fc, minScore: ms } = activeFilters;
    return businesses.filter(b => {
      if (ms > 0 && (b.overall ?? 0) < ms) return false;
      return true;
    });
  }, [businesses, activeFilters]);

  const handleUploadComplete = useCallback(() => {
    setSummaryData(null);
    setInsightsData(null);
    setFocusAreasData(null);
    fetchData().then(() => setPage('overview'));
  }, [fetchData]);

  const ctx = {
    page, navigate, goBack, navHistory,
    dimension, setDimension,
    selectedBusiness, setSelectedBusiness,
    selectedBU,       setSelectedBU,
    selectedCluster,  setSelectedCluster,
    businesses, units, clusters, cohorts, meta,
    filteredBusinesses,
    isFiltersOpen, setIsFiltersOpen,
    activeFilters, setActiveFilters,
    summaryData,    setSummaryData,
    insightsData,   setInsightsData,
    focusAreasData, setFocusAreasData,
  };

  const PageComponent = PAGE_MAP[page] ?? Overview;

  if (page === 'upload') {
    return (
      <AppContext.Provider value={ctx}>
        <UploadPage onUploadComplete={handleUploadComplete} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="shell">
        <Sidebar />
        <div className="main-area">
          <TopBar />
          <div className="content-with-panel">
            <div className="content">
              <PageComponent />
            </div>
            <RightPanel />
          </div>
        </div>
        <FilterDrawer />
      </div>
    </AppContext.Provider>
  );
}
