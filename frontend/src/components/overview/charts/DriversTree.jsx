import { useContext, useMemo } from 'react';
import { AppContext } from '../../../context/AppContext';

const SVG_W = 192, SVG_H = 180;
const BRANCH_CY  = [35, 90, 145];
const GROUP_TOPS = [5, 70, 135];

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

/* Compute average category scores across all businesses */
function useCategoryDrivers(businesses, meta) {
  return useMemo(() => {
    const overall = meta?.group_avg ?? 4.44;
    if (!businesses?.length) return { overall, branches: [], groups: [] };

    const totals = {}, counts = {};
    for (const biz of businesses) {
      for (const [cat, val] of Object.entries(biz.categories || {})) {
        totals[cat] = (totals[cat] || 0) + +val;
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    const cats = Object.entries(totals)
      .map(([name, total]) => ({
        name,
        score: +(total / counts[name]).toFixed(2),
        diff:  +(total / counts[name] - overall).toFixed(2),
      }))
      .sort((a, b) => b.diff - a.diff);

    if (!cats.length) return { overall, branches: [], groups: [] };

    // Split into 3 display groups matching the 3 SVG branches
    const pos = cats.filter(c => c.diff >= 0);
    const neg = cats.filter(c => c.diff <  0);

    // group0: top positive (up to 3), group1: next positive (up to 2), group2: negatives (up to 2)
    const g0 = pos.slice(0, 3);
    const g1 = pos.slice(3, 5);
    const g2 = neg.slice(0, 2);
    const groups = [g0, g1.length ? g1 : [{ name: 'Baseline', score: overall, diff: 0 }], g2];

    // Branch percentages = share of total category score weight
    const scoreSum = cats.reduce((s, c) => s + c.score, 0);
    const pct = (subset) => Math.round(subset.reduce((s, c) => s + c.score, 0) / scoreSum * 100);

    const branches = [
      { line1: g0[0]?.name.split(' ')[0] || 'Top',     line2: 'Drivers', pct: pct(g0) },
      { line1: g1.length ? g1[0]?.name.split(' ')[0] : 'Mid', line2: 'Drivers', pct: pct(g1.length ? g1 : groups[1]) },
      { line1: 'Other',  line2: 'Factors', pct: 100 - pct(g0) - pct(g1.length ? g1 : groups[1]) },
    ];

    return { overall, branches, groups };
  }, [businesses, meta]);
}

export default function DriversTree() {
  const { businesses, filteredBusinesses, meta, navigate } = useContext(AppContext);
  const bizList = filteredBusinesses ?? businesses;
  const { overall, branches, groups } = useCategoryDrivers(bizList, meta);

  if (!branches.length) return null;

  return (
    <div className="dt-card">
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

      <div className="dt-body">
        {/* SVG tree */}
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} fill="none" style={{ flexShrink: 0 }}>
          <g stroke="#CBD5E1" strokeWidth="1.4">
            <path d="M76,90 H90" />
            <path d={`M90,${BRANCH_CY[0]} V${BRANCH_CY[2]}`} />
            {BRANCH_CY.map((cy, i) => <path key={`l${i}`} d={`M90,${cy} H106`} />)}
            {BRANCH_CY.map((cy, i) => <path key={`r${i}`} d={`M176,${cy} H192`} />)}
          </g>

          {/* Root node */}
          <rect x="4" y="67" width="72" height="46" rx="7" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5"/>
          <text x="40" y="83"  textAnchor="middle" fontSize="7.5" fill="#1E3A5F" fontFamily="system-ui,sans-serif">Overall</text>
          <text x="40" y="93"  textAnchor="middle" fontSize="7.5" fill="#1E3A5F" fontFamily="system-ui,sans-serif">Engagement</text>
          <text x="40" y="108" textAnchor="middle" fontSize="14"  fill="#1D4ED8" fontWeight="700" fontFamily="system-ui,sans-serif">
            {(+overall).toFixed(2)}
          </text>

          {/* Branch nodes */}
          {branches.map((b, i) => {
            const cy = BRANCH_CY[i];
            const label = b.line1.length > 9 ? b.line1.slice(0, 8) + '…' : b.line1;
            return (
              <g key={i}>
                <rect x="106" y={cy - 17} width="70" height="34" rx="5" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
                <text x="141" y={cy - 8}  textAnchor="middle" fontSize="7" fill="#334155" fontFamily="system-ui,sans-serif">{label}</text>
                <text x="141" y={cy + 2}  textAnchor="middle" fontSize="7" fill="#334155" fontFamily="system-ui,sans-serif">{b.line2}</text>
                <text x="141" y={cy + 12} textAnchor="middle" fontSize="8.5" fill="#2563EB" fontWeight="700" fontFamily="system-ui,sans-serif">({b.pct}%)</text>
              </g>
            );
          })}

          <text x="188" y="10" textAnchor="end" fontSize="8" fill="#94A3B8" fontFamily="system-ui,sans-serif" fontWeight="600">Impact</text>
        </svg>

        {/* Driver rows */}
        <div style={{ flex: 1, position: 'relative', height: SVG_H, minWidth: 0 }}>
          {groups.map((group, gi) => (
            <div key={gi} style={{ position: 'absolute', top: GROUP_TOPS[gi], left: 0, right: 0 }}>
              {group.map((d, di) => (
                <div key={di} className="dt-driver-row">
                  <span className="dt-driver-name" title={d.name}>
                    {d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name}
                  </span>
                  <span className="dt-driver-arrow">{d.diff >= 0 ? <UpArrow /> : <DownArrow />}</span>
                  <span className={`dt-driver-val ${d.diff >= 0 ? 'up' : 'down'}`}>
                    {d.diff >= 0 ? '+' : ''}{d.diff.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="dt-legend">
        <span className="dt-legend-item"><UpArrow /> Positive drivers</span>
        <span className="dt-legend-item"><DownArrow /> Negative drivers</span>
      </div>
    </div>
  );
}
