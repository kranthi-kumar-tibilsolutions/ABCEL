import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function ScoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round" fill="#EDE9FE"/>
    </svg>
  );
}

function ResponseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke="#16A34A" strokeWidth="1.5"/>
      <circle cx="15" cy="7" r="3" stroke="#16A34A" strokeWidth="1.5"/>
      <path d="M3 21c0-3.31 2.69-6 6-6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M21 21c0-3.31-2.69-6-6-6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 21c0-3.31 1.34-6 3-6s3 2.69 3 6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 21h8M12 17v4M5 4H3v5c0 2.21 1.79 4 4 4M19 4h2v5c0 2.21-1.79 4-4 4" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 4h10v6a5 5 0 01-10 0V4z" stroke="#D97706" strokeWidth="1.5"/>
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16,17 22,17 22,11" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function KpiCards() {
  const { meta } = useContext(AppContext);

  const cards = [
    {
      label: 'Overall Engagement Score',
      value: meta?.group_avg ? `${meta.group_avg.toFixed(2)} / 5` : '— / 5',
      sub:   meta?.group_avg_delta != null
        ? `${meta.group_avg_delta >= 0 ? '▲' : '▼'} ${Math.abs(meta.group_avg_delta).toFixed(2)} vs last wave`
        : `${meta?.total_units ?? '—'} business units`,
      subColor: meta?.group_avg_delta != null
        ? (meta.group_avg_delta >= 0 ? '#16A34A' : '#DC2626')
        : undefined,
      icon:  <ScoreIcon />,
      color: '#7C3AED',
      bg:    '#EDE9FE',
      valueFontSize: 26,
    },
    {
      label: 'Respondents',
      value: meta?.total_respondents?.toLocaleString() ?? '—',
      sub:   `${meta?.total_units ?? '—'} business units`,
      icon:  <ResponseIcon />,
      color: '#16A34A',
      bg:    '#DCFCE7',
      valueFontSize: 26,
    },
    {
      label: 'Top Performing Business',
      value: meta?.top_business ?? '—',
      sub:   meta?.top_score ? `${meta.top_score} / 5` : '—',
      icon:  <TrophyIcon />,
      color: '#D97706',
      bg:    '#FEF3C7',
      valueFontSize: 15,
    },
    {
      label: 'Lowest Performing Business',
      value: meta?.lowest_business ?? '—',
      sub:   meta?.lowest_score ? `${meta.lowest_score} / 5` : '—',
      icon:  <TrendDownIcon />,
      color: '#DC2626',
      bg:    '#FEE2E2',
      valueFontSize: 15,
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div key={c.label} className="kpi-card">
          <div className="kpi-icon" style={{ color: c.color, background: c.bg }}>
            {c.icon}
          </div>
          <div className="kpi-body">
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value" style={{ color: c.color, fontSize: c.valueFontSize }}>
              {c.value}
            </div>
            <div className="kpi-sub" style={{ color: c.subColor }}>{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
