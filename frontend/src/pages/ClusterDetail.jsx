import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Badge from '../components/shared/Badge';
import Breadcrumb from '../components/shared/Breadcrumb';
import PaginatedTable from '../components/shared/PaginatedTable';

const CLUSTER_CONFIG = {
  thriving:  { label: 'Thriving',   color: '#16A34A', bg: '#F0FDF4' },
  healthy:   { label: 'Healthy',    color: '#2563EB', bg: '#EFF6FF' },
  atrisk:    { label: 'At Risk',    color: '#D97706', bg: '#FFFBEB' },
  polarised: { label: 'Polarised',  color: '#7C3AED', bg: '#F5F3FF' },
  critical:  { label: 'Critical',   color: '#DC2626', bg: '#FEF2F2' },
};

function scoreColor(s) {
  if (s >= 4.5) return '#15803D';
  if (s >= 4.0) return '#16A34A';
  if (s >= 3.5) return '#65A30D';
  if (s >= 3.0) return '#D97706';
  return '#DC2626';
}

export default function ClusterDetail() {
  const { selectedCluster, clusters, navigate } = useContext(AppContext);

  const filterKey = selectedCluster === 'all' ? null : selectedCluster;

  const clusterEntries = filterKey
    ? [[filterKey, clusters?.[filterKey] ?? []]]
    : Object.entries(clusters ?? {});

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: filterKey ? CLUSTER_CONFIG[filterKey]?.label ?? filterKey : 'All Clusters' },
      ]} />

      <h1 className="page-title">{filterKey ? CLUSTER_CONFIG[filterKey]?.label ?? filterKey : 'All Clusters'}</h1>
      <p className="page-sub">Business unit clusters by engagement profile</p>

      {clusterEntries.map(([key, items]) => {
        const cfg = CLUSTER_CONFIG[key] ?? { label: key, color: '#6B7280', bg: '#F9FAFB' };
        if (!items?.length) return null;
        return (
          <div key={key} style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Badge status={key} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{items.length} business units</span>
            </div>
            <PaginatedTable
              pageSize={10}
              headers={<><th>#</th><th>Business Unit</th><th>Business</th><th>Score</th></>}
              rows={items
                .slice()
                .sort((a,b) => (+(b.score??b.overall??0)) - (+(a.score??a.overall??0)))
                .map((item, i) => {
                  const name    = item.name ?? item;
                  const sc      = +(item.score ?? item.overall ?? 0);
                  const bizName = item.business ?? '';
                  return (
                    <tr key={i} onClick={() => navigate('bu-detail', { business: bizName, unit: name })} style={{ cursor: 'pointer' }}>
                      <td>{i+1}</td>
                      <td>{name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{bizName}</td>
                      <td style={{ color: scoreColor(sc), fontWeight: 700 }}>{sc > 0 ? sc.toFixed(2) : '—'}</td>
                    </tr>
                  );
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
}
