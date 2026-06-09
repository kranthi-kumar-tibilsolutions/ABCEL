import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Breadcrumb   from '../components/shared/Breadcrumb';
import ChatWithData from '../components/chat/ChatWithData';

const MOCK_THEMES = [
  { theme: 'Work-Life Balance',       sentiment: 'mixed',    count: 1432, pct: 38, color: '#D97706' },
  { theme: 'Manager Support',         sentiment: 'positive', count: 1218, pct: 32, color: '#16A34A' },
  { theme: 'Career Growth',           sentiment: 'positive', count: 984,  pct: 26, color: '#16A34A' },
  { theme: 'Workload & Stress',       sentiment: 'negative', count: 876,  pct: 23, color: '#DC2626' },
  { theme: 'Recognition',             sentiment: 'mixed',    count: 754,  pct: 20, color: '#D97706' },
  { theme: 'Team Collaboration',      sentiment: 'positive', count: 698,  pct: 18, color: '#16A34A' },
  { theme: 'Communication Gaps',      sentiment: 'negative', count: 621,  pct: 16, color: '#DC2626' },
  { theme: 'Onboarding Experience',   sentiment: 'positive', count: 412,  pct: 11, color: '#16A34A' },
];

const SENTIMENT_COLOR = { positive: '#16A34A', negative: '#DC2626', mixed: '#D97706' };

export default function EmployeeVoicePage() {
  const { meta } = useContext(AppContext);

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: 'Overview', page: 'overview' },
        { label: 'Employee Voice' },
      ]} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Voice</h1>
          <p className="page-sub">Free-text response themes and sentiment analysis</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div>
          {/* Theme overview */}
          <div className="chart-card">
            <div className="chart-title">Top Themes from Free-Text Responses</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Based on {meta?.total_respondents?.toLocaleString() ?? '55,457'} respondents · Illustrative data
            </p>
            {MOCK_THEMES.map((t) => (
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

          {/* Sentiment summary */}
          <div className="kpi-grid" style={{ marginTop: 16 }}>
            {[
              { label: 'Positive', value: '58%', color: '#16A34A' },
              { label: 'Mixed',    value: '28%', color: '#D97706' },
              { label: 'Negative', value: '14%', color: '#DC2626' },
            ].map(s => (
              <div key={s.label} className="kpi-card" style={{ textAlign: 'center' }}>
                <div className="kpi-value" style={{ color: s.color }}>{s.value}</div>
                <div className="kpi-label">{s.label} Sentiment</div>
              </div>
            ))}
          </div>

          <div className="chart-card" style={{ marginTop: 16 }}>
            <div className="chart-title">Upload free-text data</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              To enable NLP-powered theme extraction and sentiment analysis, include a free-text response column in your Excel file.
              The system will automatically detect and process open-ended question columns.
            </p>
          </div>
        </div>

        {/* Chat */}
        <div>
          <ChatWithData />
        </div>
      </div>
    </div>
  );
}
