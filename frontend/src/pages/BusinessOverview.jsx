import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Badge      from '../components/shared/Badge';
import Breadcrumb from '../components/shared/Breadcrumb';
import Sparkline  from '../components/shared/Sparkline';

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

export default function BusinessOverview() {
  const { businesses, navigate } = useContext(AppContext);

  if (!businesses?.length) return (
    <div className="page-container">
      <p style={{ color: 'var(--text-muted)', padding: 24 }}>No data available.</p>
    </div>
  );

  const sorted = [...businesses].sort((a,b) => (b.overall??b.score??0)-(a.overall??a.score??0));

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'All Businesses' },
      ]} />

      <div className="page-header">
        <div>
          <h1 className="page-title">All Businesses</h1>
          <p className="page-sub">{businesses.length} businesses · Ranked by engagement score</p>
        </div>
      </div>

      <div className="biz-cards-grid">
        {sorted.map((biz) => {
          const sc = +(biz.overall ?? biz.score ?? 0);
          return (
            <div
              key={biz.name}
              className="biz-overview-card"
              onClick={() => navigate('business-detail', { business: biz.name })}
            >
              <div className="biz-card-top">
                <div className="biz-card-rank" style={{ color: scoreColor(sc) }}>
                  #{biz.rank ?? '—'}
                </div>
                <div className="biz-card-score" style={{ color: scoreColor(sc) }}>
                  {sc.toFixed(2)}
                </div>
              </div>
              <div className="biz-card-name" title={biz.name}>{biz.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Badge status={biz.band} />
                <Sparkline
                  direction={sc >= 4.2 ? 'up' : sc <= 3.7 ? 'down' : 'flat'}
                  width={50}
                  height={22}
                />
              </div>
              {biz.respondent_count && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {biz.respondent_count.toLocaleString()} respondents
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
