const COLOR_MAP = {
  strong:   { bg: '#DCFCE7', color: '#166534' },
  thriving: { bg: '#DCFCE7', color: '#166534' },
  healthy:  { bg: '#FEF3C7', color: '#92400E' },
  atrisk:   { bg: '#FEF3C7', color: '#92400E' },
  watch:    { bg: '#FFEDD5', color: '#9A3412' },
  polarised:{ bg: '#FFEDD5', color: '#9A3412' },
  concern:  { bg: '#FEE2E2', color: '#991B1B' },
  critical: { bg: '#FEE2E2', color: '#991B1B' },
};

export default function Badge({ type, label, color, bg }) {
  const style = COLOR_MAP[type] || { bg: bg || '#E2E8F0', color: color || '#475569' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 9999,
      background: style.bg,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {label || type}
    </span>
  );
}
