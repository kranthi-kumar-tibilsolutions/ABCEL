import { useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import abgLogo from '../../assets/abg.avif';
import ultratechLogo from '../../assets/aditya_birla_ultratech.jpg';
import novelisLogo from '../../assets/aditya_birla_novilis.jpg';

const COMPANY_LOGOS = {
  ultratech: ultratechLogo,
  novelis:   novelisLogo,
};

export default function AppHeader() {
  const { user, logout } = useContext(AppContext);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userRef = useRef(null);

  const brandTitle = user?.role === 'company' ? user.company : 'ABG VIBES 2025';
  const brandLogo  = COMPANY_LOGOS[user?.theme] || abgLogo;

  useEffect(() => {
    function handleClick(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
    }
    if (showUserMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <img src={brandLogo} alt={brandTitle} width="28" height="28" style={{ objectFit: 'contain', borderRadius: 4 }} />
        <div className="app-header-brand-block">
          <div className="app-header-title">{brandTitle}</div>
          <div className="app-header-subtitle">Employee Engagement</div>
        </div>
      </div>

      <div className="topbar-spacer" />

      {user && (
        <div className="tb-dropdown tb-user" ref={userRef}>
          <button className="tb-user-trigger tb-user-trigger-header" onClick={() => setShowUserMenu(o => !o)}>
            <div className="tb-user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="tb-user-info">
              <div className="tb-user-name">{user.name}</div>
              <div className="tb-user-role">{user.role === 'group_hr' ? 'Group HR' : user.company}</div>
            </div>
            <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
          </button>

          {showUserMenu && (
            <div className="tb-dropdown-menu" style={{ right: 0, left: 'auto' }}>
              <button className="tb-dropdown-item">Help</button>
              <button className="tb-dropdown-item">Settings</button>
              <button className="tb-dropdown-item" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
