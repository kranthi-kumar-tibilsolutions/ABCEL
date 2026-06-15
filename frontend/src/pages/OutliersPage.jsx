import { useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Badge      from '../components/shared/Badge';

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

export default function OutliersPage() {
  const { units, businesses, navigate, setBreadcrumb, outliersTopN } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Overview', page: 'overview' },
      { label: 'Outliers & Alerts' },
    ]);
  }, []);
  const topN = outliersTopN;

  const { top5, bottom5, highVariance } = useMemo(() => {
    if (!units?.length) return { top5: [], bottom5: [], highVariance: [] };
    const sorted = [...units].sort((a,b) => (+(b.score??b.overall??0))-(+(a.score??a.overall??0)));
    const top5   = sorted.slice(0, topN);
    const bottom5 = sorted.slice(-topN).reverse();
    const highVariance = units
      .filter(u => u.variance != null && u.variance > 0.8)
      .sort((a,b) => (b.variance??0)-(a.variance??0))
      .slice(0, 10);
    return { top5, bottom5, highVariance };
  }, [units, topN]);

  const { topBiz, bottomBiz } = useMemo(() => {
    if (!businesses?.length) return { topBiz: [], bottomBiz: [] };
    const sorted = [...businesses].sort((a,b) => (+(b.overall??b.score??0))-(+(a.overall??a.score??0)));
    return { topBiz: sorted.slice(0,3), bottomBiz: sorted.slice(-3).reverse() };
  }, [businesses]);

  return (
    <div className="page-container">
      <div className="outliers-grid">
        {/* Top performers */}
        <div className="chart-card">
          <div className="chart-title" style={{ color: '#16A34A' }}>Top Business Units</div>
          {top5.map((u, i) => {
            const sc = +(u.score??u.overall??0);
            return (
              <div key={i} className="outlier-row" onClick={() => navigate('bu-detail', { business: u.business, unit: u.name })}>
                <span className="outlier-rank" style={{ color: '#16A34A' }}>#{i+1}</span>
                <div className="outlier-info">
                  <div className="outlier-name">{u.name}</div>
                  <div className="outlier-biz">{u.business}</div>
                </div>
                <span className="outlier-score" style={{ color: scoreColor(sc) }}>{sc.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Bottom performers */}
        <div className="chart-card">
          <div className="chart-title" style={{ color: '#DC2626' }}>Critical Business Units</div>
          {bottom5.map((u, i) => {
            const sc = +(u.score??u.overall??0);
            return (
              <div key={i} className="outlier-row" onClick={() => navigate('bu-detail', { business: u.business, unit: u.name })}>
                <span className="outlier-rank" style={{ color: '#DC2626' }}>#{i+1}</span>
                <div className="outlier-info">
                  <div className="outlier-name">{u.name}</div>
                  <div className="outlier-biz">{u.business}</div>
                </div>
                <span className="outlier-score" style={{ color: scoreColor(sc) }}>{sc.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Top businesses */}
        <div className="chart-card">
          <div className="chart-title" style={{ color: '#16A34A' }}>Thriving Businesses</div>
          {topBiz.map((b, i) => {
            const sc = +(b.overall??b.score??0);
            return (
              <div key={i} className="outlier-row" onClick={() => navigate('business-detail', { business: b.name })}>
                <span className="outlier-rank" style={{ color: '#16A34A' }}>#{i+1}</span>
                <div className="outlier-info">
                  <div className="outlier-name">{b.name}</div>
                  <Badge status={b.band} />
                </div>
                <span className="outlier-score" style={{ color: scoreColor(sc) }}>{sc.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Bottom businesses */}
        <div className="chart-card">
          <div className="chart-title" style={{ color: '#D97706' }}>At-Risk Businesses</div>
          {bottomBiz.map((b, i) => {
            const sc = +(b.overall??b.score??0);
            return (
              <div key={i} className="outlier-row" onClick={() => navigate('business-detail', { business: b.name })}>
                <span className="outlier-rank" style={{ color: '#D97706' }}>#{i+1}</span>
                <div className="outlier-info">
                  <div className="outlier-name">{b.name}</div>
                  <Badge status={b.band} />
                </div>
                <span className="outlier-score" style={{ color: scoreColor(sc) }}>{sc.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* High variance */}
        {highVariance.length > 0 && (
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <div className="chart-title" style={{ color: '#7C3AED' }}>High Variance — Polarised Units</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              These units show high internal variation — engagement is split across employee groups
            </p>
            <table className="data-table">
              <thead>
                <tr><th>Unit</th><th>Business</th><th>Score</th><th>Variance</th></tr>
              </thead>
              <tbody>
                {highVariance.map((u, i) => {
                  const sc = +(u.score??u.overall??0);
                  return (
                    <tr key={i} onClick={() => navigate('bu-detail', { business: u.business, unit: u.name })} style={{ cursor: 'pointer' }}>
                      <td>{u.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.business}</td>
                      <td style={{ color: scoreColor(sc), fontWeight: 700 }}>{sc.toFixed(2)}</td>
                      <td style={{ color: '#7C3AED', fontWeight: 700 }}>{u.variance?.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
