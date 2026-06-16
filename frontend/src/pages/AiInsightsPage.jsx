import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import AiSummary   from '../components/overview/AiSummary';
import FocusAreas  from '../components/overview/FocusAreas';

export default function AiInsightsPage() {
  const { insightsData, setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Explore' },
      { label: 'AI Insights' },
    ]);
  }, []);

  return (
    <div className="page-container">

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Executive Summary */}
        <AiSummary maxBullets={4} />

        {/* Focus Areas */}
        <FocusAreas />

        {/* Insights cards */}
        {insightsData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {insightsData.topTrends?.length > 0 && (
              <div className="ai-summary-card">
                <div className="ai-summary-header">
                  <span className="ai-badge">AI</span>
                  <span>Top Trends</span>
                </div>
                <ul className="ai-bullets">
                  {insightsData.topTrends.map((t, i) => (
                    <li key={i}>
                      <span style={{ marginRight: 6 }}>{t.direction === 'up' ? '↑' : '↓'}</span>
                      {t.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insightsData.outliers?.length > 0 && (
              <div className="ai-summary-card">
                <div className="ai-summary-header">
                  <span className="ai-badge" style={{ background: '#FEF2F2', color: '#DC2626' }}>AI</span>
                  <span>Outliers & Alerts</span>
                </div>
                <ul className="ai-bullets">
                  {insightsData.outliers.map((o, i) => (
                    <li key={i}>
                      <span style={{ marginRight: 6 }}>{o.direction === 'up' ? '↑' : '↓'}</span>
                      {o.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
