import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import Skeleton from '../shared/Skeleton';

export default function AiSummary() {
  const { summaryData, setSummaryData, dimension } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (summaryData) return;
    setLoading(true);
    setError(null);
    fetch('/api/summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dimension }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setSummaryData(d);
        setLoading(false);
      })
      .catch(err => { setError(err.message || 'Could not load summary.'); setLoading(false); });
  }, [dimension]);

  return (
    <div className="ai-summary-full">
      {/* Header */}
      <div className="ai-summary-full-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ai-summary-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2C11 2 7 6 7 11C7 14 8.5 15.5 10 16C9.5 14.5 10 13 11 12.5C12 13 12.5 14.5 12 16C13.5 15.5 15 14 15 11C15 6 11 2 11 2Z" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="ai-summary-full-title">AI Executive Summary</div>
            <div className="ai-summary-full-sub">
              {loading ? 'Generating…' : summaryData ? 'Generated just now' : error ? 'Generation failed' : 'Ready to generate'}
            </div>
          </div>
        </div>
        <button
          className="ai-refresh"
          title="Regenerate"
          onClick={() => { setSummaryData(null); setError(null); }}
          disabled={loading}
        >↺</button>
      </div>

      {/* Body */}
      <div className="ai-summary-full-body">
        {loading && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
              Here&rsquo;s what I found from this survey wave.
            </div>
            <Skeleton count={4} height={10} />
          </div>
        )}

        {error && !loading && (
          <div style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13 }}>
            {error} — <button style={{ color: 'var(--blue-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }} onClick={() => setSummaryData(null)}>Retry</button>
          </div>
        )}

        {summaryData && !loading && (() => {
          const { bullets = [], takeaway = '', whyMatters = '' } = summaryData;
          return (
            <>
              {/* Left: findings */}
              <div className="ai-summary-left">
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10, fontStyle: 'italic' }}>
                  Here&rsquo;s what I found from this survey wave.
                </div>
                <ul className="ai-summary-bullets">
                  {bullets.map((b, i) => (
                    <li key={i} className="ai-summary-bullet">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button className="ai-view-full-btn" onClick={() => {}}>
                  View full summary →
                </button>
              </div>

              {/* Right: takeaway */}
              <div className="ai-summary-right">
                {takeaway && (
                  <div className="ai-takeaway-box">
                    <div className="ai-takeaway-label">Key Takeaway</div>
                    <p className="ai-takeaway-text">{takeaway}</p>
                  </div>
                )}
                {whyMatters && (
                  <div className="ai-why-box">
                    <div className="ai-why-label">Why it matters</div>
                    <p className="ai-why-text">{whyMatters}</p>
                    <button style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
                      Why this matters →
                    </button>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
