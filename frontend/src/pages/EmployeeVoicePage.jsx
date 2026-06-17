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
      { label: 'Explore' },
      { label: 'Employee Voice' },
    ]);
  }, []);

  const { cohort, company, bu } = evFilters;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Sentiment summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Positive', value: '58%', border: '#16A34A', bg: 'rgba(220,252,231,0.5)', shadow: 'rgba(22,163,74,0.12)', text: '#15803D', tip: 'Employees whose open-text responses were classified as net positive — expressing satisfaction, appreciation, or optimism about their work experience.' },
          { label: 'Mixed',    value: '28%', border: '#D97706', bg: 'rgba(254,243,199,0.5)', shadow: 'rgba(217,119,6,0.12)',  text: '#B45309', tip: 'Employees whose responses contained both positive and negative sentiments — acknowledging strengths but also raising concerns.' },
          { label: 'Negative', value: '14%', border: '#DC2626', bg: 'rgba(254,226,226,0.5)', shadow: 'rgba(220,38,38,0.12)',  text: '#B91C1C', tip: 'Employees whose responses were classified as net negative — expressing frustration, dissatisfaction, or disengagement. A high share here signals areas needing urgent action.' },
        ].map(s => (
          <div key={s.label} className="biz-overview-card" style={{
            borderLeft: `4px solid ${s.border}`,
            background: `linear-gradient(135deg, ${s.bg} 0%, var(--bg-card) 60%)`,
            boxShadow: `0 4px 16px ${s.shadow}, 0 1px 4px rgba(0,0,0,0.06)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.text, display: 'flex', alignItems: 'center' }}>
                {s.label}
                <InfoTip text={s.tip} />
              </span>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: `2.5px solid ${s.border}`,
                background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: s.text, lineHeight: 1 }}>{s.value}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{s.label} Sentiment</div>
          </div>
        ))}
      </div>

      {/* Theme bar chart */}
      <div className="chart-card">
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center' }}>
          Top Themes from Free-Text Responses
          <InfoTip text="NLP-extracted themes from open-ended survey responses, ranked by mention frequency. Each bar shows the relative share of respondents who raised that theme, coloured by its dominant sentiment." />
        </div>
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
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center' }}>
          Upload Free-Text Data
          <InfoTip text="Include an open-ended question column in your Excel upload to enable automatic NLP theme extraction and sentiment classification on real response data." />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          To enable NLP-powered theme extraction and sentiment analysis, include a free-text response column in your Excel file.
          The system will automatically detect and process open-ended question columns.
        </p>
      </div>

    </div>
  );
}
