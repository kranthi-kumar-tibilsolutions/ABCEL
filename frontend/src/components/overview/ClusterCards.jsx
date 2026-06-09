import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const CLUSTER_CONFIG = {
  thriving:  {
    label: 'Thriving',
    subtitle: 'United & Engaged',
    color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC',
    desc: 'High engagement, low variance. Employees are positive and aligned.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#16A34A" strokeWidth="1.5" fill="#DCFCE7"/>
        <path d="M6 10l3 3 5-5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  atrisk:    {
    label: 'At Risk',
    subtitle: 'United but Disengaged',
    color: '#D97706', bg: '#FFFBEB', border: '#FCD34D',
    desc: 'Consistently low scores with low variance. Structural issues need attention.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#D97706" strokeWidth="1.5" fill="#FEF3C7"/>
        <path d="M10 6v5M10 13v1" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  polarised: {
    label: 'Polarised',
    subtitle: 'Polarised with Strong Core',
    color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD',
    desc: 'Strong core positive, but a dissatisfied minority.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#7C3AED" strokeWidth="1.5" fill="#EDE9FE"/>
        <path d="M7 7l6 6M13 7l-6 6" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  critical:  {
    label: 'Critical',
    subtitle: 'Open Conflict',
    color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5',
    desc: 'Low scores with high variance. Employees are unhappy and divided.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#DC2626" strokeWidth="1.5" fill="#FEE2E2"/>
        <path d="M10 5v7M10 14v1" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
};

export default function ClusterCards() {
  const { clusters, navigate } = useContext(AppContext);

  if (!clusters) return null;

  const total = Object.values(clusters).reduce((s, arr) => s + (arr?.length ?? 0), 0);
  const clusterEntries = Object.entries(CLUSTER_CONFIG).filter(([key]) => clusters[key] !== undefined);

  return (
    <div className="cluster-section">
      <div className="section-header">
        <div>
          <h3 className="section-title">BU Health by Cluster</h3>
          <p className="section-sub">Understand variance and prioritise attention</p>
        </div>
        <button className="see-all-btn" onClick={() => navigate('cluster-detail', { cluster: 'all' })}>
          View all BUs →
        </button>
      </div>

      <div className="cluster-cards-grid">
        {clusterEntries.map(([key, cfg]) => {
          const items = clusters[key] || [];
          const pct   = total > 0 ? Math.round((items.length / total) * 100) : 0;
          return (
            <div
              key={key}
              className="cluster-card"
              style={{ borderTop: `3px solid ${cfg.color}`, background: cfg.bg, cursor: 'pointer' }}
              onClick={() => navigate('cluster-detail', { cluster: key })}
            >
              <div className="cluster-card-header">
                {cfg.icon}
                <span className="cluster-label" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <div className="cluster-subtitle">{cfg.subtitle}</div>
              <div className="cluster-count-row">
                <span className="cluster-count" style={{ color: cfg.color }}>{items.length} BUs</span>
                <span className="cluster-pct" style={{ color: cfg.color }}>{pct}%</span>
              </div>
              <div className="cluster-card-desc">{cfg.desc}</div>

              {items.length > 0 && (
                <div className="cluster-previews">
                  <div className="cluster-preview-header">Top BUs</div>
                  {items.slice(0, 3).map((bu, i) => (
                    <div key={i} className="cluster-preview-item">
                      <span className="cluster-preview-name">{bu.name || bu}</span>
                      <span className="cluster-preview-score" style={{ color: cfg.color }}>
                        {(bu.overall ?? bu.score) ? Number(bu.overall ?? bu.score).toFixed(2) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="cluster-view-all"
                style={{ color: cfg.color }}
                onClick={e => { e.stopPropagation(); navigate('cluster-detail', { cluster: key }); }}
              >
                View all {items.length} BUs →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
