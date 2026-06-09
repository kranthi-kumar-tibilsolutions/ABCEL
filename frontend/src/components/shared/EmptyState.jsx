const DEFAULT_ICON = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="4" width="24" height="24" rx="3" stroke="#94A3B8" strokeWidth="1.5" fill="none"/>
    <rect x="9"  y="20" width="4" height="7" rx="1" fill="#94A3B8"/>
    <rect x="14" y="14" width="4" height="13" rx="1" fill="#94A3B8"/>
    <rect x="19" y="9"  width="4" height="18" rx="1" fill="#94A3B8"/>
  </svg>
);

export default function EmptyState({ icon = DEFAULT_ICON, title = 'No data available', subtitle, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', gap: 12, textAlign: 'center',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    }}>
      <div>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300 }}>{subtitle}</div>}
      {action && (
        <button
          onClick={action.onClick}
          style={{ marginTop: 8, padding: '8px 16px', background: 'var(--blue-primary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
