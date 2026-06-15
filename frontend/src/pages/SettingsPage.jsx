import { useState } from 'react';

function SectionCard({ title, description, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
        {description && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{description}</div>
        )}
      </div>
      <div style={{ padding: '0' }}>{children}</div>
    </div>
  );
}

function SettingRow({ label, description, control, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 24, padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function ComingSoonBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 10, background: '#F1F5F9', color: '#94A3B8',
      border: '1px solid #E2E8F0', whiteSpace: 'nowrap',
    }}>
      Coming soon
    </span>
  );
}

export default function SettingsPage() {
  const [minSample, setMinSample] = useState(5);

  const clamp = v => Math.max(1, Math.min(50, v));

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Configure platform preferences and analysis parameters.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780 }}>

        {/* ── Analysis Parameters ── */}
        <SectionCard
          title="Analysis Parameters"
          description="Control how data is segmented and displayed across the platform."
        >
          {/* Minimum Sample Size — main feature */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Minimum Sample Size
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                    background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
                  }}>
                    Placeholder
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.55 }}>
                  Sets the minimum number of respondents required before a group's data is shown.
                  Groups below this threshold will be hidden to protect respondent anonymity.
                </p>

                {/* Stepper control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setMinSample(v => clamp(v - 1))}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      border: '1px solid var(--border)', background: 'var(--bg-page)',
                      cursor: 'pointer', fontSize: 16, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >−</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={minSample}
                      min={1}
                      max={50}
                      onChange={e => setMinSample(clamp(Number(e.target.value) || 1))}
                      style={{
                        width: 56, height: 30, textAlign: 'center',
                        border: '1px solid var(--border)', borderRadius: 7,
                        fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                        background: 'var(--bg-card)', fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>respondents</span>
                  </div>
                  <button
                    onClick={() => setMinSample(v => clamp(v + 1))}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      border: '1px solid var(--border)', background: 'var(--bg-page)',
                      cursor: 'pointer', fontSize: 16, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >+</button>

                  {/* Quick presets */}
                  <div style={{ display: 'flex', gap: 5, marginLeft: 8 }}>
                    {[5, 10, 25].map(n => (
                      <button
                        key={n}
                        onClick={() => setMinSample(n)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11,
                          border: '1px solid var(--border)',
                          background: minSample === n ? 'var(--blue-primary)' : 'var(--bg-page)',
                          color: minSample === n ? '#fff' : 'var(--text-secondary)',
                          fontWeight: minSample === n ? 700 : 400,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder note */}
            <div style={{
              marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 14px', borderRadius: 8,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="6.5" fill="#3B82F6"/>
                <path d="M8 7v4M8 5v.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1D4ED8', marginBottom: 3 }}>
                  Placeholder — no filtering applied yet
                </div>
                <div style={{ fontSize: 11, color: '#3B82F6', lineHeight: 1.55 }}>
                  This control is for planning purposes only. Real data segmentation based on sample
                  size thresholds will be enforced once clean, structured data is available.
                  The value set here will be used to configure the logic at that point.
                </div>
              </div>
            </div>
          </div>

          {/* Confidence level — coming soon filler row */}
          <SettingRow
            label="Confidence Level"
            description="Statistical confidence threshold used for significance testing across the platform."
            control={<ComingSoonBadge />}
          />
          <SettingRow
            label="Outlier Detection Sensitivity"
            description="Adjust how aggressively statistical outliers are flagged in analysis views."
            control={<ComingSoonBadge />}
            last
          />
        </SectionCard>

        {/* ── Display Preferences ── */}
        <SectionCard
          title="Display Preferences"
          description="Customise how scores and comparisons are presented."
        >
          <SettingRow
            label="Score Rounding"
            description="Number of decimal places to show for engagement scores."
            control={<ComingSoonBadge />}
          />
          <SettingRow
            label="Benchmark Overlay"
            description="Show industry benchmark lines on charts by default."
            control={<ComingSoonBadge />}
            last
          />
        </SectionCard>

        {/* ── Data & Privacy ── */}
        <SectionCard
          title="Data & Privacy"
          description="Manage data retention, anonymisation rules, and export controls."
        >
          <SettingRow
            label="Anonymisation Mode"
            description="Apply additional masking to individual-level data in exports and views."
            control={<ComingSoonBadge />}
          />
          <SettingRow
            label="Data Retention Period"
            description="How long survey response data is stored before being archived."
            control={<ComingSoonBadge />}
            last
          />
        </SectionCard>

      </div>
    </div>
  );
}
