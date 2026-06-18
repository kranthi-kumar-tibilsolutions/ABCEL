import { useContext, useEffect, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import PaginatedTable from '../components/shared/PaginatedTable';

const SD_COLORS = {
  much_lower:  { color: '#DC2626', bg: '#FEF2F2', label: 'Much Lower (≤ -2 SD)',   range: '≤ -2 SD' },
  lower:       { color: '#F97316', bg: '#FFF7ED', label: 'Lower (-2 SD to -1 SD)', range: '-2 to -1 SD' },
  typical:     { color: '#94A3B8', bg: '#F8FAFC', label: 'Typical (Within ±1 SD)', range: '±1 SD' },
  higher:      { color: '#16A34A', bg: '#F0FDF4', label: 'Higher (+1 SD to +2 SD)', range: '+1 to +2 SD' },
  much_higher: { color: '#15803D', bg: '#DCFCE7', label: 'Much Higher (≥ +2 SD)',  range: '≥ +2 SD' },
};

const FILTER_OPTIONS = {
  business_unit: ['All', 'Finance', 'Engineering', 'Operations', 'Sales', 'HR', 'Marketing', 'Customer Support'],
  department:    ['All', 'Finance', 'Engineering', 'Operations', 'Sales', 'HR', 'Marketing'],
  location:      ['All', 'India', 'APAC', 'LATAM', 'EMEA', 'Remote'],
  tenure:        ['All', '< 1 Year', '1–3 Years', '3–5 Years', '5+ Years'],
  job_level:     ['All', 'Individual Contributor', 'Manager', 'Senior Manager', 'Director', 'VP'],
  employment_type: ['All', 'Full-time', 'Part-time', 'Contract'],
  include_inactive: ['No', 'Yes'],
};

const MOCK_PERSONAS = [
  { combo: ['Customer Support', 'Remote', '< 1 Year'],                    score: 2.01, vsMean: -1.90, sdVal: -1.90, respondents: 28,  band: 'much_lower' },
  { combo: ['Sales', 'APAC', '1–3 Years'],                               score: 2.07, vsMean: -1.84, sdVal: -1.84, respondents: 35,  band: 'much_lower' },
  { combo: ['Engineering', 'India', 'Individual Contributor', '< 1 Year'], score: 2.12, vsMean: -1.79, sdVal: -1.79, respondents: 42,  band: 'much_lower' },
  { combo: ['Operations', 'LATAM', '1–3 Years'],                          score: 2.18, vsMean: -1.73, sdVal: -1.73, respondents: 31,  band: 'much_lower' },
  { combo: ['Marketing', 'Remote', '< 1 Year', 'Part-time'],              score: 2.22, vsMean: -1.69, sdVal: -1.69, respondents: 19,  band: 'much_lower' },
  { combo: ['Finance', 'India', '3–5 Years'],                             score: 3.10, vsMean: -0.81, sdVal: -0.81, respondents: 55,  band: 'lower' },
  { combo: ['HR', 'EMEA', '1–3 Years'],                                   score: 3.25, vsMean: -0.66, sdVal: -0.66, respondents: 22,  band: 'lower' },
  { combo: ['Engineering', 'APAC', 'Manager', '5+ Years'],                score: 4.80, vsMean: +0.89, sdVal: +0.89, respondents: 47,  band: 'higher' },
  { combo: ['Sales', 'India', 'Director'],                                 score: 5.10, vsMean: +1.19, sdVal: +1.19, respondents: 14,  band: 'much_higher' },
  { combo: ['HR', 'India', 'VP', '5+ Years'],                             score: 5.40, vsMean: +1.49, sdVal: +1.49, respondents: 8,   band: 'much_higher' },
];

const TABS = ['much_lower', 'lower', 'higher', 'much_higher'];
const TAB_LABELS = {
  much_lower:  'Much Lower (≤ -2 SD)',
  lower:       'Lower (-2 SD to -1 SD)',
  higher:      'Higher (+1 SD to +2 SD)',
  much_higher: 'Much Higher (≥ +2 SD)',
};

export default function FocusSpotlightPage() {
  const { setBreadcrumb, meta, fsFilters } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('much_lower');

  useEffect(() => {
    setBreadcrumb([{ label: 'Persona & Spotlight' }, { label: 'Focus Spotlight' }]);

  }, []);

  const groupAvg = meta?.group_avg ?? 3.91;
  const sd = 0.79;

  const bandCounts = useMemo(() => {
    const counts = { much_lower: 0, lower: 0, typical: 0, higher: 0, much_higher: 0 };
    MOCK_PERSONAS.forEach(p => { if (counts[p.band] !== undefined) counts[p.band]++; });
    counts.typical = 544;
    return counts;
  }, []);

  const tabPersonas = useMemo(() => MOCK_PERSONAS.filter(p => p.band === activeTab), [activeTab]);

  const sdMarkers = [
    { sd: -2, x: 16,  val: (groupAvg - 2 * sd).toFixed(2) },
    { sd: -1, x: 33,  val: (groupAvg - sd).toFixed(2) },
    { sd:  0, x: 50,  val: groupAvg.toFixed(2) },
    { sd: +1, x: 67,  val: (groupAvg + sd).toFixed(2) },
    { sd: +2, x: 84,  val: (groupAvg + 2 * sd).toFixed(2) },
  ];

  return (
    <div className="page-container" style={{ gap: 12 }}>

      {/* Summary stats — single row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Personas Analyzed', value: '720',              border: '#F97316', bg: 'rgba(249,115,22,0.08)',  shadow: 'rgba(249,115,22,0.12)',  text: '#C2410C' },
          { label: 'Total Respondents',        value: meta?.total_respondents?.toLocaleString() ?? '4,892', border: '#2563EB', bg: 'rgba(37,99,235,0.08)',   shadow: 'rgba(37,99,235,0.12)',   text: '#1D4ED8' },
          { label: 'Overall Engagement Mean',  value: groupAvg.toFixed(2), border: '#16A34A', bg: 'rgba(22,163,74,0.08)',  shadow: 'rgba(22,163,74,0.12)',  text: '#15803D' },
        ].map(c => (
          <div key={c.label} className="biz-overview-card" style={{
            borderLeft: `4px solid ${c.border}`,
            background: `linear-gradient(135deg, ${c.bg} 0%, var(--bg-card) 60%)`,
            boxShadow: `0 2px 8px ${c.shadow}, 0 1px 3px rgba(0,0,0,0.05)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', width: 340, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{c.label}</span>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: `2px solid ${c.border}`,
              background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: c.text, lineHeight: 1.2, textAlign: 'center' }}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SD Scale + Legend */}
      <div className="chart-card" style={{ margin: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Overall Engagement Scale
          </div>

          {/* Markers */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              {['-2 SD', '-1 SD', `Mean (${groupAvg.toFixed(2)})`, '+1 SD', '+2 SD'].map(l => (
                <span key={l} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', flex: 1 }}>{l}</span>
              ))}
            </div>
            {/* Tick marks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              {[0,1,2,3,4].map(i => <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><div style={{ width: 1, height: 8, background: 'var(--text-muted)' }} /></div>)}
            </div>
            {/* Color bar */}
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 28 }}>
              <div style={{ flex: 1, background: '#DC2626' }} />
              <div style={{ flex: 1, background: '#F97316' }} />
              <div style={{ flex: 1, background: '#D1D5DB' }} />
              <div style={{ flex: 1, background: '#4ADE80' }} />
              <div style={{ flex: 1, background: '#15803D' }} />
            </div>
            {/* Values */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {sdMarkers.map(m => (
                <span key={m.sd} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: m.sd < 0 ? '#DC2626' : m.sd === 0 ? 'var(--text-primary)' : '#15803D' }}>
                  {m.sd < 0 ? '≤ ' : m.sd > 0 ? '≥ ' : ''}{m.val}
                </span>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            {Object.entries(SD_COLORS).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: cfg.color }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
      </div>

      {/* Two-column: band cards+table  |  key insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 12, alignItems: 'stretch' }}>

        {/* Left — tabs + table */}
        <div className="chart-card" style={{ padding: '20px 20px 16px' }}>
          {/* Tab filter */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 14px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab ? `2.5px solid ${SD_COLORS[tab].color}` : '2.5px solid transparent',
                color: activeTab === tab ? SD_COLORS[tab].color : 'var(--text-muted)',
                background: 'none', fontFamily: 'inherit',
              }}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <PaginatedTable
            pageSize={10}
            headers={<>
              <th style={{ textAlign: 'left' }}>Persona (Combination)</th>
              <th>Overall Engagement</th>
              <th>vs Mean</th>
              <th>Std Dev</th>
              <th>Respondents</th>
              <th>Action</th>
            </>}
            rows={tabPersonas.map((p, i) => {
              const cfg = SD_COLORS[p.band];
              return (
                <tr key={i}>
                  <td style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{p.combo[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.combo.slice(1).join(' · ')}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: cfg.color }}>{p.score.toFixed(2)}</td>
                  <td style={{ fontWeight: 700, color: cfg.color }}>{p.vsMean > 0 ? '+' : ''}{p.vsMean.toFixed(2)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.sdVal > 0 ? '+' : ''}{p.sdVal.toFixed(2)} SD</td>
                  <td>{p.respondents}</td>
                  <td>
                    <button style={{
                      width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--border)',
                      background: 'var(--bg-card)', cursor: 'pointer', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
                    }} title="View persona detail">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="16 6 12 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="2" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          />
        </div>

        {/* Right — Key Insights */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--abg-orange)" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="var(--abg-orange)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="var(--abg-orange)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Key Insights</span>
          </div>
          <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              '24 personas (3.3%) are ≥ 2 SD below the mean — priority areas for intervention.',
              'New employees (< 1 year) represent 58% of the much lower personas.',
              'Remote + Tenure < 1 year combinations show the lowest engagement on average.',
              'Engineering (India) and Customer Support (Remote) are critical focus segments.',
            ].map((insight, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight}</li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
