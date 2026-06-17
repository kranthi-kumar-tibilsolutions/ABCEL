import { useContext, useState, useRef } from 'react';
import { AppContext } from '../../context/AppContext';

function NavTooltip({ label, children, collapsed }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleEnter = (e) => {
    if (ref.current) {
      // show if collapsed OR if label text is truncated
      const label = ref.current.querySelector('.nav-label, .nav-sub-item');
      const isTruncated = label && label.scrollWidth > label.clientWidth;
      if (!collapsed && !isTruncated) return;
      const rect = ref.current.getBoundingClientRect();
      const sidebar = ref.current.closest('aside');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : rect;
      setPos({ top: rect.top + rect.height / 2, left: sidebarRect.right + 10 });
      setVisible(true);
    }
  };

  return (
    <div ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setVisible(false)}
      style={{ minWidth: 0, overflow: 'hidden' }}
    >
      {children}
      {visible && (
        <div style={{
          position: 'fixed',
          left: pos.left,
          top: pos.top,
          transform: 'translateY(-50%)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid #C1440E',

          }} />
          {/* Tooltip box */}
          <div style={{
            position: 'relative',
            background: '#C1440E',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            border: 'none',
            overflow: 'hidden',
          }}>
            {label}
            {/* Shimmer line */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'tooltipShimmer 1.4s linear infinite',
              borderRadius: 8,
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

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
    id: 'explore', label: 'Explore', collapsible: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    children: [
      { id: 'dynamic-persona-builder', label: 'Dynamic Persona Builder' },
      { id: 'bu-explorer',           label: 'BU Explorer' },
      { id: 'insights-studio',       label: 'Insights Studio' },
      { id: 'ai-insights',           label: 'AI Insights' },
      { id: 'trends',                label: 'Trends Over Time' },
      { id: 'outliers',              label: 'Outliers & Alerts' },
      { id: 'employee-voice',        label: 'Employee Voice' },
      { id: 'hypothesis-testing',    label: 'Hypothesis Testing' },
      { id: 'statistical-analysis',  label: 'Statistical Analysis' },
      { id: 'sentiment-analysis',    label: 'Sentiment Analysis' },
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

const BOTTOM_NAV = [];

export default function Sidebar() {
  const { page, navigate } = useContext(AppContext);
  const [collapsed,  setCollapsed]  = useState(true);
  const isChildActive = id => (NAV.find(n => n.id === id)?.children || []).some(c => c.id === page);
  const [openGroups, setOpenGroups] = useState(() => ({
    explore: isChildActive('explore'),
  }));

  const toggleGroup = id => setOpenGroups(g => ({ explore: false, [id]: !g[id] }));
  const groupActiveId = id => (NAV.find(n => n.id === id)?.children || []).map(c => c.id).includes(page);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* Main nav */}
      <nav className="sidebar-nav">
        {/* Collapse toggle — blends into sidebar */}
        <div
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end',
            padding: collapsed ? '6px 0' : '4px 4px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            borderRadius: 6,
            marginBottom: 2,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <div style={{
            width: collapsed ? 32 : 24, height: collapsed ? 32 : 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: collapsed ? 8 : 6,
            border: '1.5px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              {collapsed ? (
                <>
                  <path d="M3 3.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 3.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              ) : (
                <>
                  <path d="M11 3.5L7.5 7 11 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.5 3.5L3 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}
            </svg>
          </div>
        </div>

        {NAV.map(item => {
          if (item.collapsible) {
            const isOpen   = !!openGroups[item.id];
            const isActive = groupActiveId(item.id);
            return (
              <NavTooltip key={item.id} label={item.label} collapsed={collapsed}>
                <div>
                  {item.divider && !collapsed && <div className="nav-divider" />}
                  <div
                    className={`nav-item ${isActive || isOpen ? 'active' : ''}`}
                    onClick={() => {
                      const opening = !openGroups[item.id];
                      toggleGroup(item.id);
                      if (opening && !isActive && item.children?.length) {
                        navigate(item.children[0].id);
                      }
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className={`nav-chevron ${isOpen ? 'open' : ''}`}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </>
                    )}
                  </div>
                  {isOpen && !collapsed && (
                    <div className="nav-sub-items">
                      {item.children.map(child => (
                        <NavTooltip key={child.id} label={child.label} collapsed={collapsed}>
                          <div
                            className={`nav-sub-item ${page === child.id ? 'active' : ''}`}
                            onClick={() => {
                              navigate(child.id);
                              setOpenGroups(g => ({ ...g, [item.id]: true }));
                            }}
                          >
                            {child.label}
                          </div>
                        </NavTooltip>
                      ))}
                    </div>
                  )}
                </div>
              </NavTooltip>
            );
          }

          return (
            <NavTooltip key={item.id} label={item.label} collapsed={collapsed}>
              <div>
                {item.divider && !collapsed && <div className="nav-divider" />}
                <div
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.id);
                    setOpenGroups({ explore: false });
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </div>
              </div>
            </NavTooltip>
          );
        })}
      </nav>

    </aside>
  );
}
