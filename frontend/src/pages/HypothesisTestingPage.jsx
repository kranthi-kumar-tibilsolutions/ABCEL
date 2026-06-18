import { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import InfoTip from '../components/shared/InfoTip';
import Skeleton from '../components/shared/Skeleton';

/* ── Bell Curve (one-sample Z only) ──────────────────────────── */
function BellCurve({ critZ = 1.645, testZ = 2.45 }) {
  const W = 280, H = 140;
  const xMin = -3.5, xMax = 3.5;
  const pdf   = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const maxY  = pdf(0);
  const toX   = x => 20 + (x - xMin) / (xMax - xMin) * (W - 40);
  const toY   = y => 106 - (y / maxY) * 92;
  const N = 100;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const x = xMin + i * (xMax - xMin) / N;
    return [toX(x), toY(pdf(x))];
  });
  const curvePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const critXpx = toX(critZ);
  const testXpx = toX(Math.max(-3.4, Math.min(3.4, testZ)));
  const axisY   = 106;
  const rejPts  = pts.filter(([x]) => x >= critXpx - 1);
  const rejPath = rejPts.length
    ? `M${critXpx.toFixed(1)},${toY(pdf(critZ)).toFixed(1)} `
      + rejPts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
      + ` L${toX(xMax).toFixed(1)},${axisY} L${critXpx.toFixed(1)},${axisY} Z`
    : '';
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'hidden' }}>
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#16A34A" strokeWidth="1.8" strokeOpacity="0.35"/>
        </pattern>
      </defs>
      <path d={rejPath} fill="url(#hatch)" />
      <path d={rejPath} fill="none" stroke="#86EFAC" strokeWidth="0.8" />
      <path d={curvePath} fill="none" stroke="#475569" strokeWidth="1.8" />
      <line x1="20" y1={axisY} x2={W - 20} y2={axisY} stroke="#CBD5E1" strokeWidth="1" />
      <line x1={critXpx} y1={toY(pdf(critZ))} x2={critXpx} y2={axisY}
        stroke="#94A3B8" strokeWidth="1.3" strokeDasharray="4,3" />
      <line x1={testXpx} y1={toY(pdf(testZ))} x2={testXpx} y2={axisY}
        stroke="#16A34A" strokeWidth="2" />
      <text x={testXpx + 5} y={toY(pdf(testZ)) - 4} fontSize="8.5" fill="#16A34A" fontWeight="700" fontFamily="inherit">
        Z = {testZ}
      </text>
      <text x={toX(0)}  y={axisY + 12} textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="inherit">0</text>
      <text x={critXpx} y={axisY + 12} textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="inherit">{critZ}</text>
      <line x1="20" y1={H - 8} x2="38" y2={H - 8} stroke="#94A3B8" strokeWidth="1.3" strokeDasharray="4,2" />
      <text x="42" y={H - 4} fontSize="8" fill="#94A3B8" fontFamily="inherit">Critical Z (α = 0.05)</text>
      <rect x="145" y={H - 14} width="10" height="9" fill="url(#hatch)" stroke="#86EFAC" strokeWidth="0.5" />
      <text x="159" y={H - 4} fontSize="8" fill="#94A3B8" fontFamily="inherit">Rejection Region</text>
    </svg>
  );
}

/* ── Normal CDF (Hart approximation — mirrors Python backend) ── */
function normalCDF(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t  = 1 / (1 + 0.3275911 * ax);
  const y  = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax));
  return 0.5 * (1 + sign * y);
}

/* ── Inline fraction ─────────────────────────────────────── */
function Frac({ num, den }) {
  return (
    <span className="ht-frac">
      <span className="ht-frac-num">{num}</span>
      <span className="ht-frac-bar" />
      <span className="ht-frac-den">{den}</span>
    </span>
  );
}

/* ── Result badge (history table) ───────────────────────── */
function ResultBadge({ result }) {
  const ok = result === 'Validated' || result === 'validated';
  const label = result ? (result.charAt(0).toUpperCase() + result.slice(1).toLowerCase()) : result;
  return (
    <span className={`ht-badge ${ok ? 'ht-badge-ok' : 'ht-badge-fail'}`}>
      {ok
        ? <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="6.5" fill="#16A34A"/><path d="M3.5 6.5l2 2 3.5-3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="6.5" fill="#DC2626"/><path d="M4 4l5 5M9 4l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
      }
      {label}
    </span>
  );
}

/* ── Confidence bar ─────────────────────────────────────── */
function ConfBar({ value = 0, color = '#3B82F6' }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <div style={{ width: 44, height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9.5, color, fontWeight: 700, minWidth: 24 }}>{pct}%</span>
    </div>
  );
}

/* ── Variable row in confirmation card ──────────────────── */
function VarRow({ role, label, field, value, source, confidence, color }) {
  const sub = value ? `${field} = ${value}` : `theme: ${field}`;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr auto',
      alignItems: 'center', gap: 10,
      padding: '7px 10px', borderRadius: 6,
      background: '#F8FAFC', border: '1px solid var(--border)',
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
        padding: '2px 6px', borderRadius: 4, textAlign: 'center',
        color, background: `${color}18`, border: `1px solid ${color}40`,
      }}>{role}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
      </div>
      <ConfBar value={confidence} color={color} />
    </div>
  );
}

/* ── Test type config ────────────────────────────────────── */
const TYPE_CONFIG = {
  group_comparison: { label: 'Group Comparison',          test: 'Two-Sample Z-Test',    color: '#3B82F6' },
  relationship:     { label: 'Correlation / Relationship', test: 'Pearson Correlation',  color: '#8B5CF6' },
  one_sample:       { label: 'Benchmark Test',             test: 'One-Sample Z-Test',    color: '#10B981' },
};

/* ── Step 2: Confirmation card ───────────────────────────── */
function ConfirmCard({ parsed, onRun, onEdit, running }) {
  const hType  = parsed?.hypothesis_type || 'one_sample';
  const cfg    = TYPE_CONFIG[hType] || TYPE_CONFIG.one_sample;

  const varRows = () => {
    if (hType === 'group_comparison') {
      const ga = parsed.group_a || {};
      const gb = parsed.group_b || {};
      const oc = parsed.outcome  || {};
      return [
        { role: 'GROUP A',  label: ga.label, field: ga.field, value: ga.value, source: 'demographic', confidence: ga.confidence, color: '#3B82F6' },
        { role: 'GROUP B',  label: gb.label, field: gb.field, value: gb.value, source: 'demographic', confidence: gb.confidence, color: '#64748B' },
        { role: 'OUTCOME',  label: oc.label, field: oc.field, value: null,     source: oc.source,     confidence: oc.confidence, color: '#F59E0B' },
      ];
    }
    if (hType === 'relationship') {
      const xv = parsed.x_var || {};
      const yv = parsed.y_var || {};
      return [
        { role: 'X — PREDICTOR', label: xv.label, field: xv.question_id || xv.field, value: null, source: xv.source, confidence: xv.confidence, color: '#8B5CF6' },
        { role: 'Y — OUTCOME',   label: yv.label, field: yv.question_id || yv.field, value: null, source: yv.source, confidence: yv.confidence, color: '#EC4899' },
      ];
    }
    // one_sample
    const gr = parsed.group   || {};
    const oc = parsed.outcome  || {};
    return [
      { role: 'GROUP',   label: gr.label || 'All employees', field: gr.field, value: gr.value, source: 'demographic', confidence: gr.confidence || 1, color: '#10B981' },
      { role: 'OUTCOME', label: oc.label, field: oc.field, value: null, source: oc.source, confidence: oc.confidence, color: '#F59E0B' },
    ];
  };

  return (
    <div className="ht-card" style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recommended test: <strong>{cfg.test}</strong></div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 600, color: '#16A34A',
          background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20, padding: '3px 10px' }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="#16A34A"/><path d="M2.5 5l2 2 3-3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Variables mapped
        </div>
      </div>

      {/* Variable mapping */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Variable Mapping
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {varRows().map((r, i) => <VarRow key={i} {...r} />)}
      </div>

      {/* BU-level note for relationship */}
      {hType === 'relationship' && (
        <div style={{ fontSize: 10.5, color: '#6D28D9',
          background: '#F5F3FF', border: '1px solid #DDD6FE',
          borderRadius: 6, padding: '6px 10px', marginBottom: 14 }}>
          Correlation computed at <strong>business-unit level</strong> (22 BU means) to capture meaningful variation.
        </div>
      )}

      {/* Baseline note for one_sample */}
      {hType === 'one_sample' && parsed.baseline_value && (
        <div style={{ fontSize: 10.5, color: '#065F46',
          background: '#ECFDF5', border: '1px solid #A7F3D0',
          borderRadius: 6, padding: '6px 10px', marginBottom: 14 }}>
          Comparing against <strong>company baseline: {parsed.baseline_value}/5</strong>
        </div>
      )}

      {/* H0 / H1 */}
      <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px',
        border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>H₀</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>{parsed.h0}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A',
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>H₁</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>{parsed.h1}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} disabled={running}
          style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 12,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Edit
        </button>
        <button onClick={onRun} disabled={running}
          style={{ padding: '7px 20px', borderRadius: 6, border: 'none',
            background: cfg.color, color: '#fff', fontSize: 12,
            fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: running ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6 }}>
          {running
            ? <><span className="dpb-spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />Running…</>
            : `Run ${cfg.test} →`}
        </button>
      </div>
    </div>
  );
}

/* ── Verdict colours ─────────────────────────────────────── */
function verdictColor(v) {
  if (v === 'validated') return { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', circle: '#16A34A' };
  if (v === 'rejected')  return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', circle: '#DC2626' };
  return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', circle: '#F59E0B' };
}

/* ── Result banner (shared) ──────────────────────────────── */
function ResultBanner({ verdict, interpretation, statsLine, onToggle, showDetails }) {
  const vc = verdictColor(verdict);
  const label = verdict ? verdict.charAt(0).toUpperCase() + verdict.slice(1) : 'Inconclusive';
  return (
    <div className="ht-result-banner" style={{ background: vc.bg, border: `1px solid ${vc.border}` }}>
      <div className="ht-result-left">
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: vc.circle,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {verdict === 'validated'
            ? <svg width="22" height="22" viewBox="0 0 22 22"><path d="M4.5 11l4.5 4.5 8.5-8.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : verdict === 'rejected'
              ? <svg width="22" height="22" viewBox="0 0 22 22"><path d="M6 6l10 10M16 6L6 16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
              : <svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 8v5M11 14.5v.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          }
        </div>
        <div>
          <div className="ht-result-title" style={{ color: vc.text }}>
            Hypothesis <span style={{ fontWeight: 800 }}>{label}</span>
          </div>
          <div className="ht-result-desc">{interpretation}</div>
          <div className="ht-result-stats">{statsLine}</div>
        </div>
      </div>
      <button className="ht-details-btn" onClick={onToggle}>
        {showDetails ? 'Hide Details' : 'Show Details'}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transition: 'transform 0.2s', transform: showDetails ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Result: Pearson Correlation ─────────────────────────── */
function PearsonResult({ result, parsed }) {
  const [show, setShow] = useState(false);
  const r    = result.r;
  const rAbs = Math.abs(r);

  // p-value derivation: t-approximation used for Pearson r
  const n      = result.n || 2;
  const tStat  = n > 2 ? +(r * Math.sqrt((n - 2) / (1 - r * r))).toFixed(4) : 0;
  const phi    = normalCDF(Math.abs(tStat));
  const tail   = (1 - phi).toFixed(4);
  const pStep  = (2 * (1 - phi)).toFixed(4);
  const rColor = r > 0 ? '#16A34A' : '#DC2626';
  const statsLine = (
    <span style={{ display: 'flex', gap: 12 }}>
      <span>r = <strong>{r}</strong></span>
      <span className="ht-pipe">|</span>
      <span>p = <strong>{result.p_value}</strong></span>
      <span className="ht-pipe">|</span>
      <span>n = <strong>{result.n} BUs</strong></span>
      <span className="ht-pipe">|</span>
      <span>Strength: <strong>{result.strength}</strong></span>
    </span>
  );
  const xLabel = parsed?.x_var?.label || 'X';
  const yLabel = parsed?.y_var?.label || 'Y';

  return (
    <>
      <ResultBanner verdict={result.verdict} interpretation={result.interpretation}
        statsLine={statsLine} onToggle={() => setShow(v => !v)} showDetails={show} />
      {show && (
        <div className="ht-breakdown-card">
          <div className="ht-breakdown-title">Statistical Breakdown — Pearson Correlation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

            {/* Col 1: Hypothesis */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Hypothesis</div>
              <div className="ht-hyp-row"><span className="ht-hyp-label">H₀:</span><span className="ht-hyp-val">{result.h0}</span></div>
              <div className="ht-hyp-row"><span className="ht-hyp-label">H₁:</span><span className="ht-hyp-val">{result.h1}</span></div>
              <div className="ht-hyp-stack"><span className="ht-hyp-label">Test Type</span><span className="ht-hyp-val">Pearson Correlation</span></div>
              <div className="ht-hyp-stack"><span className="ht-hyp-label">Analysis Level</span><span className="ht-hyp-val">{result.n} business units</span></div>
            </div>

            {/* Col 2: Results */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Results</div>
              {/* r gauge */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
                  <span>-1 (strong neg)</span><span>0</span><span>+1 (strong pos)</span>
                </div>
                <div style={{ position: 'relative', height: 8, background: 'linear-gradient(to right, #EF4444, #E2E8F0, #22C55E)', borderRadius: 4 }}>
                  <div style={{
                    position: 'absolute', top: -3, width: 14, height: 14, borderRadius: '50%',
                    background: rColor, border: '2px solid #fff',
                    left: `calc(${((r + 1) / 2) * 100}% - 7px)`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: rColor }}>r = {r}</span>
                </div>
              </div>
              <table className="ht-res-table">
                <tbody>
                  {[
                    { l: 'Pearson r',        v: r },
                    { l: 'p-value',          v: result.p_value },
                    { l: 'Significant?',     v: result.significant ? 'Yes (p < 0.05)' : 'No (p ≥ 0.05)' },
                    { l: 'Correlation',      v: result.strength },
                    { l: 'Direction',        v: r > 0 ? 'Positive' : 'Negative' },
                  ].map(({ l, v }) => (
                    <tr key={l}>
                      <td className="ht-res-label">{l}</td>
                      <td className="ht-res-val">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Col 3: BU data table */}
            <div className="ht-bc">
              <div className="ht-bc-head">Business Unit Data ({result.n} BUs)</div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>BU</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#8B5CF6', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>X</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#EC4899', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.bu_pairs || []).map(({ bu, x, y }) => (
                      <tr key={bu}>
                        <td style={{ padding: '2px 6px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{bu}</td>
                        <td style={{ padding: '2px 6px', textAlign: 'center', fontWeight: 600, color: '#6D28D9', borderBottom: '1px solid var(--border)' }}>{x}</td>
                        <td style={{ padding: '2px 6px', textAlign: 'center', fontWeight: 600, color: '#DB2777', borderBottom: '1px solid var(--border)' }}>{y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                X = {xLabel}, Y = {yLabel}
              </div>
            </div>

          </div>

          {/* Formula + p derivation */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="ht-bc-head">Formula</div>
                <div className="ht-formula-wrap" style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {result.working?.formula}
                  </span>
                </div>
              </div>
              <div>
                <div className="ht-bc-head">p-value Derivation</div>
                <div className="ht-pz-block" style={{ marginTop: 0 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.9 }}>
                    <div>t = r × √((n−2) / (1−r²))</div>
                    <div style={{ color: 'var(--text-muted)' }}>  = {r} × √(({n}−2) / (1−{r}²)) = {tStat}</div>
                    <div style={{ marginTop: 4 }}>p = 2 × (1 − Φ(|t|))</div>
                    <div style={{ color: 'var(--text-muted)' }}>  = 2 × (1 − {phi.toFixed(4)})</div>
                    <div style={{ color: 'var(--text-muted)' }}>  = 2 × {tail}</div>
                    <div style={{ fontWeight: 700, color: result.p_value < 0.05 ? '#16A34A' : '#F59E0B' }}>
                      {'  '}= {pStep}  {result.p_value < 0.05 ? '< 0.05 ✓' : '≥ 0.05'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Considered */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="ht-bc-head" style={{ marginBottom: 8 }}>Data Considered</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>
              Source: <strong style={{ color: 'var(--text-secondary)' }}>question_bu_scores.json</strong>
              {' '}— pre-aggregated mean scores per business unit (no individual rows used)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { role: 'X — Predictor', label: parsed?.x_var?.label || 'X variable', field: parsed?.x_var?.question_id || parsed?.x_var?.field, color: '#8B5CF6' },
                { role: 'Y — Outcome',   label: parsed?.y_var?.label || 'Y variable', field: parsed?.y_var?.question_id || parsed?.y_var?.field, color: '#EC4899' },
              ].map(v => (
                <div key={v.role} style={{
                  background: '#F8FAFC', border: `1px solid ${v.color}30`,
                  borderRadius: 7, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: v.color, marginBottom: 6 }}>{v.role}</div>
                  <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--text-muted)', lineHeight: 2 }}>
                    <div>field: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{v.field}</span></div>
                    <div>↓ lookup mean score per BU</div>
                    <div>↓ <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{n} BU data points</span> aligned by name</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              BU-level means (not individual respondents) are used so that correlations capture meaningful variation across business units rather than being compressed by the 5-point scale.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Result: Two-Sample Z ────────────────────────────────── */
function TwoSampleResult({ result, parsed }) {
  const [show, setShow] = useState(false);
  const ga = parsed?.group_a || {};
  const gb = parsed?.group_b || {};
  const oc = parsed?.outcome  || {};
  const maxMean = Math.max(result.mean_a, result.mean_b, 0.01);

  // p-value derivation steps
  const absZ  = Math.abs(result.z);
  const phi   = normalCDF(absZ);
  const tail  = (1 - phi).toFixed(4);
  const pStep = (2 * (1 - phi)).toFixed(4);
  const statsLine = (
    <span style={{ display: 'flex', gap: 12 }}>
      <span>Z = <strong>{result.z}</strong></span>
      <span className="ht-pipe">|</span>
      <span>p = <strong>{result.p_value}</strong></span>
      <span className="ht-pipe">|</span>
      <span>Effect size = <strong>{result.effect_size}</strong></span>
    </span>
  );

  return (
    <>
      <ResultBanner verdict={result.verdict} interpretation={result.interpretation}
        statsLine={statsLine} onToggle={() => setShow(v => !v)} showDetails={show} />
      {show && (
        <div className="ht-breakdown-card">
          <div className="ht-breakdown-title">Statistical Breakdown — Two-Sample Z-Test</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>

            {/* Col 1: Hypothesis */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Hypothesis</div>
              <div className="ht-hyp-row"><span className="ht-hyp-label">H₀:</span><span className="ht-hyp-val">{result.h0}</span></div>
              <div className="ht-hyp-row"><span className="ht-hyp-label">H₁:</span><span className="ht-hyp-val">{result.h1}</span></div>
              <div className="ht-hyp-stack"><span className="ht-hyp-label">Test Type</span><span className="ht-hyp-val">Two-Sample Z-Test</span></div>
              <div className="ht-hyp-stack"><span className="ht-hyp-label">Outcome</span><span className="ht-hyp-val">{oc.label}</span></div>
            </div>

            {/* Col 2: Group means comparison */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Group Comparison</div>
              {[
                { label: ga.label || 'Group A', mean: result.mean_a, n: result.n_a, std: result.std_a, color: '#3B82F6' },
                { label: gb.label || 'Group B', mean: result.mean_b, n: result.n_b, std: result.std_b, color: '#64748B' },
              ].map(g => (
                <div key={g.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: g.color }}>{g.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: g.color }}>x̄ = {g.mean}</span>
                  </div>
                  <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(g.mean / 5) * 100}%`, height: '100%', background: g.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    n = {g.n.toLocaleString()}  |  σ = {g.std}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 6, padding: '5px 8px', background: '#F8FAFC',
                borderRadius: 5, fontSize: 10.5, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Difference: <strong>{Math.abs(result.mean_a - result.mean_b).toFixed(3)}</strong>
                {' '}| Effect size (Cohen's d): <strong>{result.effect_size}</strong>
              </div>
            </div>

            {/* Col 3: Results table */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Results</div>
              <table className="ht-res-table">
                <tbody>
                  {[
                    { l: 'Z (test statistic)', v: result.z },
                    { l: 'p-value',             v: result.p_value },
                    { l: 'Significant?',        v: result.significant ? 'Yes (p < 0.05)' : 'No' },
                    { l: 'Effect size',         v: `${result.effect_size} ${result.effect_size > 0.8 ? '(large)' : result.effect_size > 0.5 ? '(medium)' : '(small)'}` },
                    { l: 'Conclusion',          v: (
                      <span style={{ fontWeight: 700, color: result.verdict === 'validated' ? '#16A34A' : '#DC2626' }}>
                        {result.verdict?.charAt(0).toUpperCase() + result.verdict?.slice(1)}
                      </span>
                    )},
                  ].map(({ l, v }) => (
                    <tr key={l}>
                      <td className="ht-res-label">{l}</td>
                      <td className="ht-res-val">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Col 4: Formula */}
            <div className="ht-bc">
              <div className="ht-bc-head">Underlying Working</div>
              <div className="ht-formula-wrap">
                <div className="ht-formula-line">
                  <span className="ht-f-var">Z</span>
                  <span className="ht-f-eq">=</span>
                  <Frac num="X̄ₐ − X̄ᵦ" den="√(σₐ²/nₐ + σᵦ²/nᵦ)" />
                </div>
                <div className="ht-formula-line" style={{ marginTop: 6 }}>
                  <span className="ht-f-var" style={{ fontSize: 10 }}>Z</span>
                  <span className="ht-f-eq">=</span>
                  <Frac
                    num={`${result.mean_a} − ${result.mean_b}`}
                    den={`√(${result.std_a}²/${result.n_a} + ${result.std_b}²/${result.n_b})`}
                  />
                  <span className="ht-f-eq">=</span>
                  <span className="ht-f-result">{result.z}</span>
                </div>
              </div>
              <div className="ht-pz-block">
                <div className="ht-pz-head">p-value Derivation</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.9 }}>
                  <div>p = 2 × (1 − Φ(|Z|))</div>
                  <div style={{ color: 'var(--text-muted)' }}>  = 2 × (1 − Φ(|{result.z}|))</div>
                  <div style={{ color: 'var(--text-muted)' }}>  = 2 × (1 − {phi.toFixed(4)})</div>
                  <div style={{ color: 'var(--text-muted)' }}>  = 2 × {tail}</div>
                  <div style={{ fontWeight: 700, color: result.p_value < 0.05 ? '#16A34A' : '#F59E0B' }}>
                    {'  '}= {pStep}  {result.p_value < 0.05 ? '< 0.05 ✓' : '≥ 0.05'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Data Considered ── */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="ht-bc-head" style={{ marginBottom: 8 }}>Data Considered</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>
              Source: <strong style={{ color: 'var(--text-secondary)' }}>responses.json</strong>
              {' '}— filtered by <strong style={{ color: 'var(--text-secondary)' }}>{ga.field || 'group field'}</strong>
              , extracted <strong style={{ color: 'var(--text-secondary)' }}>{oc.field || 'outcome'}</strong> score per respondent
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: ga.label || 'Group A', field: ga.field, value: ga.value, mean: result.mean_a, std: result.std_a, n: result.n_a, color: '#3B82F6' },
                { label: gb.label || 'Group B', field: gb.field, value: gb.value, mean: result.mean_b, std: result.std_b, n: result.n_b, color: '#64748B' },
              ].map(g => (
                <div key={g.label} style={{
                  background: '#F8FAFC', border: `1px solid ${g.color}30`,
                  borderRadius: 7, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: g.color, marginBottom: 6 }}>{g.label}</div>
                  <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--text-muted)', lineHeight: 2 }}>
                    <div>filter: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{g.field} = "{g.value}"</span></div>
                    <div>↓ matched <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{(g.n || 0).toLocaleString()} respondents</span></div>
                    <div>↓ extract <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{oc.field}</span> score per row</div>
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed var(--border)' }}>
                      x̄ = <strong style={{ color: g.color }}>{g.mean}</strong>
                      {'  '}σ = <strong style={{ color: g.color }}>{g.std}</strong>
                      {'  '}n = <strong style={{ color: g.color }}>{(g.n || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </>
  );
}

/* ── Result: One-Sample Z ────────────────────────────────── */
function OneSampleResult({ result, parsed }) {
  const [show, setShow] = useState(false);

  // p-value derivation steps
  const absZ  = Math.abs(result.z);
  const phi   = normalCDF(absZ);
  const tail  = (1 - phi).toFixed(4);
  const pStep = (2 * (1 - phi)).toFixed(4);
  const statsLine = (
    <span style={{ display: 'flex', gap: 12 }}>
      <span>Z = <strong>{result.z}</strong></span>
      <span className="ht-pipe">|</span>
      <span>p = <strong>{result.p_value}</strong></span>
      <span className="ht-pipe">|</span>
      <span>n = <strong>{result.n?.toLocaleString()}</strong></span>
    </span>
  );
  return (
    <>
      <ResultBanner verdict={result.verdict} interpretation={result.interpretation}
        statsLine={statsLine} onToggle={() => setShow(v => !v)} showDetails={show} />
      {show && (
        <div className="ht-breakdown-card">
          <div className="ht-breakdown-title">Statistical Breakdown — One-Sample Z-Test</div>
          <div className="ht-breakdown-grid">

            {/* Col 1 */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Hypothesis</div>
              <div className="ht-hyp-row"><span className="ht-hyp-label">H₀:</span><span className="ht-hyp-val">{result.h0}</span></div>
              <div className="ht-hyp-row"><span className="ht-hyp-label">H₁:</span><span className="ht-hyp-val">{result.h1}</span></div>
              <div className="ht-hyp-stack"><span className="ht-hyp-label">Test Type</span><span className="ht-hyp-val">One-Sample Z-Test</span></div>
              <div className="ht-hyp-stack"><span className="ht-hyp-label">α (confidence)</span><span className="ht-hyp-val">0.05</span></div>
            </div>

            {/* Col 2 */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Results</div>
              <table className="ht-res-table">
                <tbody>
                  {[
                    { l: 'Z (test statistic)', v: result.z },
                    { l: 'p-value',            v: result.p_value },
                    { l: 'Critical Z (α=0.05)',v: result.critical_z ?? 1.645 },
                    { l: 'Sample mean',        v: result.sample_mean },
                    { l: 'Baseline mean',      v: result.pop_mean },
                    { l: 'Conclusion',         v: (
                      <span style={{ fontWeight: 700, color: result.verdict === 'validated' ? '#16A34A' : '#DC2626' }}>
                        {result.verdict?.charAt(0).toUpperCase() + result.verdict?.slice(1)}
                      </span>
                    )},
                  ].map(({ l, v }) => (
                    <tr key={l}><td className="ht-res-label">{l}</td><td className="ht-res-val">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Col 3: Bell curve */}
            <div className="ht-bc ht-bc-divider">
              <div className="ht-bc-head">Visual Representation</div>
              <BellCurve critZ={result.critical_z ?? 1.645} testZ={result.z} />
            </div>

            {/* Col 4: Working */}
            <div className="ht-bc">
              <div className="ht-bc-head">Underlying Working</div>
              <div className="ht-formula-wrap">
                <div className="ht-formula-line">
                  <span className="ht-f-var">Z</span>
                  <span className="ht-f-eq">=</span>
                  <Frac num="X̄ − μ₀" den="σ / √n" />
                  <span className="ht-f-eq">=</span>
                  <Frac
                    num={`${result.sample_mean} − ${result.pop_mean}`}
                    den={`${result.working?.sigma} / √${result.n}`}
                  />
                  <span className="ht-f-eq">=</span>
                  <span className="ht-f-result">{result.z}</span>
                </div>
              </div>
              <div className="ht-pz-block">
                <div className="ht-pz-head">p-value Derivation</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.9 }}>
                  <div>p = 2 × (1 − Φ(|Z|))</div>
                  <div style={{ color: 'var(--text-muted)' }}>  = 2 × (1 − Φ(|{result.z}|))</div>
                  <div style={{ color: 'var(--text-muted)' }}>  = 2 × (1 − {phi.toFixed(4)})</div>
                  <div style={{ color: 'var(--text-muted)' }}>  = 2 × {tail}</div>
                  <div style={{ fontWeight: 700, color: result.p_value < 0.05 ? '#16A34A' : '#F59E0B' }}>
                    {'  '}= {pStep}  {result.p_value < 0.05 ? '< 0.05 ✓' : '≥ 0.05'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Considered */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="ht-bc-head" style={{ marginBottom: 8 }}>Data Considered</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>
              Source: <strong style={{ color: 'var(--text-secondary)' }}>responses.json</strong>
              {' '}— filtered by <strong style={{ color: 'var(--text-secondary)' }}>{parsed?.group?.field || 'demographic field'}</strong>
              , extracted <strong style={{ color: 'var(--text-secondary)' }}>{parsed?.outcome?.field || 'outcome'}</strong> score per respondent,
              compared against company-wide baseline
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginBottom: 6 }}>Sample Group</div>
                <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--text-muted)', lineHeight: 2 }}>
                  <div>filter: <span style={{ color: '#065F46', fontWeight: 600 }}>{parsed?.group?.field} = "{parsed?.group?.value}"</span></div>
                  <div>↓ matched <span style={{ color: '#065F46', fontWeight: 600 }}>{(result.n || 0).toLocaleString()} respondents</span></div>
                  <div>↓ extract <span style={{ color: '#065F46', fontWeight: 600 }}>{parsed?.outcome?.field}</span> score per row</div>
                  <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed #A7F3D0' }}>
                    x̄ = <strong style={{ color: '#16A34A' }}>{result.sample_mean}</strong>
                    {'  '}σ = <strong style={{ color: '#16A34A' }}>{result.working?.sigma}</strong>
                  </div>
                </div>
              </div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>Population Baseline</div>
                <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--text-muted)', lineHeight: 2 }}>
                  <div>source: <span style={{ color: '#1E40AF', fontWeight: 600 }}>all active respondents</span></div>
                  <div>field: <span style={{ color: '#1E40AF', fontWeight: 600 }}>{parsed?.outcome?.field}</span></div>
                  <div>↓ compute company-wide mean</div>
                  <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed #BFDBFE' }}>
                    μ₀ = <strong style={{ color: '#1D4ED8' }}>{result.pop_mean}</strong>
                    {'  '}(company average)
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </>
  );
}

/* ── formatFilters ───────────────────────────────────────── */
function formatFilters(f) {
  if (!f || !Object.keys(f).length) return 'No filters';
  return Object.entries(f).filter(([, v]) => v && v !== 'All')
    .map(([k, v]) => `${k}: ${v}`).join(' | ') || 'No filters';
}

/* ── Page ────────────────────────────────────────────────── */
export default function HypothesisTestingPage() {
  const { setBreadcrumb, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([{ label: 'Explore' }, { label: 'Hypothesis Testing' }]);
  }, []);

  // Stage: 'input' | 'parsing' | 'confirm' | 'running' | 'done'
  const [stage,     setStage]     = useState('input');
  const [input,     setInput]     = useState('');
  const [parsed,    setParsed]    = useState(null);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [templates,         setTemplates]         = useState([]);
  const [history,           setHistory]           = useState([]);
  const [templatesLoading,  setTemplatesLoading]  = useState(true);
  const [historyLoading,    setHistoryLoading]    = useState(true);

  // Broadcast screen context
  useEffect(() => {
    setActiveScreenContext({
      tab: 'hypothesis_testing',
      hypothesis_text: input || null,
      parsed_hypothesis: parsed || null,
      result: result ? {
        type: result.type,
        conclusion: result.conclusion,
        significant: result.significant,
        p_value: result.p_value,
        columns_used: result.columns_used,
      } : null,
    });
  }, [input, parsed, result]);

  const loadHistory = useCallback(async () => {
    try {
      const res  = await apiFetch('/api/hypothesis/history?limit=20');
      const data = await res.json();
      setHistory(data.items || []);
    } catch {} finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch('/api/hypothesis/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
    loadHistory();
  }, [loadHistory]);

  /* ── Step 1: Analyze → parse ─────────────────────────── */
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setStage('parsing');
    setError(null);
    setParsed(null);
    setResult(null);
    try {
      const res  = await apiFetch('/api/hypothesis/parse', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hypothesis_text: input }),
      });
      const data = await res.json();
      if (!data.parseable) {
        setError(data.parse_error || 'Could not map this hypothesis to survey variables.');
        setStage('input');
        return;
      }
      setParsed(data);
      setStage('confirm');
    } catch {
      setError('Connection error. Make sure the server is running.');
      setStage('input');
    }
  };

  /* ── Step 2: Run test ────────────────────────────────── */
  const handleRunTest = async () => {
    setStage('running');
    setError(null);
    try {
      const res  = await apiFetch('/api/hypothesis/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hypothesis_text: input, parsed, alpha: 0.05 }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Test failed.');
        setStage('confirm');
        return;
      }
      setResult(data.result);
      setStage('done');
      loadHistory();
    } catch {
      setError('Connection error. Make sure the server is running.');
      setStage('confirm');
    }
  };

  const handleEdit = () => { setStage('input'); setError(null); };

  const handleNewTest = () => {
    setStage('input');
    setResult(null);
    setParsed(null);
    setError(null);
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/hypothesis/history/${id}`, { method: 'DELETE' });
      loadHistory();
    } catch {}
  };

  const useTemplate = (t) => {
    setInput(t.text);
    setResult(null);
    setParsed(null);
    setError(null);
    setStage('input');
  };

  /* ── Result component router ─────────────────────────── */
  const renderResult = () => {
    if (!result) return null;
    const tt = result.test_type || result.hypothesis_type;
    if (tt === 'pearson_correlation') return <PearsonResult result={result} parsed={result.parsed} />;
    if (tt === 'two_sample_z')       return <TwoSampleResult result={result} parsed={result.parsed} />;
    return <OneSampleResult result={result} parsed={result.parsed} />;
  };

  return (
    <div className="page-container">

      {/* ── Top row: Input + Templates ── */}
      <div className="ht-top-grid">

        {/* Left: Input */}
        <div className="ht-card">
          <div className="ht-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>1. Enter Your Hypothesis<InfoTip tip="Type a plain-language hypothesis; the system automatically detects the test type (one-sample Z, two-sample Z, or Pearson correlation) and maps your words to survey variables." /></div>
          <div className="ht-section-sub">
            Write a natural-language hypothesis. The system detects the test type and maps variables automatically.
          </div>
          <div className="ht-textarea-wrap">
            <textarea
              className="ht-textarea"
              maxLength={500}
              value={input}
              onChange={e => { setInput(e.target.value); if (stage !== 'input') setStage('input'); }}
              placeholder="Examples:&#10;• Managers trust Leadership more than Individual Contributors.&#10;• Higher Career Development scores lead to higher Engagement.&#10;• Gen Z employees score higher on Onboarding than the company average."
              disabled={stage === 'parsing' || stage === 'running'}
            />
            <div className="ht-char-count">{input.length} / 500</div>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: '#DC2626', background: '#FEF2F2',
              border: '1px solid #FECACA', borderRadius: 6, padding: '7px 10px',
              marginBottom: 8, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {stage === 'done' && (
              <button onClick={handleNewTest}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ← New Test
              </button>
            )}
            <button
              className="ht-test-btn"
              onClick={handleAnalyze}
              disabled={!input.trim() || stage === 'parsing' || stage === 'running'}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {stage === 'parsing'
                ? <><span className="dpb-spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />Analyzing…</>
                : 'Analyze Hypothesis →'
              }
            </button>
          </div>

          {/* Detected test type hint */}
          {stage === 'confirm' && parsed && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7,
              fontSize: 11, color: '#065F46', background: '#ECFDF5',
              border: '1px solid #A7F3D0', borderRadius: 6, padding: '5px 10px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="6" fill="#16A34A"/><path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Detected: <strong>{TYPE_CONFIG[parsed.hypothesis_type]?.label}</strong>
              {' '}→ <strong>{TYPE_CONFIG[parsed.hypothesis_type]?.test}</strong>
            </div>
          )}
        </div>

        {/* Right: Templates */}
        <div className="ht-card">
          <div className="ht-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Try a Template<InfoTip tip="Pre-built example hypotheses covering common engagement comparisons — click any to load it into the input box." /></div>
          <div className="ht-templates-list">
            {templatesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <Skeleton width={14} height={14} variant="card" />
                  <Skeleton width="80%" height={11} />
                </div>
              ))
            ) : templates.map(t => (
              <button key={t.id} className="ht-template-row" onClick={() => useTemplate(t)}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="#94A3B8" strokeWidth="1.2"/>
                  <path d="M4.5 5h6M4.5 7.5h6M4.5 10h4" stroke="#94A3B8" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                <span className="ht-template-text">{t.text}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                  <path d="M5 3.5l3.5 3.5L5 10.5" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Parsing skeleton ── */}
      {stage === 'parsing' && (
        <div className="ht-card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <Skeleton width="40%" height={13} />
              <div style={{ marginTop: 6 }}><Skeleton width="55%" height={10} /></div>
            </div>
            <Skeleton width={100} height={24} variant="card" />
          </div>
          <Skeleton width="25%" height={9} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, marginBottom: 14 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 10,
                padding: '7px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid var(--border)' }}>
                <Skeleton width={60} height={18} variant="card" />
                <div><Skeleton width="70%" height={12} /><div style={{ marginTop: 4 }}><Skeleton width="50%" height={10} /></div></div>
                <Skeleton width={60} height={10} />
              </div>
            ))}
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '10px 12px',
            border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ marginBottom: 6 }}><Skeleton width="90%" height={11} /></div>
            <Skeleton width="85%" height={11} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Skeleton width={70} height={32} variant="card" />
            <Skeleton width={120} height={32} variant="card" />
          </div>
        </div>
      )}

      {/* ── Step 2: Confirmation card ── */}
      {(stage === 'confirm' || stage === 'running') && parsed && (
        <ConfirmCard
          parsed={parsed}
          onRun={handleRunTest}
          onEdit={handleEdit}
          running={stage === 'running'}
        />
      )}

      {/* ── Running skeleton (result placeholder) ── */}
      {stage === 'running' && (
        <div style={{ marginTop: 16, borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--card-bg)', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Skeleton width={42} height={42} variant="circle" />
            <div style={{ flex: 1 }}>
              <Skeleton width="45%" height={14} />
              <div style={{ marginTop: 6 }}><Skeleton width="70%" height={11} /></div>
              <div style={{ marginTop: 5 }}><Skeleton width="55%" height={10} /></div>
            </div>
            <Skeleton width={100} height={30} variant="card" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none', paddingRight: i < 3 ? 16 : 0 }}>
                <Skeleton width="60%" height={11} />
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[1, 2, 3, 4].map(j => <Skeleton key={j} width={j % 2 === 0 ? '80%' : '65%'} height={10} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Result ── */}
      {stage === 'done' && result && renderResult()}

      {/* ── Previous Hypotheses ── */}
      <div className="ht-history-card">
        <div className="ht-history-hdr">
          <span className="ht-section-label" style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Previous Hypotheses<InfoTip tip="A log of all hypotheses tested in this session, showing the outcome (Validated / Rejected), test type, and p-value for each." /></span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ht-history-table">
            <colgroup>
              <col style={{ width: '58px' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '96px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '58px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '92px' }} />
              <col style={{ width: '68px' }} />
            </colgroup>
            <thead>
              <tr>
                {['ID','Hypothesis','Result','Test Type','p-value','Test Date','','Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width={28} height={10} /></td>
                    <td><Skeleton width="85%" height={10} /></td>
                    <td><Skeleton width={60} height={18} variant="card" /></td>
                    <td><Skeleton width={70} height={10} /></td>
                    <td><Skeleton width={36} height={10} /></td>
                    <td><Skeleton width={60} height={10} /></td>
                    <td></td>
                    <td><Skeleton width={24} height={24} variant="card" /></td>
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)',
                    fontSize: 11, padding: '16px 0' }}>
                    No hypotheses tested yet.
                  </td>
                </tr>
              ) : history.map(h => (
                <tr key={h.id}>
                  <td className="ht-id">{h.id}</td>
                  <td className="ht-hyp-text">{h.hypothesis}</td>
                  <td><ResultBadge result={h.result} /></td>
                  <td style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {h.test_type?.replace(/_/g, ' ')}
                  </td>
                  <td>{typeof h.p_value === 'number' ? h.p_value.toFixed(4) : '—'}</td>
                  <td className="ht-date">{h.date_tested}</td>
                  <td></td>
                  <td>
                    <button className="ht-act-btn ht-act-del" title="Delete"
                      onClick={() => handleDelete(h.id)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.5 7.5h6L10.5 4"
                          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6.5v3.5M8 6.5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
