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
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, width: 340,
            boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* Header strip */}
            <div style={{
              background: 'var(--header-gradient)',
              padding: '20px 28px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16 17 21 12 16 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Sign out?</div>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'center' }}>
                You'll be returned to the login screen. Any unsaved changes will be lost.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg-surface)', color: 'var(--text-primary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Cancel</button>
                <button
                  onClick={() => { setShowLogoutConfirm(false); logout(); }}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                    background: 'var(--header-gradient)', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Sign out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
