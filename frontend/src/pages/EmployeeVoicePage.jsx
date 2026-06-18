import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import InfoTip from '../components/shared/InfoTip';

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

export default function EmployeeVoicePage() {
  const { meta, setBreadcrumb, evFilters } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Overview', page: 'overview' },
      { label: 'Employee Voice' },
    ]);
  }, []);

  const { cohort, company, bu } = evFilters;

  return (
    <div className="page-container">
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
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Top Themes from Free-Text Responses</span><InfoTip tip="The most frequently mentioned topics extracted from open-ended survey responses, coloured by overall sentiment (positive, mixed, or negative)." /></div>
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
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Upload free-text data</span><InfoTip tip="Include an open-ended question column in your Excel upload to enable NLP-powered theme extraction and sentiment analysis." /></div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          To enable NLP-powered theme extraction and sentiment analysis, include a free-text response column in your Excel file.
          The system will automatically detect and process open-ended question columns.
        </p>
      </div>
    </div>
  );
}
