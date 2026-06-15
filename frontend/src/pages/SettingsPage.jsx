export default function SettingsPage() {
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
    </div>
  );
}
