import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import ChatWithData from '../chat/ChatWithData';

const TABS = ['All Insights', 'Top Trends', 'Outliers & Alerts', 'Summary'];

function UpArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M5 8.5V1.5M2 4l3-3 3 3" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DownArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M5 1.5v7M2 6l3 3 3-3" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ArrowLink() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ marginLeft: 4 }}>
      <path d="M2 5.5h7M6 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const SkeletonLines = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div className="skeleton" style={{ height: 11, width: '85%' }} />
    <div className="skeleton" style={{ height: 11, width: '92%' }} />
    <div className="skeleton" style={{ height: 11, width: '70%' }} />
  </div>
);

export default function RightPanel() {
  const { insightsData, navigate, rightPanelCollapsed: collapsed, setRightPanelCollapsed: setCollapsed } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('All Insights');
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const loading  = insightsData === null;
  const trends   = insightsData?.topTrends || [];
  const outliers = insightsData?.outliers  || [];
  const summary  = insightsData?.summary   || '';

  const TrendItem = ({ item }) => (
    <div className="rp-trend-item">
      <span className="rp-arrow">{item.direction === 'up' ? <UpArrow /> : <DownArrow />}</span>
      <span className="rp-trend-text">{item.text}</span>
    </div>
  );

  const OutlierItem = ({ item }) => (
    <div className="rp-trend-item">
      <span className="rp-arrow"><DownArrow /></span>
      <span className="rp-trend-text">{item.text}</span>
    </div>
  );

  return (
    <>
    <aside className={`right-panel ${collapsed ? 'collapsed' : ''}`}>
      {/* Insights card */}
      <div className="rp-insights-card">
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

        <div className={`rp-content-wrap ${insightsExpanded ? 'expanded' : ''}`}>
          <div className="rp-content">
            {activeTab === 'All Insights' && (
              <div className="rp-section">
                <div className="rp-section-title">Top Trends</div>
                {loading ? <SkeletonLines /> : trends.length > 0 ? trends.map((t, i) => <TrendItem key={i} item={t} />) : <span className="rp-empty">No trends available</span>}

                <div className="rp-section-title" style={{ marginTop: 10 }}>Outliers Detected</div>
                {loading ? <SkeletonLines /> : outliers.length > 0 ? outliers.map((o, i) => <OutlierItem key={i} item={o} />) : <span className="rp-empty">No outliers available</span>}

                <button className="rp-view-all" onClick={() => navigate('ai-insights')}>
                  View all Insights <ArrowLink />
                </button>
              </div>
            )}

            {activeTab === 'Top Trends' && (
              <div className="rp-section">
                <div className="rp-section-title">Top Trends</div>
                {loading ? <SkeletonLines /> : trends.length > 0 ? trends.map((t, i) => <TrendItem key={i} item={t} />) : <span className="rp-empty">No trends available</span>}
              </div>
            )}

            {activeTab === 'Outliers & Alerts' && (
              <div className="rp-section">
                <div className="rp-section-title">Outliers Detected</div>
                {loading ? <SkeletonLines /> : outliers.length > 0 ? outliers.map((o, i) => <OutlierItem key={i} item={o} />) : <span className="rp-empty">No outliers available</span>}
              </div>
            )}

            {activeTab === 'Summary' && (
              <div className="rp-section">
                {loading ? <SkeletonLines /> : summary ? <p className="rp-summary-text">{summary}</p> : <span className="rp-empty">No summary available</span>}
              </div>
            )}
          </div>

          {!insightsExpanded && <div className="rp-fade-overlay" />}
        </div>

        {/* Expand / collapse toggle */}
        <button className="rp-expand-btn" onClick={() => setInsightsExpanded(e => !e)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
            style={{ transition: 'transform 0.2s', transform: insightsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M2.5 4.5L6.5 8.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {insightsExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>

      {/* Chat card */}
      <ChatWithData />
    </aside>

    {/* Floating AI toggle button */}
    <button
      className="rp-fab"
      onClick={() => setCollapsed(c => !c)}
      title={collapsed ? 'Open insights & chat' : 'Close insights & chat'}
    >
      {collapsed ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l1.8 4.6L18.4 8l-4.6 1.8L12 14.4l-1.8-4.6L5.6 8l4.6-1.8L12 2z" fill="currentColor"/>
          <path d="M19 14l.9 2.3L22.2 17l-2.3.9L19 20.2l-.9-2.3L15.8 17l2.3-.9L19 14z" fill="currentColor"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
    </>
  );
}
