import { useState, useContext, useEffect, useId } from 'react';
import { AppContext } from '../../context/AppContext';
import Skeleton from '../shared/Skeleton';

const CARD_CONFIG = {
  criticalWatchlist: {
    title:      'Critical Watchlist',
    subtitle:   'High risk areas requiring immediate attention',
    color:      '#DC2626',
    badgeBg:    '#FEE2E2',
    badgeColor: '#DC2626',
    sparkDir:   'volatile-down',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#DC2626"/>
        <circle cx="16" cy="10" r="2.5" fill="white"/>
        <rect x="14.2" y="14" width="3.6" height="10" rx="1.8" fill="white"/>
      </svg>
    ),
  },
  emergingRisks: {
    title:      'Emerging Risks',
    subtitle:   'Risks developing with adverse trends',
    color:      '#D97706',
    badgeBg:    '#FEF3C7',
    badgeColor: '#D97706',
    sparkDir:   'volatile-down',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#D97706"/>
        <path d="M16 9v8M16 19.5v1.5" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  brightSpots: {
    title:      'Bright Spots',
    subtitle:   'High performing areas to leverage',
    color:      '#16A34A',
    badgeBg:    '#DCFCE7',
    badgeColor: '#16A34A',
    sparkDir:   'volatile-up',
    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#16A34A"/>
        <path d="M10 16l4.5 4.5L22 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

/* Jagged sparkline — line only, no fill, many data points */
function Sparkline({ direction = 'volatile-down', color }) {
  const uid = useId().replace(/:/g, '');
  const W = 140, H = 70;

  const VOLATILE_DOWN = [
    [0,28],[10,20],[20,32],[30,18],[40,38],[52,24],[62,42],[74,30],
    [84,46],[96,34],[106,50],[118,38],[130,52],[140,42],
  ];
  const VOLATILE_UP = [
    [0,52],[10,44],[20,56],[30,36],[40,50],[52,30],[62,44],[74,24],
    [84,38],[96,18],[106,32],[118,14],[130,24],[140,12],
  ];

  const pts = direction === 'volatile-up' ? VOLATILE_UP : VOLATILE_DOWN;
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
      fill="none" preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={linePath} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>
      ))}
    </svg>
  );
}

function FocusCard({ cardKey, data, navigate }) {
  const cfg = CARD_CONFIG[cardKey];
  if (!data || !cfg) return null;

  return (
    <div className="fac-card">
      {/* Header: icon + title + subtitle */}
      <div className="fac-card-top">
        <div className="fac-card-icon">{cfg.icon}</div>
        <div className="fac-card-meta">
          <div className="fac-card-title" style={{ color: cfg.color }}>
            {cfg.title.toUpperCase()}
          </div>
          <div className="fac-card-subtitle">{cfg.subtitle}</div>
        </div>
      </div>

      {/* Two-col body: text left, sparkline right */}
      <div className="fac-body-row">
        <div className="fac-body-left">
          {/* BU name + badge */}
          <div className="fac-bu-row">
            <span className="fac-bu-name">{data.buName}</span>
            {data.badge && (
              <span className="fac-badge" style={{ background: cfg.badgeBg, color: cfg.badgeColor }}>
                {data.badge}
              </span>
            )}
          </div>
          {data.stat   && <div className="fac-stat">{data.stat}</div>}
          {data.impact && <div className="fac-impact">Impact – {data.impact} employees</div>}
          <button
            className="fac-cta"
            style={{ color: cfg.color }}
            onClick={() => navigate && navigate('bu-explorer')}
          >
            {cardKey === 'brightSpots' ? 'Explore' : 'Investigate'} &rarr;
          </button>
        </div>

        {/* Sparkline panel */}
        <div className="fac-body-right">
          <Sparkline direction={cfg.sparkDir} color={cfg.color} />
        </div>
      </div>
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
      .catch(err => {
        setError(err.message || 'Could not load focus areas.');
        setLoading(false);
      });
  }, [dimension]);

  return (
    <div className="focus-areas-section">
      <div className="section-header">
        <div>
          <h3 className="cluster-section-title">AI Recommended Focus Areas</h3>
          <p className="cluster-section-sub">Areas that need your attention based on impact and change</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="ai-badge" style={{ fontSize: 10 }}>AI</span>
          <button className="regen-btn" onClick={() => { setFocusAreasData(null); setError(null); }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 2.5v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.5 6.5A6 6 0 1 1 10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Regenerate
          </button>
          <button className="see-all-btn" onClick={() => navigate && navigate('ai-insights')}>
            View all focus areas &rarr;
          </button>
        </div>
      </div>

      {loading && (
        <div className="fac-grid">
          {[1,2,3].map(i => (
            <div key={i} className="fac-card"><Skeleton count={5} height={10}/></div>
          ))}
        </div>
      )}

      {error && !loading && <div className="upload-error">{error}</div>}

      {focusAreasData && !loading && (
        <div className="fac-grid">
          {['criticalWatchlist','emergingRisks','brightSpots'].map(key => (
            <FocusCard key={key} cardKey={key} data={focusAreasData[key]} navigate={navigate}/>
          ))}
        </div>
      )}
    </div>
  );
}
