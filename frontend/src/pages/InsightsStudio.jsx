import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import Skeleton from '../components/shared/Skeleton';
import PaginatedTable from '../components/shared/PaginatedTable';
import Dropdown from '../components/shared/Dropdown';
import InfoTip from '../components/shared/InfoTip';

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
  const { setBreadcrumb } = useContext(AppContext);

  useEffect(() => {
    setBreadcrumb([
      { label: 'Explore' },
      { label: 'Insights Studio' },
    ]);
  }, []);

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
      <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Config panel */}
        <div>
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center' }}>
            Select Skills to Analyse
            <InfoTip text="Choose one or more engagement skill themes for the AI agent to analyse. The agent reasons through survey data to surface insights, risk areas, and actionable recommendations." />
          </div>
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
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                Analyse by Dimension
                <InfoTip text="Segment the analysis by this organisational or demographic dimension. The AI will compare scores across groups within the chosen dimension to highlight disparities and patterns." />
              </label>
              <Dropdown
                variant="combobox"
                className="fdd-full"
                placeholder="Select dimension…"
                value={dimension}
                options={DIMENSIONS.map(d => ({ value: d, label: d }))}
                onChange={v => setDimension(v)}
              />
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

        <div style={{ borderTop: '1px solid var(--border)' }} />

        <div style={{ minHeight: 200 }}>

        {/* Step progress */}
        {loading && (
          <div>
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
                      Step {s.step}: {s.label}
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
          <div className="upload-error">{error}</div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Headline */}
          <div style={{ background: 'var(--blue-primary)', color: 'white', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.8, marginBottom: 4 }}>
              {result.skillLabel?.toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{result.headline}</div>
          </div>

          {/* Agent Reasoning */}
          <div style={{ border: '1.5px solid var(--blue-primary)', borderRadius: 10, padding: '14px 16px', background: '#EFF6FF' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              Agent Reasoning
              <InfoTip text="The AI agent's step-by-step thought process — how it interpreted the data and arrived at its findings." />
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
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Key Findings
                  <InfoTip text="AI-identified patterns and notable observations from the survey data for the selected skills and dimension." />
                </span>
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
                <div className="chart-title" style={{ color: '#DC2626', display: 'flex', alignItems: 'center' }}>
                  Risk BUs
                  <InfoTip text="Business units with the lowest scores on the selected skill themes — these need prioritised HR attention." />
                </div>
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
                <div className="chart-title" style={{ color: '#16A34A', display: 'flex', alignItems: 'center' }}>
                  Bright Spots
                  <InfoTip text="Business units performing above average on the selected skill themes — potential models for best practice sharing." />
                </div>
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
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center' }}>
                Priority Actions
                <InfoTip text="Ranked HR interventions with suggested owner, timeline, and expected impact — ordered by urgency and feasibility." />
              </div>
              <PaginatedTable
                pageSize={10}
                headers={<><th style={{ width: 32 }}>#</th><th>Action</th><th>Owner</th><th>Timeline</th><th>Expected Impact</th></>}
                rows={result.priorityActions.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--blue-primary)' }}>{a.rank}</td>
                    <td>{a.action}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.owner}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                        background: String(a.timeline).includes('30') ? '#FEF2F2' : String(a.timeline).includes('90') ? '#FFFBEB' : '#EFF6FF',
                        color:      String(a.timeline).includes('30') ? '#DC2626' : String(a.timeline).includes('90') ? '#D97706' : '#2563EB',
                      }}>{a.timeline}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.expectedImpact}</td>
                  </tr>
                ))}
              />
            </div>
          )}

          {/* Cohort Insight */}
          {result.cohortInsight && (
            <div style={{ background: '#FFFBEB', border: '1.5px solid #D97706', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                Cohort Insight
                <InfoTip text="A targeted observation about a specific demographic or tenure group that shows a notable pattern distinct from the overall population." />
              </div>
              <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, margin: 0 }}>{result.cohortInsight}</p>
            </div>
          )}
        </div>
      )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Select one or more skills above and click Run Analysis
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                The AI agent will reason through your data and surface actionable intelligence
              </div>
            </div>
          </div>
        )}

        </div>{/* end minHeight wrapper */}
      </div>
    </div>
  );
}
