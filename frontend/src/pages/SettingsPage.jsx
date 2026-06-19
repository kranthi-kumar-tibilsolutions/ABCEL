import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
      style={{ flexShrink: 0, color: 'var(--text-muted)', cursor: 'default', marginTop: 1 }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function SettingSection({ title, children }) {
  return (
    <div className="sa-card" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14,
        paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 24, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { setActiveScreenContext, setBreadcrumb } = useContext(AppContext);
  const [minSample, setMinSample] = useState(30);

  useEffect(() => {
    setBreadcrumb([{ label: 'Settings' }]);
    setActiveScreenContext({ tab: 'settings', description: 'Platform settings for ABG Vibes 2026 — configure analysis parameters and preferences.' });
  }, []);

  const presets = [10, 25, 30, 50, 100];

  return (
    <div className="page-container">

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Configure platform preferences and analysis parameters.
        </p>
      </div>

      <SettingSection title="Data &amp; Analysis">

        {/* Minimum sample size */}
        <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Minimum Sample Size
                </span>
                <InfoIcon />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                Segments with fewer respondents than this threshold will be suppressed to protect anonymity
                and avoid statistically unreliable scores.
              </div>

              {/* Preset chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {presets.map(p => (
                  <button
                    key={p}
                    onClick={() => setMinSample(p)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      border: minSample === p ? 'none' : '1px solid var(--border)',
                      background: minSample === p ? 'var(--blue-primary)' : 'var(--bg-page)',
                      color: minSample === p ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {p}
                  </button>
                ))}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or enter custom:</span>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={minSample}
                  onChange={e => setMinSample(Math.max(5, Math.min(500, Number(e.target.value) || 5)))}
                  style={{
                    width: 64, padding: '4px 8px', borderRadius: 6,
                    border: '1px solid var(--border)', fontSize: 12,
                    color: 'var(--text-primary)', background: 'var(--bg-card)',
                    fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                  }}
                />
              </div>

              {/* Placeholder notice */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '9px 12px', borderRadius: 8,
                background: '#FFFBEB', border: '1px solid #FDE68A',
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M8 2L14.5 13.5H1.5L8 2Z" stroke="#D97706" strokeWidth="1.4"
                    strokeLinejoin="round" fill="#FEF3C7"/>
                  <path d="M8 6v3.5M8 11.5v.5" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 10.5, color: '#92400E', lineHeight: 1.55 }}>
                  <strong>Placeholder — no functional effect yet.</strong> Segment suppression logic will be wired
                  once clean, structured data is available. The threshold selected here will be applied automatically
                  across all pages when data segmentation is implemented.
                </span>
              </div>
            </div>

            {/* Live preview badge */}
            <div style={{
              flexShrink: 0, textAlign: 'center', padding: '14px 20px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-page)', minWidth: 90,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue-primary)', lineHeight: 1 }}>
                {minSample}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                respondents
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for future rows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 11 }}>More analysis settings coming soon</span>
        </div>

      </SettingSection>

    </div>
  );
}
