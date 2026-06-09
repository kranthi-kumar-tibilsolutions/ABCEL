import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import ChatWithData from '../chat/ChatWithData';

const TABS = ['AI Insights', 'Top Trends', 'Outliers & Alerts', 'Summary'];

export default function RightPanel() {
  const { insightsData, navigate } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('AI Insights');

  const trends   = insightsData?.topTrends || [];
  const outliers = insightsData?.outliers  || [];
  const summary  = insightsData?.summary   || '';

  const SkeletonLines = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="skeleton" style={{ height: 11, width: '85%' }} />
      <div className="skeleton" style={{ height: 11, width: '92%' }} />
      <div className="skeleton" style={{ height: 11, width: '70%' }} />
    </div>
  );

  return (
    <aside className="right-panel">
      {/* Tabs */}
      <div className="rp-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`rp-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rp-content">
        {activeTab === 'AI Insights' && (
          <div className="rp-section">
            <div className="rp-section-title">Top Trends</div>
            {trends.length === 0 ? <SkeletonLines /> : trends.map((t, i) => (
              <div key={i} className="rp-trend-item">
                <span className={`rp-arrow ${t.direction}`}>{t.direction === 'up' ? '↑' : '↓'}</span>
                <span className="rp-trend-text">{t.text}</span>
              </div>
            ))}

            <div className="rp-section-title" style={{ marginTop: 14 }}>Outliers Detected</div>
            {outliers.length === 0 ? <SkeletonLines /> : outliers.map((o, i) => (
              <div key={i} className="rp-trend-item">
                <span className="rp-arrow down">↓</span>
                <span className="rp-trend-text">{o.text}</span>
              </div>
            ))}

            <button className="rp-view-all" onClick={() => navigate('ai-insights')}>
              View all insights →
            </button>
          </div>
        )}

        {activeTab === 'Top Trends' && (
          <div className="rp-section">
            {trends.length === 0 ? <SkeletonLines /> : trends.map((t, i) => (
              <div key={i} className="rp-trend-item">
                <span className={`rp-arrow ${t.direction}`}>{t.direction === 'up' ? '↑' : '↓'}</span>
                <span className="rp-trend-text">{t.text}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Outliers & Alerts' && (
          <div className="rp-section">
            {outliers.length === 0 ? <SkeletonLines /> : outliers.map((o, i) => (
              <div key={i} className="rp-trend-item">
                <span className="rp-arrow down">↓</span>
                <span className="rp-trend-text">{o.text}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Summary' && (
          <div className="rp-section">
            {summary
              ? <p className="rp-summary-text">{summary}</p>
              : <SkeletonLines />
            }
          </div>
        )}
      </div>

      {/* Chat — always visible */}
      <ChatWithData />
    </aside>
  );
}
