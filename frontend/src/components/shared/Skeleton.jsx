export default function Skeleton({ width = '100%', height = 12, variant = 'line', count = 1, light = false }) {
  const lightStyle = light ? { background: 'rgba(255,255,255,0.12)' } : {};
  if (variant === 'table') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div className="skeleton" style={{ width: 30, height: 12 }} />
            <div className="skeleton" style={{ width: '40%', height: 12 }} />
            <div className="skeleton" style={{ width: '15%', height: 12 }} />
            <div className="skeleton" style={{ width: '15%', height: 12 }} />
            <div className="skeleton" style={{ width: '15%', height: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return <div className="skeleton" style={{ width, height: height || 100 }} />;
  }

  if (variant === 'circle') {
    return <div className="skeleton" style={{ width: width || 40, height: height || 40, borderRadius: '50%' }} />;
  }

  if (count > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: i % 3 === 0 ? '85%' : i % 3 === 1 ? '92%' : '70%', height, ...lightStyle }} />
        ))}
      </div>
    );
  }

  return <div className="skeleton" style={{ width, height }} />;
}
