import { useContext } from 'react';
import { AppContext } from '../../../context/AppContext';

const BRANCHES = [
  { line1: 'Performance', line2: 'Culture', pct: 23 },
  { line1: 'Recognition', line2: '& Career', pct: 21 },
  { line1: 'Other', line2: 'Factors', pct: 56 },
];

// 3 groups matching each branch node
const DRIVER_GROUPS = [
  [
    { name: 'Clarity of Goals',     dir: 'up',   val: '+0.18' },
    { name: 'Accountability',       dir: 'up',   val: '+0.15' },
    { name: 'Career Opportunities', dir: 'up',   val: '+0.16' },
  ],
  [
    { name: 'Learning & Growth',    dir: 'up',   val: '+0.14' },
    { name: 'Work Environment',     dir: 'up',   val: '+0.12' },
  ],
  [
    { name: 'Well-being',           dir: 'down', val: '-0.05' },
  ],
];

// Top offset (px) for each group so their centres align with branch centres in SVG
// Branch cy values: 35, 90, 145 in 180px tall SVG
// Group heights: 3×20=60, 2×20=40, 1×20=20
// Group centres: top + height/2 → tops: 5, 70, 135
const DRIVER_GROUP_TOPS = [5, 70, 135];
const BRANCH_CY = [35, 90, 145];
const SVG_W = 192, SVG_H = 180;

function UpArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 8V2M2 5l3-3 3 3" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DownArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 2v6M2 5l3 3 3-3" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function DriversTree() {
  const { navigate } = useContext(AppContext);

  return (
    <div className="dt-card">
      {/* Header */}
      <div className="dt-header">
        <div className="dt-title">
          DRIVERS OF ENGAGEMENT
          <span className="dt-title-sub"> (Decomposition Tree)</span>
        </div>
        <button className="dt-view-all" onClick={() => navigate && navigate('bu-explorer')}>
          View full drivers
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ marginLeft: 4 }}>
            <path d="M2 5.5h7M6 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Body: SVG tree + driver list */}
      <div className="dt-body">

        {/* SVG tree — root node, branches, connecting lines */}
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} fill="none" style={{ flexShrink: 0 }}>

          {/* Connector lines */}
          {/* Root right=76, spine x=90, branch left=106, branch right=176, SVG right=192 */}
          <g stroke="#CBD5E1" strokeWidth="1.4" fill="none">
            <path d="M76,90 H90" />
            <path d={`M90,${BRANCH_CY[0]} V${BRANCH_CY[2]}`} />
            {BRANCH_CY.map((cy, i) => (
              <path key={`l${i}`} d={`M90,${cy} H106`} />
            ))}
            {BRANCH_CY.map((cy, i) => (
              <path key={`r${i}`} d={`M176,${cy} H192`} />
            ))}
          </g>

          {/* Root node — x=4, w=72 → right edge=76 */}
          <rect x="4" y="67" width="72" height="46" rx="7" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5"/>
          <text x="40" y="83" textAnchor="middle" fontSize="7.5" fill="#1E3A5F" fontFamily="system-ui,sans-serif">Overall</text>
          <text x="40" y="93" textAnchor="middle" fontSize="7.5" fill="#1E3A5F" fontFamily="system-ui,sans-serif">Engagement</text>
          <text x="40" y="108" textAnchor="middle" fontSize="14" fill="#1D4ED8" fontWeight="700" fontFamily="system-ui,sans-serif">4.46</text>

          {/* Branch nodes — x=106, w=70 → right edge=176, center x=141 */}
          {BRANCHES.map((b, i) => {
            const cy = BRANCH_CY[i];
            return (
              <g key={i}>
                <rect x="106" y={cy - 17} width="70" height="34" rx="5" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
                <text x="141" y={cy - 8}  textAnchor="middle" fontSize="7" fill="#334155" fontFamily="system-ui,sans-serif">{b.line1}</text>
                <text x="141" y={cy + 2}  textAnchor="middle" fontSize="7" fill="#334155" fontFamily="system-ui,sans-serif">{b.line2}</text>
                <text x="141" y={cy + 12} textAnchor="middle" fontSize="8.5" fill="#2563EB" fontWeight="700" fontFamily="system-ui,sans-serif">({b.pct}%)</text>
              </g>
            );
          })}

          {/* "Impact" column label */}
          <text x="188" y="10" textAnchor="end" fontSize="8" fill="#94A3B8" fontFamily="system-ui,sans-serif" fontWeight="600">Impact</text>
        </svg>

        {/* Driver items — absolutely positioned to align with branch centres */}
        <div style={{ flex: 1, position: 'relative', height: SVG_H, minWidth: 0 }}>
          {DRIVER_GROUPS.map((group, gi) => (
            <div
              key={gi}
              style={{ position: 'absolute', top: DRIVER_GROUP_TOPS[gi], left: 0, right: 0 }}
            >
              {group.map((d, di) => (
                <div key={di} className="dt-driver-row">
                  <span className="dt-driver-name">{d.name}</span>
                  <span className="dt-driver-arrow">
                    {d.dir === 'up' ? <UpArrow /> : <DownArrow />}
                  </span>
                  <span className={`dt-driver-val ${d.dir}`}>{d.val}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="dt-legend">
        <span className="dt-legend-item"><UpArrow /> Positive drivers</span>
        <span className="dt-legend-item"><DownArrow /> Negative drivers</span>
      </div>
    </div>
  );
}
