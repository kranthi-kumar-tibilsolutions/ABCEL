import { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

const NAV = [
  { id: 'overview',          label: 'Overview' },
  { id: 'business-overview', label: 'Business Overview' },
  {
    id: 'explore', label: 'Explore', collapsible: true,
    children: [
      { id: 'bu-explorer',     label: 'BU Explorer' },
      { id: 'insights-studio', label: 'Insights Studio' },
      { id: 'ai-insights',     label: 'AI Insights' },
      { id: 'trends',          label: 'Trends Over Time' },
      { id: 'outliers',        label: 'Outliers & Alerts' },
      { id: 'employee-voice',  label: 'Employee Voice' },
    ],
  },
  { id: 'reports',    label: 'Reports' },
  { id: 'benchmarks', label: 'Benchmarks' },
];

function AbgLogo() {
  // Geometric approximation of the Aditya Birla Group mosaic logo
  // Rectangle divided into ~8 faceted triangular/polygonal sections
  // Colours: dark maroon → red → orange-red → amber (left→right, top→bottom)
  return (
    <svg width="44" height="36" viewBox="0 0 44 36" style={{ flexShrink: 0 }}>
      {/* Top-left dark maroon corner */}
      <polygon points="2,2 20,2 2,16" fill="#5C0B0B"/>
      {/* Top strip — deep red */}
      <polygon points="20,2 42,2 28,14 2,16" fill="#9B1C1C"/>
      {/* Top-right — orange-red */}
      <polygon points="42,2 42,14 28,14" fill="#C84B11"/>
      {/* Left side — dark red */}
      <polygon points="2,16 2,34 16,34 28,14" fill="#7B1313"/>
      {/* Centre — rich red */}
      <polygon points="16,34 28,14 28,34" fill="#B91C1C"/>
      {/* Right upper — orange */}
      <polygon points="28,14 42,14 42,26 28,34" fill="#D97706"/>
      {/* Bottom-right — warm amber */}
      <polygon points="28,34 42,26 42,34" fill="#F59E0B"/>
    </svg>
  );
}

export default function Sidebar() {
  const { page, navigate } = useContext(AppContext);
  const [collapsed,   setCollapsed]   = useState(false);
  const [exploreOpen, setExploreOpen] = useState(true);

  const exploreChildIds = NAV.find(n => n.id === 'explore')?.children?.map(c => c.id) || [];
  const exploreActive   = exploreChildIds.includes(page);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <AbgLogo />
        {!collapsed && (
          <div>
            <div className="sidebar-brand">ABG VIBES 2025</div>
            <div className="sidebar-subbrand">Employee Engagement</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => {
          if (item.collapsible) {
            return (
              <div key={item.id}>
                <div
                  className={`nav-item ${exploreActive ? 'active' : ''}`}
                  onClick={() => setExploreOpen(o => !o)}
                >
                  {!collapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-chevron">{exploreOpen ? '▼' : '▶'}</span>
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
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {!collapsed && (
          <>
            <div className="nav-item"><span className="nav-label">Help</span></div>
            <div className="nav-item"><span className="nav-label">Settings</span></div>
          </>
        )}
        <div className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '»' : '«'}
        </div>
      </div>
    </aside>
  );
}
