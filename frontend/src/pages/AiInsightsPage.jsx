import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Breadcrumb  from '../components/shared/Breadcrumb';
import AiSummary   from '../components/overview/AiSummary';
import FocusAreas  from '../components/overview/FocusAreas';
import ChatWithData from '../components/chat/ChatWithData';

export default function AiInsightsPage() {
  const { insightsData } = useContext(AppContext);

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'AI Insights' },
      ]} />

      <div className="page-header">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="page-sub">AI-powered analysis of your engagement data</p>
        </div>
      </div>

      <div className="insights-layout">
        <div className="insights-main">
          <AiSummary />
          <FocusAreas />

          {insightsData && (
            <div style={{ marginTop: 24 }}>
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
                <div className="ai-summary-card" style={{ marginTop: 16 }}>
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

        <div className="insights-sidebar">
          <ChatWithData />
        </div>
      </div>
    </div>
  );
}
