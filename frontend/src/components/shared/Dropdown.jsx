import { useState, useRef, useEffect } from 'react';

function ChevronIcon({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function normalise(opt) {
  if (typeof opt === 'string') return { value: opt, label: opt };
  return opt;
}

/**
 * Shared Dropdown.
 *
 * variant="topbar"  — wide trigger with "Label: Value" format (TopBar style)
 * variant="filter"  — compact trigger showing value only (filter-bar style)
 */
export default function Dropdown({
  variant   = 'topbar',
  label     = '',
  value,
  options   = [],
  onChange,
  placeholder,
  menuAlign = 'left',   // 'left' | 'right'
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const normalised = options.map(normalise);
  const selected   = normalised.find(o => o.value === value) ?? normalised[0];
  const display    = selected?.label ?? placeholder ?? '—';

  const menuStyle = menuAlign === 'right' ? { right: 0, left: 'auto' } : { left: 0 };

  /* ── Topbar variant ─────────────────────────────────────── */
  if (variant === 'topbar') {
    return (
      <div className="tb-dropdown" ref={ref}>
        <button className="tb-dropdown-trigger" onClick={() => setOpen(o => !o)}>
          {label && <span className="tb-dropdown-label">{label}:</span>}
          <span className="tb-dropdown-value">{display}</span>
          <span className={`tb-dropdown-chevron ${open ? 'open' : ''}`}>
            <ChevronIcon open={open} />
          </span>
        </button>
        {open && (
          <div className="tb-dropdown-menu" style={menuStyle}>
            {normalised.map(opt => (
              <button
                key={opt.value}
                className={`tb-dropdown-item${opt.disabled ? ' disabled' : ''}${opt.value === value ? ' active' : ''}`}
                disabled={opt.disabled}
                onClick={() => { if (!opt.disabled) { onChange?.(opt.value); setOpen(false); } }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Filter variant ─────────────────────────────────────── */
  return (
    <div className={`fdd${className ? ` ${className}` : ''}`} ref={ref}>
      <button className={`fdd-trigger${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className="fdd-value">{display}</span>
        <span className={`fdd-chevron${open ? ' open' : ''}`}>
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="fdd-menu" style={menuStyle}>
          {normalised.map(opt => (
            <button
              key={opt.value}
              className={`fdd-item${opt.disabled ? ' disabled' : ''}${opt.value === value ? ' active' : ''}`}
              disabled={opt.disabled}
              onClick={() => { if (!opt.disabled) { onChange?.(opt.value); setOpen(false); } }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
