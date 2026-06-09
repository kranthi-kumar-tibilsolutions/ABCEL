import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

export default function Breadcrumb({ items = [] }) {
  const { navigate } = useContext(AppContext);

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
            {isLast
              ? <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.label}</span>
              : (
                <button
                  onClick={() => item.page && navigate(item.page, item.params || {})}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: 0 }}
                >
                  {item.label}
                </button>
              )
            }
          </span>
        );
      })}
    </nav>
  );
}
