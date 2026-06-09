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
import BenchmarksPage      from './pages/BenchmarksPage';

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
      if (bRes.ok)  setBusinesses(await bRes.json());
      if (uRes.ok)  setUnits(await uRes.json());
      if (cRes.ok)  setClusters(await cRes.json());
      if (coRes.ok) setCohorts(await coRes.json());
      if (mRes.ok)  setMeta(await mRes.json());
      setDataLoaded(true);

      // Auto-fetch right-panel insights (non-blocking)
      fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && !d.error) setInsightsData(d); })
        .catch(() => {});
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  }, []);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        if (d.ready) {
          fetchData();
          setPage('overview');
        }
      })
      .catch(() => {});
  }, []);

  // Derived filtered businesses — respects cluster + minScore filters
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return null;
    const { clusters: fc, minScore: ms } = activeFilters;
    return businesses.filter(b => {
      if (fc?.length && !fc.includes(b.cluster)) return false;
      if (ms > 0 && (b.overall ?? b.score ?? 0) < ms) return false;
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
