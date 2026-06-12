import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function SparkleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M13 2 L14.8 10.2 L23 12 L14.8 13.8 L13 22 L11.2 13.8 L3 12 L11.2 10.2 Z"
        fill="#A78BFA" stroke="#7C3AED" strokeWidth="0.8" strokeLinejoin="round"/>
      <circle cx="20" cy="5" r="1.4" fill="#7C3AED" opacity="0.5"/>
      <circle cx="5" cy="20" r="1" fill="#7C3AED" opacity="0.4"/>
    </svg>
  );
}

function ResponseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="9" cy="8.5" r="3" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.4"/>
      <circle cx="17" cy="8.5" r="3" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.4"/>
      <path d="M2 22c0-3.5 3-6 7-6" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M24 22c0-3.5-3-6-7-6" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M10 22c0-3.5 1.3-6 3-6s3 2.5 3 6" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M9 23h8M13 19v4" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6 5H4v5c0 2.5 2 4.5 4.5 4.5" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 5h2v5c0 2.5-2 4.5-4.5 4.5" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 5h10v6.5a5 5 0 01-10 0V5z" fill="#FFEDD5" stroke="#FBBF24" strokeWidth="1.5"/>
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <polyline points="3,8 10,15 15,10 23,18" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17,18 23,18 23,12" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendUpArrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}>
      <path d="M2 8L5.5 4 9 8" fill="#16A34A"/>
    </svg>
  );
}

function TrendDownArrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}>
      <path d="M2 4L5.5 8 9 4" fill="#DC2626"/>
    </svg>
  );
}

export default function KpiCards() {
  const { meta } = useContext(AppContext);

  const delta = meta?.group_avg_delta;
  const deltaPositive = delta != null ? delta >= 0 : null;

  const cards = [
    {
      label: 'Overall Engagement Score',
      value: meta?.group_avg ? `${meta.group_avg.toFixed(2)} / 5` : '— / 5',
      sub: delta != null
        ? { trend: deltaPositive, text: `${Math.abs(delta).toFixed(2)} vs last wave` }
        : `${meta?.total_units ?? '—'} business units`,
      icon: <SparkleIcon />,
      bg: '#EDE9FE',
    },
    {
      label: 'Response Rate',
      value: meta?.response_rate
        ? `${Math.round(meta.response_rate * 100)}%`
        : (meta?.total_respondents ? `${meta.total_respondents.toLocaleString()}` : '—'),
      sub: meta?.total_respondents && meta?.total_units
        ? `${meta.total_respondents.toLocaleString()} / ${(meta.total_units * 500).toLocaleString()}`
        : `${meta?.total_units ?? '—'} business units`,
      icon: <ResponseIcon />,
      bg: '#DCFCE7',
    },
    {
      label: 'Top Performing Business',
      value: meta?.top_business ?? '—',
      sub: meta?.top_score ? `${meta.top_score.toFixed(2)} / 5` : '—',
      icon: <TrophyIcon />,
      bg: '#FFEDD5',
    },
    {
      label: 'Lowest Performing Business',
      value: meta?.lowest_business ?? '—',
      sub: meta?.lowest_score ? `${meta.lowest_score.toFixed(2)} / 5` : '—',
      icon: <TrendDownIcon />,
      bg: '#FEE2E2',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => {
        const hasTrend = typeof c.sub === 'object' && c.sub?.trend != null;
        return (
          <div key={c.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: c.bg }}>
              {c.icon}
            </div>
            <div className="kpi-body">
              <div className="kpi-label">{c.label}</div>
              <div className="kpi-value" style={{ fontSize: String(c.value).length > 12 ? 13 : 18 }}>{c.value}</div>
              <div className="kpi-sub"
                style={{ color: hasTrend ? (c.sub.trend ? '#16A34A' : '#DC2626') : undefined }}>
                {hasTrend
                  ? <>{c.sub.trend ? <TrendUpArrow /> : <TrendDownArrow />}{c.sub.text}</>
                  : c.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
