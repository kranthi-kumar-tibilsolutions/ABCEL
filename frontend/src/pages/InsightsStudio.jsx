import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import Skeleton   from '../components/shared/Skeleton';
import InfoTip    from '../components/shared/InfoTip';

const SKILLS = [
  { id: 'leadership-effectiveness', label: 'Leadership Effectiveness' },
  { id: 'communication',            label: 'Communication' },
  { id: 'recognition-reward',       label: 'Recognition & Reward' },
  { id: 'growth-development',       label: 'Growth & Development' },
  { id: 'work-life-balance',        label: 'Work-Life Balance' },
  { id: 'team-collaboration',       label: 'Team Collaboration' },
  { id: 'psychological-safety',     label: 'Psychological Safety' },
  { id: 'manager-support',          label: 'Manager Support' },
];

const DIMENSIONS = ['Business Unit','Gender','Generation','Tenure','Job Band'];

export default function InsightsStudio() {
  const { page, setBreadcrumb, setActiveScreenContext } = useContext(AppContext);

  useEffect(() => {
    if (page !== 'insights-studio') return;
    setBreadcrumb([
      { label: 'Overview', page: 'overview' },
      { label: 'Insights Studio' },
    ]);
    setActiveScreenContext({ tab: 'insights_studio', description: 'Insights Studio — custom cross-dimension analysis and engagement driver exploration.' });
  }, [page]);

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [dimension,      setDimension]      = useState('Business Unit');
  const [result,         setResult]         = useState(null);
  const [steps,          setSteps]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);

  const toggleSkill = (id) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setResult(null); setError(null); setSteps([]);
  };

  const runAnalysis = async () => {
    if (!selectedSkills.length || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setSteps([]);

    try {
      const res = await apiFetch('/api/skill-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ skills: selectedSkills, dimension }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.error) {
              setError(evt.error);
            } else if (evt.result) {
              setResult(evt.result);
            } else if (evt.step !== undefined) {
              setSteps(prev => {
                const updated = [...prev];
                const idx = updated.findIndex(s => s.step === evt.step);
                if (idx >= 0) updated[idx] = evt;
                else updated.push(evt);
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">

      {/* Config panel */}
      <div className="chart-card">
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Select Skills to Analyse</span><InfoTip tip="Choose one or more engagement skill areas; the AI agent will analyse how each performs across the selected dimension (Business Unit, Gender, Generation, etc.)." /></div>
        <div className="skill-pills">
          {SKILLS.map(s => (
            <button
              key={s.id}
              className={`skill-pill ${selectedSkills.includes(s.id) ? 'active' : ''}`}
              onClick={() => toggleSkill(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Analyse by Dimension
            </label>
            <select
              className="bu-filter-select"
              style={{ width: '100%' }}
              value={dimension}
              onChange={e => setDimension(e.target.value)}
            >
              {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button
            className="primary-btn"
            style={{ minWidth: 160 }}
            onClick={runAnalysis}
            disabled={!selectedSkills.length || loading}
          >
            {loading ? 'Analysing…' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Step progress */}
      {loading && (
        <div className="chart-card" style={{ marginTop: 16 }}>
          <div className="ai-summary-header" style={{ marginBottom: 16 }}>
            <span className="ai-badge">AI</span>
            <span style={{ fontSize: 13 }}>Agent is reasoning through the data…</span>
          </div>
          {steps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ color: s.done ? '#16A34A' : 'var(--blue-primary)', fontWeight: 700 }}>
                    {s.done ? '✓' : '…'}
                  </span>
                  <span style={{ color: s.done ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton count={4} height={10} />
          )}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="upload-error" style={{ marginTop: 16 }}>{error}</div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

          {/* Headline */}
          <div style={{ background: 'var(--blue-primary)', color: 'white', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.8, marginBottom: 4 }}>
              {result.skillLabel?.toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{result.headline}</div>
          </div>

          {/* Agent Reasoning */}
          <div style={{ border: '1.5px solid var(--blue-primary)', borderRadius: 10, padding: '14px 16px', background: '#EFF6FF' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Agent Reasoning
            </div>
            <p style={{ fontSize: 13, color: '#1E3A5F', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
              {result.agentReasoning}
            </p>
          </div>

          {/* Key Findings */}
          {result.keyFindings?.length > 0 && (
            <div className="ai-summary-card">
              <div className="ai-summary-header">
                <span className="ai-badge">AI</span>
                <span>Key Findings</span>
              </div>
              <ul className="ai-bullets">
                {result.keyFindings.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          {/* Risk / Bright Spots */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {result.riskBUs?.length > 0 && (
              <div className="chart-card" style={{ borderTop: '3px solid #DC2626' }}>
                <div className="chart-title" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}><span>Risk BUs</span><InfoTip tip="Business units scoring lowest on the selected skill — these require targeted intervention." /></div>
                {result.riskBUs.map((bu, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{bu}</span>
                  </div>
                ))}
              </div>
            )}
            {result.brightSpotBUs?.length > 0 && (
              <div className="chart-card" style={{ borderTop: '3px solid #16A34A' }}>
                <div className="chart-title" style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: 6 }}><span>Bright Spots</span><InfoTip tip="Business units excelling on the selected skill — models to learn from and replicate across the organisation." /></div>
                {result.brightSpotBUs.map((bu, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{bu}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Priority Actions table */}
          {result.priorityActions?.length > 0 && (
            <div className="chart-card">
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>Priority Actions</span><InfoTip tip="AI-recommended actions ranked by expected impact, with suggested owner and delivery timeline." /></div>
              <table className="data-table">
                <thead>
                  <tr><th style={{ width: 32 }}>#</th><th>Action</th><th>Owner</th><th>Timeline</th><th>Expected Impact</th></tr>
                </thead>
                <tbody>
                  {result.priorityActions.map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--blue-primary)' }}>{a.rank}</td>
                      <td>{a.action}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.owner}</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                          background: String(a.timeline).includes('30') ? '#FEF2F2' : String(a.timeline).includes('90') ? '#FFFBEB' : '#EFF6FF',
                          color:      String(a.timeline).includes('30') ? '#DC2626' : String(a.timeline).includes('90') ? '#D97706' : '#2563EB',
                        }}>
                          {a.timeline}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.expectedImpact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cohort Insight */}
          {result.cohortInsight && (
            <div style={{ background: '#FFFBEB', border: '1.5px solid #D97706', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Cohort Insight
              </div>
              <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, margin: 0 }}>{result.cohortInsight}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{ marginTop: 24, padding: 48, textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Select one or more skills above and click Run Analysis
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            The AI agent will reason through your data and surface actionable intelligence
          </div>
        </div>
      )}
    </div>
  );
}
