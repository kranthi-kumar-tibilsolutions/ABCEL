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
  const { user, logout, navigate } = useContext(AppContext);
  const [showUserMenu, setShowUserMenu]       = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
              <button className="tb-dropdown-item" onClick={() => { setShowUserMenu(false); navigate('settings'); }}>Settings</button>
              <button className="tb-dropdown-item tb-dropdown-item-danger" onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}>Logout</button>
            </div>
          )}
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '28px 32px', width: 340,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }} onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16 17 21 12 16 7" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {/* Text */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Sign out?</div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
                You'll be returned to the login screen. Any unsaved changes will be lost.
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: '1.5px solid #E5E7EB',
                  background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >Sign out</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
