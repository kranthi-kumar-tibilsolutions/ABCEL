import { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';

/* ── Bell Curve SVG ──────────────────────────────────────── */
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
  const testXpx = toX(testZ);
  const axisY   = 106;

  const rejPts = pts.filter(([x]) => x >= critXpx - 1);
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
      <text x={testXpx} y={axisY + 12} textAnchor="middle" fontSize="9" fill="#16A34A" fontFamily="inherit">{testZ}</text>
      <line x1="20" y1={H - 8} x2="38" y2={H - 8} stroke="#94A3B8" strokeWidth="1.3" strokeDasharray="4,2" />
      <text x="42" y={H - 4} fontSize="8" fill="#94A3B8" fontFamily="inherit">Critical Z (α = 0.05)</text>
      <rect x="145" y={H - 14} width="10" height="9" fill="url(#hatch)" stroke="#86EFAC" strokeWidth="0.5" />
      <text x="159" y={H - 4} fontSize="8" fill="#94A3B8" fontFamily="inherit">Rejection Region</text>
    </svg>
  );
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

/* ── Result badge (table) ────────────────────────────────── */
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

function formatFilters(filtersApplied) {
  if (!filtersApplied || !Object.keys(filtersApplied).length) return 'No filters applied';
  return Object.entries(filtersApplied)
    .filter(([, v]) => v && v !== 'All')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ') || 'No filters applied';
}

/* ── Page ────────────────────────────────────────────────── */
export default function HypothesisTestingPage() {
  const { setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([{ label: 'Explore' }, { label: 'Hypothesis Testing' }]);
  }, []);

  const [input,       setInput]       = useState('');
  const [result,      setResult]      = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [templates,   setTemplates]   = useState([]);
  const [history,     setHistory]     = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const res  = await apiFetch('/api/hypothesis/history?limit=20');
      const data = await res.json();
      setHistory(data.items || []);
    } catch {}
  }, []);

  useEffect(() => {
    apiFetch('/api/hypothesis/templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
    loadHistory();
  }, [loadHistory]);

  const handleTest = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res  = await apiFetch('/api/hypothesis/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hypothesis_text: input, filters: {}, alpha: 0.05 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Test failed. Please try rephrasing your hypothesis.');
      } else {
        const r = data.result;
        const verdict = r.verdict || 'inconclusive';
        setResult({
          status:          verdict === 'validated' ? 'Validated' : verdict === 'rejected' ? 'Rejected' : 'Inconclusive',
          description:     r.interpretation || '',
          z:               r.z,
          pz:              r.p_value,
          alpha:           r.alpha,
          h0:              r.h0,
          ha:              r.h1,
          testType:        r.test_type,
          confidenceLevel: String(r.alpha),
          criticalZ:       r.critical_z,
          decision:        r.decision,
          sampleMean:      r.sample_mean,
          popMean:         r.pop_mean,
          stdDev:          r.std_dev,
          sampleSize:      r.n,
          working:         r.working || {},
          columnsUsed:     r.columns_used || [],
        });
        setShowDetails(true);
        loadHistory();
      }
    } catch {
      setError('Connection error. Make sure the server is running.');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/hypothesis/history/${id}`, { method: 'DELETE' });
      loadHistory();
    } catch {}
  };

  const r = result || {};

  return (
    <div className="page-container">
      {/* ── Top two-column row ── */}
      <div className="ht-top-grid">

        {/* Left: Enter hypothesis */}
        <div className="ht-card">
          <div className="ht-section-label">1. Enter Your Hypothesis</div>
          <div className="ht-section-sub">Write a hypothesis using questions or fields from your HR survey.</div>
          <div className="ht-textarea-wrap">
            <textarea
              className="ht-textarea"
              maxLength={500}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Example: Employees who rate 'Career Growth Opportunities' high (score ≥ 4) have higher Engagement scores (mean > 3.5) than those who rate it low (score < 3).`}
            />
            <div className="ht-char-count">{input.length} / 500</div>
          </div>
          {error && (
            <div style={{
              fontSize: 11, color: '#DC2626',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 6, padding: '7px 10px', marginBottom: 8, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
          <div>
            <button className="ht-test-btn" onClick={handleTest} disabled={!input.trim() || loading}>
              {loading ? 'Analysing…' : 'Test Hypothesis'}
            </button>
          </div>
        </div>

        {/* Right: Templates */}
        <div className="ht-card">
          <div className="ht-section-label">Try a Template</div>
          <div className="ht-templates-list">
            {templates.map(t => (
              <button key={t.id} className="ht-template-row" onClick={() => { setInput(t.text); setResult(null); setError(null); }}>
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
          <button className="ht-view-all-link">View all templates</button>
        </div>
      </div>

      {/* ── Result section (shown after test) ── */}
      {result && (
        <>
          {/* Result banner */}
          <div className="ht-result-banner">
            <div className="ht-result-left">
              <div className={`ht-result-circle ${r.status === 'Validated' ? 'ht-circle-ok' : 'ht-circle-fail'}`}>
                {r.status === 'Validated'
                  ? <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M6 13l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M8 8l10 10M18 8L8 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
                }
              </div>
              <div>
                <div className="ht-result-title">
                  Result: Hypothesis{' '}
                  <span className={r.status === 'Validated' ? 'ht-green' : 'ht-red'}>{r.status}</span>
                </div>
                <div className="ht-result-desc">{r.description}</div>
                <div className="ht-result-stats">
                  <span>Z = <strong>{r.z}</strong></span>
                  <span className="ht-pipe">|</span>
                  <span>p(z) = <strong>{r.pz}</strong></span>
                  <span className="ht-pipe">|</span>
                  <span>α (confidence) = <strong>{r.alpha}</strong></span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6.5" stroke="#94A3B8" strokeWidth="1.2"/>
                    <circle cx="7" cy="4.5" r="0.7" fill="#94A3B8"/>
                    <rect x="6.4" y="6" width="1.2" height="3.8" rx="0.6" fill="#94A3B8"/>
                  </svg>
                </div>
              </div>
            </div>
            <button className="ht-details-btn" onClick={() => setShowDetails(v => !v)}>
              {showDetails ? 'Hide Details' : 'Show Details'}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ transition: 'transform 0.2s', transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Statistical breakdown */}
          {showDetails && (
            <div className="ht-breakdown-card">
              <div className="ht-breakdown-title">2. Statistical Breakdown (Z-Test)</div>
              <div className="ht-breakdown-grid">

                {/* Col 1 — Hypothesis */}
                <div className="ht-bc ht-bc-divider">
                  <div className="ht-bc-head">Hypothesis</div>
                  <div className="ht-hyp-row">
                    <span className="ht-hyp-label">H₀ (Null):</span>
                    <span className="ht-hyp-val">{r.h0}</span>
                  </div>
                  <div className="ht-hyp-row">
                    <span className="ht-hyp-label">Hₐ (Alternative):</span>
                    <span className="ht-hyp-val">{r.ha}</span>
                  </div>
                  <div className="ht-hyp-stack">
                    <span className="ht-hyp-label">Test Type</span>
                    <span className="ht-hyp-val">{r.testType}</span>
                  </div>
                  <div className="ht-hyp-stack">
                    <span className="ht-hyp-label">Confidence Level (α)</span>
                    <span className="ht-hyp-val">{r.confidenceLevel}</span>
                  </div>

                  {/* Columns used — shows which data fields drove the test */}
                  {r.columnsUsed?.length > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
                      <span className="ht-hyp-label" style={{ display:'block', marginBottom:6 }}>Data Fields Used</span>
                      {r.columnsUsed.map(c => (
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                          <span style={{
                            fontSize:8.5, fontWeight:700, letterSpacing:'0.03em',
                            padding:'2px 6px', borderRadius:4,
                            color:    c.role === 'outcome'   ? '#1D4ED8' : '#6D28D9',
                            background: c.role === 'outcome' ? '#EFF6FF' : '#F5F3FF',
                            border:   `1px solid ${c.role === 'outcome' ? '#BFDBFE' : '#DDD6FE'}`,
                            flexShrink: 0,
                          }}>
                            {c.role.toUpperCase()}
                          </span>
                          <span style={{ fontSize:11, color:'var(--text-primary)', fontWeight:500 }}>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Col 2 — Results */}
                <div className="ht-bc ht-bc-divider">
                  <div className="ht-bc-head">Results</div>
                  <table className="ht-res-table">
                    <tbody>
                      {[
                        { l: 'Z (test statistic)',    v: r.z },
                        { l: 'p(z) (one-tailed)',     v: r.pz },
                        { l: `Critical Z (α = ${r.alpha})`, v: r.criticalZ },
                        { l: 'Decision',              v: r.decision },
                        { l: 'Conclusion',            v: (
                          <span className={r.status === 'Validated' ? 'ht-green' : 'ht-red'} style={{ fontWeight: 700 }}>
                            Hypothesis {r.status}
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

                {/* Col 3 — Visual */}
                <div className="ht-bc ht-bc-divider">
                  <div className="ht-bc-head">Visual Representation</div>
                  <BellCurve critZ={r.criticalZ} testZ={r.z} />
                </div>

                {/* Col 4 — Underlying Working */}
                <div className="ht-bc">
                  <div className="ht-bc-head">Underlying Working</div>

                  <div className="ht-formula-wrap">
                    <div className="ht-formula-line">
                      <span className="ht-f-var">Z</span>
                      <span className="ht-f-eq">=</span>
                      <Frac num="X̄ − μ₀" den="σ / √n" />
                      <span className="ht-f-eq">=</span>
                      <Frac num={`${r.sampleMean} − ${r.popMean}`} den={`${r.stdDev} / √${r.sampleSize}`} />
                      <span className="ht-f-eq">=</span>
                      <span className="ht-f-result">{r.z}</span>
                    </div>
                  </div>

                  <div className="ht-legend">
                    {[
                      ['X̄',  `Sample mean (${r.sampleMean})`],
                      ['μ₀', `Hypothesized population mean (${r.popMean})`],
                      ['σ',  `Population standard deviation (${r.stdDev})`],
                      ['n',  `Sample size (${r.sampleSize})`],
                    ].map(([sym, def]) => (
                      <div key={sym} className="ht-legend-row">
                        <span className="ht-legend-sym">{sym}</span>
                        <span className="ht-legend-eq">=</span>
                        <span className="ht-legend-def">{def}</span>
                      </div>
                    ))}
                  </div>

                  <div className="ht-pz-block">
                    <div className="ht-pz-head">p(z) Interpretation</div>
                    <div className="ht-pz-text">
                      p(z) = {r.pz} {r.pz < r.alpha ? 'is less than' : 'is greater than'} α = {r.alpha},<br />
                      so the result is {r.pz < r.alpha ? 'statistically significant.' : 'not statistically significant.'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* ── Previous Hypotheses ── */}
      <div className="ht-history-card">
        <div className="ht-history-hdr">
          <span className="ht-section-label" style={{ fontSize: 14 }}>Previous Hypotheses</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ht-history-table">
            <colgroup>
              <col style={{ width: '58px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '96px' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '58px' }} />
              <col style={{ width: '88px' }} />
              <col style={{ width: '92px' }} />
              <col style={{ width: '68px' }} />
            </colgroup>
            <thead>
              <tr>
                {['ID','Hypothesis','Result','Filters Applied','p(z)','α (Confidence)','Date Tested','Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: '16px 0' }}>
                    No hypotheses tested yet. Run a test above to see results here.
                  </td>
                </tr>
              ) : history.map(h => (
                <tr key={h.id}>
                  <td className="ht-id">{h.id}</td>
                  <td className="ht-hyp-text">{h.hypothesis}</td>
                  <td><ResultBadge result={h.result} /></td>
                  <td className="ht-filters">{formatFilters(h.filters_applied)}</td>
                  <td>{typeof h.p_value === 'number' ? h.p_value.toFixed(4) : h.p_value}</td>
                  <td>{h.alpha}</td>
                  <td className="ht-date">{h.date_tested}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ht-act-btn" title="View">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <ellipse cx="7" cy="7" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="7" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                      </button>
                      <button className="ht-act-btn ht-act-del" title="Delete" onClick={() => handleDelete(h.id)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.5 7.5h6L10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 6.5v3.5M8 6.5v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ht-view-all-row">
          <button className="ht-view-all-link">View all hypotheses →</button>
        </div>
      </div>

    </div>
  );
}
