import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import Breadcrumb from '../components/shared/Breadcrumb';

const MOCK_THEMES = [
  { theme: 'Work-Life Balance',     sentiment: 'mixed',    count: 1432, pct: 38, color: '#D97706' },
  { theme: 'Manager Support',       sentiment: 'positive', count: 1218, pct: 32, color: '#16A34A' },
  { theme: 'Career Growth',         sentiment: 'positive', count: 984,  pct: 26, color: '#16A34A' },
  { theme: 'Workload & Stress',     sentiment: 'negative', count: 876,  pct: 23, color: '#DC2626' },
  { theme: 'Recognition',           sentiment: 'mixed',    count: 754,  pct: 20, color: '#D97706' },
  { theme: 'Team Collaboration',    sentiment: 'positive', count: 698,  pct: 18, color: '#16A34A' },
  { theme: 'Communication Gaps',    sentiment: 'negative', count: 621,  pct: 16, color: '#DC2626' },
  { theme: 'Onboarding Experience', sentiment: 'positive', count: 412,  pct: 11, color: '#16A34A' },
];

const SENTIMENT_COLOR = { positive: '#16A34A', negative: '#DC2626', mixed: '#D97706' };

const COHORT_OPTIONS = ['All Cohorts', 'Tenure < 2yr', 'Tenure 2–5yr', 'Tenure > 5yr', 'Manager', 'Non-Manager', 'Grade 1–3', 'Grade 4–6', 'Female', 'Male'];

const selectStyle = {
  padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6,
  background: 'var(--bg-card)', fontSize: 11, color: 'var(--text-primary)',
  fontFamily: 'inherit', cursor: 'pointer', outline: 'none', minWidth: 120,
};

export default function EmployeeVoicePage() {
  const { meta, businesses, units } = useContext(AppContext);

  // Task 20 — filter state
  const [cohort,  setCohort]  = useState('All Cohorts');
  const [company, setCompany] = useState('All');
  const [bu,      setBu]      = useState('All');

  const companyList = businesses ? ['All', ...businesses.map(b => b.name)] : ['All'];
  const buList      = company !== 'All' && units
    ? ['All', ...units.filter(u => u.business === company).map(u => u.name)]
    : ['All'];

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'Employee Voice' },
      ]} />

      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12, width:'100%' }}>
          <div>
            <h1 className="page-title">Employee Voice</h1>
            <p className="page-sub">Free-text response themes and sentiment analysis</p>
          </div>

          {/* Task 20 — filters */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Cohort</span>
              <select style={selectStyle} value={cohort} onChange={e => setCohort(e.target.value)}>
                {COHORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Company</span>
              <select style={selectStyle} value={company} onChange={e => { setCompany(e.target.value); setBu('All'); }}>
                {companyList.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Business Unit</span>
              <select style={selectStyle} value={bu} onChange={e => setBu(e.target.value)} disabled={company === 'All'}>
                {buList.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Task 18 — sentiment cards moved above the bar chart */}
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Positive', value: '58%', color: '#16A34A', bg: '#DCFCE7' },
          { label: 'Mixed',    value: '28%', color: '#D97706', bg: '#FEF3C7' },
          { label: 'Negative', value: '14%', color: '#DC2626', bg: '#FEE2E2' },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div className="kpi-value" style={{ color: s.color }}>{s.value}</div>
            <div className="kpi-label">{s.label} Sentiment</div>
          </div>
        ))}
      </div>

      {/* Theme bar chart */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-title">Top Themes from Free-Text Responses</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Based on {meta?.total_respondents?.toLocaleString() ?? '55,457'} respondents
          {cohort !== 'All Cohorts' && ` · ${cohort}`}
          {company !== 'All' && ` · ${company}`}
          {bu !== 'All' && ` · ${bu}`}
          {' · Illustrative data'}
        </p>
        {MOCK_THEMES.map(t => (
          <div key={t.theme} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{t.theme}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: SENTIMENT_COLOR[t.sentiment], fontWeight: 600 }}>
                  {t.sentiment}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.count.toLocaleString()} mentions</span>
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${t.pct}%`, height: '100%', background: SENTIMENT_COLOR[t.sentiment], borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-title">Upload free-text data</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          To enable NLP-powered theme extraction and sentiment analysis, include a free-text response column in your Excel file.
          The system will automatically detect and process open-ended question columns.
        </p>
      </div>
    </div>
  );
}
