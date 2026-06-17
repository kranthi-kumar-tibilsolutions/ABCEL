import { useState, useRef, useEffect } from 'react';

const TOOLTIP_WIDTH = 220;
const TOOLTIP_EST_HEIGHT = 150; // generous estimate to decide flip direction
const GAP = 8;
const MARGIN = 10; // min distance from viewport edge

export default function InfoTip({ text }) {
  const [pos, setPos] = useState(null);
  const iconRef = useRef(null);

  const updatePos = () => {
    if (!iconRef.current) return;
    const r = iconRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    // Decide vertical direction: prefer above, flip below if not enough room
    const above = r.top - TOOLTIP_EST_HEIGHT - GAP > 0;
    const top  = above ? r.top - GAP : r.bottom + GAP;

    // Clamp horizontal so tooltip never bleeds past viewport edge
    const rawLeft = r.left + r.width / 2;
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.max(half + MARGIN, Math.min(vw - half - MARGIN, rawLeft));

    setPos({ top, left, above });
  };

  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [!!pos]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
      <svg
        ref={iconRef}
        width="13" height="13" viewBox="0 0 13 13" fill="none"
        style={{ cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={updatePos}
        onMouseLeave={() => setPos(null)}
      >
        <circle cx="6.5" cy="6.5" r="6" fill="var(--blue-light)" stroke="var(--blue-primary)" strokeWidth="1.2" strokeOpacity="0.4"/>
        <circle cx="6.5" cy="4.2" r="0.7" fill="var(--blue-primary)"/>
        <rect x="5.9" y="5.8" width="1.2" height="3.2" rx="0.6" fill="var(--blue-primary)"/>
      </svg>
      {pos && (
        <span style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: pos.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          zIndex: 99999,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--blue-primary)',
          borderRadius: 8,
          padding: '10px 13px',
          width: TOOLTIP_WIDTH,
          fontSize: 12,
          color: 'var(--text-primary)',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontWeight: 400,
          lineHeight: 1.6,
          textTransform: 'none',
          letterSpacing: 'normal',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}
