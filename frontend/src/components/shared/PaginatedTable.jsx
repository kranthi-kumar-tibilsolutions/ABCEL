import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

function getPageNumbers(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, 5];
  if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
  return [current - 2, current - 1, current, current + 1, current + 2];
}

export default function PaginatedTable({ headers, rows, pageSize: defaultPageSize = 10, style, tableStyle }) {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => { setPage(1); }, [rows.length, pageSize]);

  const totalPages  = Math.max(1, Math.ceil(rows.length / pageSize));
  const start       = (page - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);
  const pageNums    = getPageNumbers(page, totalPages);

  return (
    <div style={style}>
      <table className="data-table" style={tableStyle}>
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>
          {visibleRows}
          {rows.length === 0 && (
            <tr>
              <td colSpan={999} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="paginator">
          <button className="paginator-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            <ChevronLeft size={14} />
          </button>

          {pageNums[0] > 1 && (
            <>
              <button className="paginator-page-btn" onClick={() => setPage(1)}>1</button>
              {pageNums[0] > 2 && <span className="paginator-ellipsis">…</span>}
            </>
          )}

          {pageNums.map(n => (
            <button
              key={n}
              className={`paginator-page-btn${n === page ? ' active' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}

          {pageNums[pageNums.length - 1] < totalPages && (
            <>
              {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="paginator-ellipsis">…</span>}
              <button className="paginator-page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
            </>
          )}

          <button className="paginator-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
            <ChevronRight size={14} />
          </button>

          <select
            value={pageSize}
            onChange={e => setPageSize(+e.target.value)}
            className="paginator-size-select"
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
