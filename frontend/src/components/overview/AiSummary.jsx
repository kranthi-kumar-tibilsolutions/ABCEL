import { useState, useContext, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { apiFetch } from '../../utils/api';
import Skeleton from '../shared/Skeleton';

function AiBadge() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, background: '#2563EB',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.02em' }}>AI</span>
    </div>
  );
}

function SparkleCircle() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%',
      background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l1.5 5.5H19l-4.5 3 1.5 5.5L12 13l-4 3 1.5-5.5L5 7.5h5.5L12 2z"
          fill="#A5B4FC" stroke="#6366F1" strokeWidth="1" strokeLinejoin="round"/>
        <circle cx="19" cy="5" r="1.5" fill="#6366F1" opacity="0.6"/>
        <circle cx="5" cy="18" r="1" fill="#6366F1" opacity="0.4"/>
      </svg>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="7.5" fill="#2563EB"/>
      <path d="M5 8l2.5 2.5L11 5.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DashboardIllustration() {
  return (
    <svg width="130" height="90" viewBox="0 0 130 90" fill="none">
      {/* Card bg */}
      <rect x="0" y="0" width="130" height="90" rx="10" fill="#EEF2FF"/>

      {/* Bar chart bars */}
      <rect x="10" y="50" width="10" height="30" rx="2" fill="#A5B4FC"/>
      <rect x="24" y="35" width="10" height="45" rx="2" fill="#6366F1"/>
      <rect x="38" y="42" width="10" height="38" rx="2" fill="#A5B4FC"/>
      <rect x="52" y="28" width="10" height="52" rx="2" fill="#6366F1"/>
      <rect x="66" y="38" width="10" height="42" rx="2" fill="#A5B4FC"/>

      {/* Pie chart */}
      <circle cx="105" cy="30" r="18" fill="#C7D2FE" stroke="#6366F1" strokeWidth="1.5"/>
      <path d="M105 30 L105 12 A18 18 0 0 1 121 42 Z" fill="#6366F1"/>
      <path d="M105 30 L121 42 A18 18 0 0 1 88 38 Z" fill="#818CF8"/>

      {/* Lines (text placeholders) */}
      <rect x="82" y="54" width="38" height="4" rx="2" fill="#C7D2FE"/>
      <rect x="82" y="62" width="30" height="4" rx="2" fill="#C7D2FE"/>
      <rect x="82" y="70" width="34" height="4" rx="2" fill="#C7D2FE"/>

      {/* Robot */}
      <rect x="14" y="4" width="16" height="13" rx="3" fill="#6366F1"/>
      <circle cx="19" cy="10" r="2" fill="white"/>
      <circle cx="25" cy="10" r="2" fill="white"/>
      <rect x="18" y="17" width="8" height="7" rx="1.5" fill="#818CF8"/>
      <line x1="22" y1="24" x2="22" y2="29" stroke="#818CF8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="20" x2="11" y2="24" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="30" y1="20" x2="33" y2="24" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function AiSummary({ maxBullets = 3 }) {
  const { summaryData, setSummaryData, dimension, navigate } = useContext(AppContext);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [genTime,      setGenTime]      = useState(null);
  const [showWhy,      setShowWhy]      = useState(false);
  const [bulletsOpen,  setBulletsOpen]  = useState(false);

  useEffect(() => {
    // summaryData is stored in context — it persists across navigations.
    // Tag it with the dimension it was generated for so remounting the
    // component never triggers a refetch for the same dimension.
    if (summaryData?._dim === dimension) return;
    setSummaryData(null);
    setShowWhy(false);
    setLoading(true);
    setError(null);
    apiFetch('/api/summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dimension }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setSummaryData({ ...d, _dim: dimension });
        setGenTime(new Date());
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Could not load summary.');
        setLoading(false);
      });
  }, [dimension]);

  const { bullets: allBullets = [], takeaway = '', whyMatters = '' } = summaryData || {};
  const bullets = allBullets.slice(0, maxBullets);

  const timeAgo = genTime
    ? `Generated ${Math.max(1, Math.round((Date.now() - genTime) / 60000))} min ago`
    : 'Generated just now';

  return (
    <div className="ais-card">

      {/* ── Loading state ── */}
      {loading && (
        <div className="ais-loading-state">
          <div className="ais-col-left">
            <div className="ais-top-row">
              <AiBadge />
              <div>
                <div className="ais-title">AI EXECUTIVE SUMMARY</div>
                <div className="ais-sub">Generating insights…</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}><Skeleton count={4} height={10} /></div>
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <div className="ais-loading-state">
          <div className="ais-col-left">
            <div className="ais-top-row">
              <AiBadge />
              <div>
                <div className="ais-title">AI EXECUTIVE SUMMARY</div>
                <div className="ais-sub" style={{ color: '#DC2626' }}>Failed to generate</div>
              </div>
            </div>
          </div>
          <div className="ais-error">
            {error}
            <button className="ais-retry-btn" onClick={() => { setSummaryData(null); setError(null); }}>Retry</button>
          </div>
        </div>
      )}

      {/* ── Loaded state ── */}
      {summaryData && !loading && (
        <>
          {/* grid: header | [bullets] | takeaway */}
          <div className="ais-grid" style={{ gridTemplateColumns: bulletsOpen ? '200px minmax(0,1fr) minmax(0,1fr)' : '200px minmax(0,1fr)' }}>

            {/* Col 1: badge + title + sparkle + view button + expand arrow */}
            <div className="ais-col-left">
              <div className="ais-top-row">
                <AiBadge />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ais-title">AI EXECUTIVE SUMMARY</div>
                  <div className="ais-sub">{timeAgo}</div>
                </div>
                <button
                  className="ais-refresh-btn"
                  title="Regenerate"
                  onClick={() => { setSummaryData(null); setError(null); setGenTime(null); }}
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  className="ais-expand-btn"
                  title={bulletsOpen ? 'Collapse findings' : 'Expand findings'}
                  onClick={() => setBulletsOpen(v => !v)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                    style={{ transition: 'transform 0.2s', transform: bulletsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M5 2.5L9.5 7L5 11.5"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className="ais-intro-block">
                <SparkleCircle />
                <p className="ais-intro-text">Here&rsquo;s what I found from this survey wave.</p>
              </div>
              <div style={{ flex: 1 }} />
              <button className="ais-view-btn" onClick={() => navigate && navigate('ai-insights')}>View full summary &rarr;</button>
            </div>

            {/* Col 2: bullet findings — only when expanded */}
            {bulletsOpen && (
              <div className="ais-col-bullets">
                <ul className="ais-bullets">
                  {bullets.map((b, i) => (
                    <li key={i} className="ais-bullet">
                      <CheckIcon />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Col 3 (or Col 2 when collapsed): key takeaway */}
            <div className="ais-col-takeaway">
              {takeaway && (
                <>
                  <div className="ais-takeaway-title">Key Takeaway</div>
                  <p className="ais-takeaway-text">{takeaway}</p>
                </>
              )}
              {whyMatters && (
                <>
                  <button className="ais-why-link" onClick={() => setShowWhy(v => !v)}>
                    {showWhy ? 'Hide ↑' : 'Why this matters →'}
                  </button>
                  {showWhy && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8, padding: '8px 10px', background: '#EFF6FF', borderRadius: 6 }}>
                      {whyMatters}
                    </p>
                  )}
                </>
              )}
            </div>

          </div>

        </>
      )}
    </div>
  );
}
