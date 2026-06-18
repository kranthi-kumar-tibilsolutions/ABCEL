import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ChatWithData from './ChatWithData';

function computeFlipDelta(fromRect, toRect) {
  const scaleX = fromRect.width  / toRect.width;
  const scaleY = fromRect.height / toRect.height;
  const fromCenterX = fromRect.left + fromRect.width  / 2;
  const fromCenterY = fromRect.top  + fromRect.height / 2;
  const toCenterX   = toRect.left   + toRect.width    / 2;
  const toCenterY   = toRect.top    + toRect.height   / 2;
  return { dx: fromCenterX - toCenterX, dy: fromCenterY - toCenterY, scaleX, scaleY };
}

export default function AiDrawer({ open, closing, onClose, onCloseAnimDone, originRect, messages, setMessages, loading, setLoading }) {
  const drawerRef = useRef(null);
  const [morphStyle, setMorphStyle] = useState(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  useEffect(() => {
    if (!open && !closing) setMorphStyle(null);
  }, [open, closing]);

  // FLIP open: start the drawer scaled/positioned to exactly match the
  // small chat panel's last known box, then animate to its natural full
  // size — so it visually grows out of the panel that was clicked.
  useLayoutEffect(() => {
    if (!open || closing || !originRect || !drawerRef.current) return;
    const finalRect = drawerRef.current.getBoundingClientRect();
    const { dx, dy, scaleX, scaleY } = computeFlipDelta(originRect, finalRect);

    setMorphStyle({
      transform: `translate(-50%, 0) translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
      opacity: 0.6,
      transition: 'none',
    });

    const raf = requestAnimationFrame(() => {
      setMorphStyle({
        transform: 'translate(-50%, 0) translate(0, 0) scale(1, 1)',
        opacity: 1,
        transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease-out',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, closing, originRect]);

  // FLIP close: animate the drawer shrinking back down into the sidebar
  // panel's position, then tell the parent to swap back to the real panel.
  useLayoutEffect(() => {
    if (!closing || !originRect || !drawerRef.current) return;
    const currentRect = drawerRef.current.getBoundingClientRect();
    const { dx, dy, scaleX, scaleY } = computeFlipDelta(originRect, currentRect);

    setMorphStyle({
      transform: 'translate(-50%, 0) translate(0, 0) scale(1, 1)',
      opacity: 1,
      transition: 'none',
    });

    const raf = requestAnimationFrame(() => {
      setMorphStyle({
        transform: `translate(-50%, 0) translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
        opacity: 0,
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.7,0.4), opacity 0.24s ease-in',
      });
    });

    const timer = setTimeout(() => onCloseAnimDone?.(), 290);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [closing, originRect, onCloseAnimDone]);

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.25)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: open ? 'opacity 0.3s ease-out' : 'opacity 0.25s ease-in',
      }} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', left: '50%', bottom: 16,
          zIndex: 1101,
          width: 'min(960px, 92vw)',
          height: '58vh',
          transformOrigin: 'center center',
          background: 'var(--bg-card)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          pointerEvents: (open || closing) ? 'auto' : 'none',
          ...(morphStyle ?? {
            transform: open ? 'translate(-50%, 0)' : 'translate(-50%, 24px)',
            opacity: open ? 1 : 0,
            transition: open
              ? 'transform 0.3s ease-out, opacity 0.3s ease-out'
              : 'transform 0.2s ease-in, opacity 0.2s ease-in',
          }),
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4,
          }}
        >
          ✕
        </button>

        {/* Chat — fills remaining height */}
        <div className="ai-drawer-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatWithData
            messages={messages} setMessages={setMessages}
            loading={loading}   setLoading={setLoading}
          />
        </div>
      </div>
    </>
  );
}
