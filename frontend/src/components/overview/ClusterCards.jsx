import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

function InfoTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <svg
        width="13" height="13" viewBox="0 0 13 13" fill="none"
        style={{ cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <circle cx="6.5" cy="6.5" r="6" fill="var(--blue-light)" stroke="var(--blue-primary)" strokeWidth="1.2" strokeOpacity="0.4"/>
        <circle cx="6.5" cy="4.2" r="0.7" fill="var(--blue-primary)"/>
        <rect x="5.9" y="5.8" width="1.2" height="3.2" rx="0.6" fill="var(--blue-primary)"/>
      </svg>
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', zIndex: 1000,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderBottom: '3px solid var(--blue-primary)',
          borderRadius: 8, padding: '10px 13px',
          width: 220, fontSize: 11.5, color: 'var(--text-primary)',
          lineHeight: 1.6, fontWeight: 400,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          pointerEvents: 'none',
        }}>
          {/* arrow */}
          <span style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--blue-primary)',
          }}/>
          {text}
        </span>
      )}
    </span>
  );
}

const CLUSTER_CONFIG = {
  thriving: {
    label:    'THRIVING',
    subtitle: 'United & Engaged',
    color:    '#16A34A',
    border:   '#86EFAC',
    desc:     'High engagement, low variance. Employees are positive and aligned.',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <circle cx="21" cy="21" r="20" fill="#16A34A"/>
        {/* Two people — left person */}
        <circle cx="15.5" cy="15" r="3.8" fill="white"/>
        <path d="M7 28c0-4.42 3.81-8 8.5-8s8.5 3.58 8.5 8" fill="white"/>
        {/* Right person (partially behind) */}
        <circle cx="27" cy="15" r="3" fill="white" opacity="0.75"/>
        <path d="M22 28c0-3.31 2.24-6 5-6s5 2.69 5 6" fill="white" opacity="0.75"/>
      </svg>
    ),
  },
  atrisk: {
    label:    'AT RISK',
    subtitle: 'United but Disengaged',
    color:    '#EA580C',
    border:   '#FDBA74',
    desc:     'Consistently low scores with low variance. Structural issues need attention.',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <circle cx="21" cy="21" r="20" fill="#EA580C"/>
        {/* Single person body */}
        <circle cx="21" cy="13.5" r="4" fill="white"/>
        {/* Torso */}
        <path d="M21 18.5c-4 0-7 2.5-7 5.5h14c0-3-3-5.5-7-5.5z" fill="white"/>
        {/* Raised arms */}
        <path d="M14 22l-3.5-3.5M28 22l3.5-3.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        {/* Legs */}
        <path d="M18 24v5M24 24v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  polarised: {
    label:    'POLARISED',
    subtitle: 'Polarised with Strong Core',
    color:    '#7C3AED',
    border:   '#C4B5FD',
    desc:     'Strong core positive, but a dissatisfied minority.',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <circle cx="21" cy="21" r="20" fill="#7C3AED"/>
        {/* Bold lightning bolt */}
        <path d="M23.5 9L12 22.5h9.5L18 33l12-14h-9.5L23.5 9z" fill="white"/>
      </svg>
    ),
  },
  critical: {
    label:    'CRITICAL',
    subtitle: 'Open Conflict',
    color:    '#DC2626',
    border:   '#FCA5A5',
    desc:     'Low scores with high variance. Employees are unhappy and divided.',
    icon: (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <circle cx="21" cy="21" r="20" fill="#DC2626"/>
        {/* Letter "i" — dot + stem */}
        <circle cx="21" cy="13.5" r="2.2" fill="white"/>
        <rect x="18.8" y="18" width="4.4" height="12" rx="2.2" fill="white"/>
      </svg>
    ),
  },
};

export default function ClusterCards() {
  const { clusters, navigate, activeFilters } = useContext(AppContext);
  const [expanded, setExpanded] = useState(new Set());

  if (!clusters) return null;

  const toggle = (key, e) => {
    e.stopPropagation();
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const { clusters: fclusters = [], minScore: ms = 0 } = activeFilters || {};

  // Apply filters to each cluster's BU list
  const filteredClusters = Object.fromEntries(
    Object.entries(clusters).map(([key, items]) => [
      key,
      (items || []).filter(bu => ms <= 0 || (bu.overall ?? bu.score ?? 0) >= ms),
    ])
  );

  const total = Object.values(filteredClusters).reduce((s, arr) => s + arr.length, 0);

  // If cluster filter active, only show selected; else show all that exist
  const entries = Object.entries(CLUSTER_CONFIG).filter(([key]) =>
    filteredClusters[key] !== undefined &&
    (fclusters.length === 0 || fclusters.includes(key))
  );

  return (
    <div className="cluster-section">
      <div className="section-header">
        <div>
          <h3 className="cluster-section-title">
            BU Health by Cluster
            <InfoTip text="Business units are grouped by engagement score and variance to help prioritise attention and action." />
          </h3>
          <p className="cluster-section-sub">Understand variance and prioritise attention</p>
        </div>
        <button className="see-all-btn" onClick={() => navigate('cluster-detail', { cluster: 'all' })}>
          View all BUs &rarr;
        </button>
      </div>

      <div className="cluster-cards-grid">
        {entries.map(([key, cfg]) => {
          const items = filteredClusters[key] || [];
          const pct   = total > 0 ? Math.round((items.length / total) * 100) : 0;

          return (
            <div
              key={key}
              className="cluster-card"
              style={{  }}
              onClick={() => navigate('cluster-detail', { cluster: key })}
            >
              {/* Header: icon + title stack */}
              <div className="cc-header-row">
                <div className="cc-icon">{cfg.icon}</div>
                <div className="cc-title-block">
                  <div className="cc-label" style={{ color: cfg.color }}>{cfg.label}</div>
                  <div className="cc-subtitle">{cfg.subtitle}</div>
                </div>
              </div>

              {/* Count row */}
              <div className="cc-count-line">
                <span className="cc-count-num">{items.length} BUs</span>
                <span className="cc-count-sep">|</span>
                <span className="cc-count-pct">{pct}%</span>
              </div>

              {/* Description */}
              <p className="cc-desc">{cfg.desc}</p>

              {/* Top BUs — collapsible */}
              {items.length > 0 && (
                <div className="cc-bu-list">
                  <button className="cc-bu-toggle" onClick={e => toggle(key, e)}>
                    <span className="cc-bu-list-label">Top BUs</span>
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ transition: 'transform 0.2s', transform: expanded.has(key) ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                    >
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {expanded.has(key) && (
                    <div className="cc-bu-items">
                      {items.slice(0, 3).map((bu, i) => {
                        const score = bu.overall ?? bu.score;
                        return (
                          <div key={i} className="cc-bu-row">
                            <span className="cc-bu-name">{bu.name || bu}</span>
                            <span className="cc-bu-score" style={{ color: cfg.color, background: cfg.border }}>
                              {score ? Number(score).toFixed(2) : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <button
                className="cc-footer-link"
                style={{ color: cfg.color }}
                onClick={e => { e.stopPropagation(); navigate('cluster-detail', { cluster: key }); }}
              >
                View all {items.length} BUs &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
