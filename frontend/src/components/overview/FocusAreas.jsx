import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { apiFetch } from '../../utils/api';
import Skeleton from '../shared/Skeleton';
import InfoTip from '../shared/InfoTip';

const CARD_CONFIG = {
  criticalWatchlist: {
    title:      'Critical Watchlist',
    subtitle:   'High risk areas requiring immediate attention',
    color:      '#DC2626',
    badgeBg:    '#FEE2E2',
    badgeColor: '#DC2626',

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

    icon: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="#16A34A"/>
        <path d="M10 16l4.5 4.5L22 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
};

function ScoreRing({ score, color }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(score / 5, 1) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
        <circle cx="34" cy="34" r={r} stroke="#E5E7EB" strokeWidth="5"/>
        <circle cx="34" cy="34" r={r} stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
        />
        <text x="34" y="37" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F172A" fontFamily="inherit">
          {Number(score).toFixed(2)}
        </text>
      </svg>
      <span style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>out of 5</span>
    </div>
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

        {/* Score ring */}
        <div className="fac-body-right">
          <ScoreRing
            score={parseFloat(data.stat?.match(/[\d.]+/)?.[0] ?? '0')}
            color={cfg.color}
          />
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
    if (focusAreasData?._dim === dimension) return;
    setFocusAreasData(null);
    setLoading(true);
    setError(null);
    apiFetch('/api/focus-areas', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dimension }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setFocusAreasData({ ...d, _dim: dimension });
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
          <h3 className="cluster-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>AI Recommended Focus Areas<InfoTip tip="The AI analyses score gaps and trends to surface the most critical areas needing attention: the highest-risk unit, an emerging risk, and a top bright spot to leverage." /></h3>
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
