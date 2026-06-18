import { useState, useRef, useCallback } from 'react';

/* ── shared InfoTip component ────────────────────────────────────────
   Usage: <InfoTip tip="Tooltip text here" position="top" />
   position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
─────────────────────────────────────────────────────────────────────── */
export default function InfoTip({ tip, position = 'top', size = 12 }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const show = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const TIP_W = 220;
    const TIP_H = 36; // approx, tooltip auto-sizes but we need an estimate

    let top, left;
    if (position === 'bottom') {
      top  = rect.bottom + 6 + window.scrollY;
      left = rect.left + rect.width / 2 - TIP_W / 2 + window.scrollX;
    } else if (position === 'left') {
      top  = rect.top + rect.height / 2 - TIP_H / 2 + window.scrollY;
      left = rect.left - TIP_W - 8 + window.scrollX;
    } else if (position === 'right') {
      top  = rect.top + rect.height / 2 - TIP_H / 2 + window.scrollY;
      left = rect.right + 8 + window.scrollX;
    } else {
      // top (default)
      top  = rect.top - TIP_H - 8 + window.scrollY;
      left = rect.left + rect.width / 2 - TIP_W / 2 + window.scrollX;
    }

    // clamp horizontally within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - TIP_W - 8));
    // flip to bottom if off-screen top
    if (top < 0 && position === 'top') {
      top = rect.bottom + 6 + window.scrollY;
    }

    setCoords({ top, left });
    setVisible(true);
  }, [position]);

  if (!tip) return null;

  return (
    <>
      <span
        ref={iconRef}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default', flexShrink: 0 }}
      >
        <svg
          width={size} height={size} viewBox="0 0 12 12" fill="none"
          style={{ color: 'var(--text-muted)', display: 'block' }}
        >
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </span>

      {visible && (
        <div
          style={{
            position: 'fixed',
            top:  coords.top,
            left: coords.left,
            zIndex: 9999,
            maxWidth: 220,
            background: '#FFFFFF',
            color: '#1E293B',
            fontSize: 11,
            lineHeight: 1.55,
            fontWeight: 400,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {tip}
        </div>
      )}
    </>
  );
}
