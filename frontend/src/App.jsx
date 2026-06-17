import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Lottie from 'lottie-react';
import loaderAnim from './assets/loader.json';
import { AppContext }      from './context/AppContext';
import { getAuth, setAuth, apiFetch } from './utils/api';
import AppHeader           from './components/layout/AppHeader';
import Sidebar             from './components/layout/Sidebar';
import TopBar              from './components/layout/TopBar';
import RightPanel          from './components/layout/RightPanel';
import FilterDrawer        from './components/layout/FilterDrawer';
import LoginPage           from './pages/LoginPage';
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
  const [auth,           setAuthState]      = useState(null);
  const [authChecked,    setAuthChecked]    = useState(false);
  const [loggingOut,     setLoggingOut]     = useState(false);
  const [page,           setPage]           = useState('upload');
  const [navHistory,     setNavHistory]     = useState([]);
  const contentRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
    check();
    el.addEventListener('scroll', check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [page]);
  const [dpbTopbarSlot,  setDpbTopbarSlot]  = useState(null);
  const [dimension,      setDimension]      = useState('overall');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBU,     setSelectedBU]     = useState(null);
  const [selectedCluster,setSelectedCluster]= useState(null);
  const [isFiltersOpen,  setIsFiltersOpen]  = useState(false);
  const [dpbFilters,     setDpbFilters]     = useState({ business: 'All', country: 'All', inactive: 'No' });
  const [dpbResetSignal, setDpbResetSignal] = useState(0);
  const [saFilters,     setSaFilters]     = useState({ business: 'All', inactive: 'No' });
  const [breadcrumb,     setBreadcrumb]     = useState([]);
  const [outliersTopN, setOutliersTopN] = useState(5);
  const [evFilters, setEvFilters] = useState({ cohort: 'All Cohorts', company: 'All', bu: 'All' });
  const [senFilters, setSenFilters] = useState({
    survey: 'Q4 2024 Employee Survey', bu: 'All', dept: 'All',
    location: 'All', tenure: 'All', level: 'All', inactive: 'No',
  });
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [activeFilters,  setActiveFilters]  = useState({});
  const [businesses,     setBusinesses]     = useState(null);
  const [units,          setUnits]          = useState(null);
  const [clusters,       setClusters]       = useState(null);
  const [cohorts,        setCohorts]        = useState(null);
  const [meta,           setMeta]           = useState(null);
  const [summaryData,    setSummaryData]    = useState(null);
  const [insightsData,   setInsightsData]   = useState(null);
  const [focusAreasData, setFocusAreasData] = useState(null);
  const [saCache,              setSaCache]              = useState(null);
  const [activeScreenContext,  setActiveScreenContext]  = useState(null);
  const [dataLoaded,           setDataLoaded]           = useState(false);

  const navigate = useCallback((nextPage, params = {}) => {
    setNavHistory(prev => [...prev, page]);
    if (params.business !== undefined) setSelectedBusiness(params.business);
    if (params.unit     !== undefined) setSelectedBU(params.unit);
    if (params.cluster  !== undefined) setSelectedCluster(params.cluster);
    if (nextPage !== page) setBreadcrumb([]);
    setPage(nextPage);
  }, [page]);

  const goBack = useCallback(() => {
    setNavHistory(prev => {
      if (!prev.length) return prev;
      const next = [...prev];
      const target = next.pop();
      setBreadcrumb([]);
      setPage(target);
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [bRes, uRes, cRes, coRes, mRes] = await Promise.all([
        apiFetch('/api/businesses'),
        apiFetch('/api/units'),
        apiFetch('/api/clusters'),
        apiFetch('/api/cohorts'),
        apiFetch('/api/meta'),
      ]);
      if (bRes.ok)  setBusinesses(await bRes.json());
      if (uRes.ok)  setUnits(await uRes.json());
      if (cRes.ok)  setClusters(await cRes.json());
      if (coRes.ok) setCohorts(await coRes.json());
      if (mRes.ok)  setMeta(await mRes.json());
      setDataLoaded(true);

      // Auto-fetch right-panel insights (non-blocking)
      apiFetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && !d.error) setInsightsData(d); })
        .catch(() => {});
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  }, []);

  // Restore session on load and validate the stored token
  useEffect(() => {
    const stored = getAuth();
    if (!stored) { setAuthChecked(true); return; }
    apiFetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) setAuthState(stored);
        else setAuth(null);
      })
      .catch(() => setAuth(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!auth) return;
    // Pre-load data silently — but never skip the upload page automatically.
    // UploadPage will show a "Continue" button when data is already present.
    apiFetch('/api/status')
      .then(r => r.json())
      .then(d => { if (d.ready) fetchData(); })
      .catch(() => {});
  }, [auth, fetchData]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [page]);

  const handleLogin = useCallback((user, token) => {
    const next = { user, token };
    setAuth(next);
    setAuthState(next);
  }, []);

  const handleLogout = useCallback(() => {
    setLoggingOut(true);
    setTimeout(() => {
      setAuth(null);
      setAuthState(null);
      setBusinesses(null);
      setUnits(null);
      setClusters(null);
      setCohorts(null);
      setMeta(null);
      setDataLoaded(false);
      setSummaryData(null);
      setInsightsData(null);
      setFocusAreasData(null);
      setSaCache(null);
      setPage('upload');
      setLoggingOut(false);
    }, 3000);
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
    dpbFilters, setDpbFilters,
    dpbResetSignal, setDpbResetSignal,
    dpbTopbarSlot, setDpbTopbarSlot,
    saFilters, setSaFilters,
    breadcrumb, setBreadcrumb,
    outliersTopN, setOutliersTopN,
    evFilters, setEvFilters,
    senFilters, setSenFilters,
    activeFilters, setActiveFilters,
    summaryData,    setSummaryData,
    insightsData,   setInsightsData,
    focusAreasData, setFocusAreasData,
    user: auth?.user ?? null,
    logout: handleLogout,
    rightPanelCollapsed, setRightPanelCollapsed,
    saCache, setSaCache,
    activeScreenContext, setActiveScreenContext,
  };

  const PageComponent = PAGE_MAP[page] ?? Overview;

  if (!authChecked) return null;

  const loggingOutOverlay = loggingOut && (
    <div className="login-loading-overlay">
      <Lottie animationData={loaderAnim} loop autoplay style={{ width: 180, height: 60 }} />
      <div className="login-loading-text">Signing out…</div>
    </div>
  );

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const themeClass = auth?.user?.theme && auth.user.theme !== 'abg' ? `theme-${auth.user.theme}` : '';

  if (page === 'upload') {
    return (
      <AppContext.Provider value={ctx}>
        <div className={themeClass}>
          <UploadPage onUploadComplete={handleUploadComplete} />
        </div>
        {loggingOutOverlay}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className={`app-shell ${themeClass}`}>
        <AppHeader />
        <div className="shell">
          <Sidebar />
          <div className="main-area">
            <TopBar />
            <div className="content-with-panel">
              <div className="content" ref={contentRef}>
                <PageComponent />
              </div>
              {showScrollHint && (
                <div className="scroll-hint" onClick={() => contentRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              <RightPanel />
            </div>
          </div>
          <FilterDrawer />
        </div>
        <footer className="app-footer">
          <span>ABG VIBES · v{__APP_VERSION__}</span>
        </footer>
      </div>
      {loggingOutOverlay}
    </AppContext.Provider>
  );
}
