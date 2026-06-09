import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import Skeleton from '../shared/Skeleton';

// Tiny inline sparkline SVG — direction: 'up' | 'down'
function MiniSparkline({ direction = 'down', color }) {
  const pts = direction === 'up'
    ? '5,20 12,14 20,10 28,6 35,3'
    : '5,4  12,8  20,12 28,16 35,20';
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" style={{ flexShrink: 0 }}>
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const CARD_CONFIG = {
  criticalWatchlist: {
    title:    'Critical Watchlist',
    subtitle: 'Top BUs needing immediate attention',
    color:    '#DC2626',
    bg:       '#FEF2F2',
    badgeBg:  '#FEE2E2',
    badgeColor: '#DC2626',
  },
  emergingRisks: {
    title:    'Emerging Risks',
    subtitle: 'BUs showing deterioration trends',
    color:    '#D97706',
    bg:       '#FFFBEB',
    badgeBg:  '#FEF3C7',
    badgeColor: '#D97706',
  },
  brightSpots: {
    title:    'Bright Spots',
    subtitle: 'BUs outperforming and improving',
    color:    '#16A34A',
    bg:       '#F0FDF4',
    badgeBg:  '#DCFCE7',
    badgeColor: '#16A34A',
  },
};

function FocusCard({ cardKey, data, navigate }) {
  const cfg = CARD_CONFIG[cardKey];
  if (!data || !cfg) return null;

  return (
    <div className="focus-area-card" style={{ background: cfg.bg, borderTop: `3px solid ${cfg.color}` }}>
      <div className="fac-header">
        <div>
          <div className="fac-title" style={{ color: cfg.color }}>{cfg.title}</div>
          <div className="fac-subtitle">{cfg.subtitle}</div>
        </div>
      </div>

      <div className="fac-bu-row">
        <span className="fac-bu-name">{data.buName}</span>
        <span className="fac-badge" style={{ background: cfg.badgeBg, color: cfg.badgeColor }}>
          {data.badge}
        </span>
      </div>

      {/* Employee voice quotes */}
      <div className="fac-quotes">
        {data.quote1 && (
          <div className="fac-quote">&ldquo;{data.quote1}&rdquo;</div>
        )}
        {data.quote2 && (
          <div className="fac-quote">&ldquo;{data.quote2}&rdquo;</div>
        )}
      </div>

      {/* Stats row */}
      <div className="fac-stats-row">
        <div className="fac-stats-text">
          {data.stat && <div className="fac-stat">{data.stat}</div>}
          {data.impact && <div className="fac-impact">Impact: {data.impact}</div>}
        </div>
        <MiniSparkline direction={data.sparklineDirection ?? (cardKey === 'brightSpots' ? 'up' : 'down')} color={cfg.color} />
      </div>

      <button
        className="fac-action"
        style={{ color: cfg.color, borderColor: cfg.color }}
        onClick={() => navigate && navigate('bu-explorer')}
      >
        {cardKey === 'brightSpots' ? 'Explore →' : 'Investigate →'}
      </button>
    </div>
  );
}

export default function FocusAreas() {
  const { focusAreasData, setFocusAreasData, dimension, navigate } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (focusAreasData) return;
    setLoading(true);
    setError(null);
    fetch('/api/focus-areas', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dimension }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setFocusAreasData(d);
        setLoading(false);
      })
      .catch(err => { setError(err.message || 'Could not load focus areas.'); setLoading(false); });
  }, [dimension]);

  return (
    <div className="focus-areas-section">
      <div className="section-header">
        <div>
          <h3 className="section-title">AI Recommended Focus Areas</h3>
          <p className="section-sub">Areas that need your attention based on impact and change</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="ai-badge" style={{ fontSize: 10 }}>AI</span>
          <button
            className="see-all-btn"
            onClick={() => setFocusAreasData(null)}
            title="Regenerate"
          >↺ Regenerate</button>
        </div>
      </div>

      {loading && (
        <div className="focus-cards-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="focus-area-card" style={{ background: 'var(--bg-card)' }}>
              <Skeleton count={4} height={10} />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="upload-error">{error}</div>
      )}

      {focusAreasData && !loading && (
        <div className="focus-cards-grid">
          {['criticalWatchlist', 'emergingRisks', 'brightSpots'].map(key => (
            <FocusCard
              key={key}
              cardKey={key}
              data={focusAreasData[key]}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
