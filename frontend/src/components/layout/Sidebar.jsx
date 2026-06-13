import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

const NAV = [
  {
    id: 'overview', label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2l6 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'business-overview', label: 'Business Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="6" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    id: 'explore', label: 'Explore', collapsible: true, divider: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    children: [
      { id: 'bu-explorer',     label: 'BU Explorer' },
      { id: 'insights-studio', label: 'Insights Studio' },
      { id: 'ai-insights',     label: 'AI Insights' },
      { id: 'trends',          label: 'Trends Over Time' },
      { id: 'outliers',        label: 'Outliers & Alerts' },
      { id: 'employee-voice',  label: 'Employee Voice' },
    ],
  },
  {
    id: 'reports', label: 'Reports',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 5.5h4M6 8h4M6 10.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'benchmarks', label: 'Benchmarks',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 12l3.5-4 3 2.5L12 5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { page, navigate } = useContext(AppContext);
  const [collapsed,   setCollapsed]   = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  const exploreChildIds = NAV.find(n => n.id === 'explore')?.children?.map(c => c.id) || [];
  const exploreActive   = exploreChildIds.includes(page);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* Main nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => {
          if (item.collapsible) {
            return (
              <div key={item.id}>
                {item.divider && !collapsed && <div className="nav-divider" />}
                <div
                  className={`nav-item ${exploreActive ? 'active' : ''}`}
                  onClick={() => setExploreOpen(o => !o)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      <span className={`nav-chevron ${exploreOpen ? 'open' : ''}`}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </>
                  )}
                </div>
                {exploreOpen && !collapsed && (
                  <div className="nav-sub-items">
                    {item.children.map(child => (
                      <div
                        key={child.id}
                        className={`nav-sub-item ${page === child.id ? 'active' : ''}`}
                        onClick={() => navigate(child.id)}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '»' : '«'}
        </div>
      </div>
    </aside>
  );
}
