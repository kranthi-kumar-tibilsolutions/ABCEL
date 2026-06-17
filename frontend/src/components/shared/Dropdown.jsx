import { useState, useRef, useEffect } from 'react';

function ChevronIcon({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
      style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
 * variant="topbar"   — wide trigger with "Label: Value" format (TopBar style)
 * variant="filter"   — compact trigger showing value only (filter-bar style)
 * variant="combobox" — trigger IS a text input; typing filters the list inline
 *
 * searchable         — adds a search box inside the menu (filter variant only)
 */
export default function Dropdown({
  variant    = 'topbar',
  label      = '',
  value,
  options    = [],
  onChange,
  placeholder,
  searchable = false,
  menuAlign  = 'left',
  className  = '',
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref      = useRef(null);
  const searchRef = useRef(null);
  const inputRef  = useRef(null);

  const normalised = options.map(normalise);
  const selected   = normalised.find(o => o.value === value) ?? normalised[0];
  const display    = selected?.label ?? placeholder ?? '—';

  const menuStyle = menuAlign === 'right' ? { right: 0, left: 'auto' } : { left: 0 };

  /* outside-click close (shared) */
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  /* auto-focus inner search on open (filter variant) */
  useEffect(() => {
    if (open && searchable && variant === 'filter') {
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  /* ── Combobox variant ───────────────────────────────────── */
  if (variant === 'combobox') {
    const visibleQuery = open ? query : display;
    const listItems = query
      ? normalised.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
      : normalised;

    const handleFocus = () => {
      setQuery('');
      setOpen(true);
    };
    const handleChange = e => {
      setQuery(e.target.value);
      setOpen(true);
    };
    const handleSelect = (opt) => {
      onChange?.(opt.value);
      setQuery('');
      setOpen(false);
    };
    const handleKeyDown = e => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
    };

    return (
      <div className={`fdd${className ? ` ${className}` : ''}`} ref={ref} style={{ position: 'relative' }}>
        <div className={`fdd-trigger${open ? ' open' : ''}`} style={{ padding: '0 8px 0 10px', gap: 6, alignItems: 'center' }}>
          <SearchIcon />
          <input
            ref={inputRef}
            value={open ? query : display}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Search…'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'inherit',
              padding: '7px 0', minWidth: 0, cursor: 'text', lineHeight: 1,
            }}
          />
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <ChevronIcon open={open} />
          </span>
        </div>
        {open && (
          <div className="fdd-menu" style={menuStyle}>
            {listItems.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                No results
              </div>
            )}
            {listItems.map(opt => (
              <button
                key={opt.value}
                className={`fdd-item${opt.value === value ? ' active' : ''}`}
                onMouseDown={e => { e.preventDefault(); handleSelect(opt); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

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
  const filterItems = searchable && query
    ? normalised.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalised;

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
          {searchable && (
            <div style={{ padding: '5px 6px 4px', borderBottom: '1px solid var(--border)', marginBottom: 3 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
                  style={{ position: 'absolute', left: 7, color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  style={{
                    width: '100%', padding: '5px 8px 5px 24px',
                    border: '1px solid var(--border)', borderRadius: 5,
                    fontSize: 11, fontFamily: 'inherit',
                    background: 'var(--bg-page)', color: 'var(--text-primary)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onMouseDown={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          {filterItems.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              No results
            </div>
          )}
          {filterItems.map(opt => (
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
