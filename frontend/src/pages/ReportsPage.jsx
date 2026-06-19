import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import Papa from 'papaparse';
import InfoTip from '../components/shared/InfoTip';

export default function ReportsPage() {
  const { businesses, units, clusters, meta, setBreadcrumb, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Overview', page: 'overview' },
      { label: 'Reports' },
    ]);
    setActiveScreenContext({ tab: 'reports', description: 'Downloadable engagement reports for businesses, business units, and clusters.' });
  }, []);

  const downloadCsv = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportBusinesses = () => {
    if (!businesses?.length) return;
    const rows = businesses.map(b => ({
      Name:        b.name,
      Score:       (b.overall ?? b.score ?? 0).toFixed(2),
      Band:        b.band,
      Rank:        b.rank,
      Respondents: b.respondent_count,
      ...Object.fromEntries(Object.entries(b.categories ?? {}).map(([k,v]) => [k, (+v).toFixed(2)])),
    }));
    downloadCsv(rows, 'abg_businesses.csv');
  };

  const exportUnits = () => {
    if (!units?.length) return;
    const rows = units.map(u => ({
      Name:        u.name,
      Business:    u.business,
      Score:       (u.score ?? u.overall ?? 0).toFixed(2),
      Band:        u.band,
      Respondents: u.respondent_count,
    }));
    downloadCsv(rows, 'abg_business_units.csv');
  };

  const REPORT_CARDS = [
    {
      title:    'Executive Summary',
      desc:     'Full group-level engagement summary with AI insights and KPIs',
      icon:     (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="3" width="20" height="22" rx="2" stroke="#6366F1" strokeWidth="1.5" fill="none"/>
          <rect x="8" y="9"  width="12" height="1.5" rx="0.75" fill="#6366F1"/>
          <rect x="8" y="13" width="12" height="1.5" rx="0.75" fill="#6366F1"/>
          <rect x="8" y="17" width="8"  height="1.5" rx="0.75" fill="#6366F1"/>
        </svg>
      ),
      action:   () => window.print(),
      label:    'Print / PDF',
    },
    {
      title:    'Business Scorecard',
      desc:     `${businesses?.length ?? 0} businesses with scores, ranks, and category breakdowns`,
      icon:     (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="3" width="10" height="10" rx="2" stroke="#0891B2" strokeWidth="1.5" fill="none"/>
          <rect x="15" y="3" width="10" height="10" rx="2" stroke="#0891B2" strokeWidth="1.5" fill="none"/>
          <rect x="3" y="15" width="10" height="10" rx="2" stroke="#0891B2" strokeWidth="1.5" fill="none"/>
          <rect x="15" y="15" width="10" height="10" rx="2" stroke="#0891B2" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      action:   exportBusinesses,
      label:    'Export CSV',
    },
    {
      title:    'Business Unit Report',
      desc:     `${units?.length ?? 0} business units with engagement scores and band classifications`,
      icon:     (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="18" width="5" height="8" rx="1" fill="#16A34A"/>
          <rect x="11" y="12" width="5" height="14" rx="1" fill="#16A34A"/>
          <rect x="19" y="6"  width="5" height="20" rx="1" fill="#16A34A"/>
        </svg>
      ),
      action:   exportUnits,
      label:    'Export CSV',
    },
    {
      title:    'Cluster Analysis',
      desc:     'Thriving, At Risk, Polarised, and Critical unit listings',
      icon:     (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke="#D97706" strokeWidth="1.5" fill="none"/>
          <circle cx="14" cy="14" r="6"  stroke="#D97706" strokeWidth="1.5" fill="none"/>
          <circle cx="14" cy="14" r="2"  fill="#D97706"/>
        </svg>
      ),
      action:   () => {
        if (!clusters) return;
        const rows = Object.entries(clusters).flatMap(([cluster, items]) =>
          (items ?? []).map(item => ({
            Cluster:  cluster,
            Unit:     item.name ?? item,
            Business: item.business ?? '',
            Score:    item.score ?? '',
          }))
        );
        downloadCsv(rows, 'abg_clusters.csv');
      },
      label:    'Export CSV',
    },
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 8 }}>
        {REPORT_CARDS.map((r) => (
          <div key={r.title} className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>{r.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.desc}</div>
            </div>
            <button
              className="primary-btn"
              style={{ alignSelf: 'flex-start' }}
              onClick={r.action}
            >
              {r.label}
            </button>
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Survey Metadata</span><InfoTip tip="Key metadata from the uploaded survey file: total respondents, number of businesses and units, survey wave label, and group-level averages." /></div>
        {meta ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {Object.entries(meta).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {k.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 2 }}>
                  {String(v)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No metadata available.</p>
        )}
      </div>
    </div>
  );
}
