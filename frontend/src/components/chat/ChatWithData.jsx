import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { getActiveContext, subscribeToContext } from '../../context/ActiveContextStore';
import { apiFetch } from '../../utils/api';

const SUGGESTED = [
  'Which business has improved the most?',
  'Which BUs are in Open Conflict cluster?',
  'What drives engagement the most?',
  'Show BUs with high polarization',
];

const TAB_LABELS = {
  overview:                'Overview',
  business_overview:       'Business Overview',
  business_detail:         'Business Detail',
  bu_detail:               'BU Detail',
  bu_explorer:             'BU Explorer',
  cluster_detail:          'Cluster Detail',
  dynamic_persona_builder: 'Persona Builder',
  statistical_analysis:    'Statistical Analysis',
  hypothesis_testing:      'Hypothesis Testing',
  sentiment_analysis:      'Sentiment Analysis',
  focus_spotlight:         'Focus Spotlight',
  ai_insights:             'AI Insights',
  benchmarks:              'Benchmarks',
  employee_voice:          'Employee Voice',
  insights_studio:         'Insights Studio',
  outliers_alerts:         'Outliers & Alerts',
  reports:                 'Reports',
  trends:                  'Trends',
  settings:                'Settings',
};

const FOCUS_AREAS = [
  'Engagement',
  'Leadership',
  'Performance Culture',
  'Development & Career',
  'Manager Effectiveness',
  'Onboarding',
  'Gender',
  'Generation',
  'Tenure',
  'Job Band',
];

function AiChatIcon() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: 'var(--blue-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: 8, letterSpacing: '0.02em' }}>AI</span>
    </div>
  );
}

function renderMd(text) {
  return text.split('\n').map((line, li, arr) => {
    const parts = [];
    const rx = /\*\*(.*?)\*\*/g;
    let last = 0, m;
    while ((m = rx.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      parts.push(<strong key={m.index}>{m[1]}</strong>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return <span key={li}>{parts}{li < arr.length - 1 && <br />}</span>;
  });
}

function PaperPlaneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12.5 1.5L6.5 7.5M12.5 1.5L8.5 12.5L6.5 7.5M12.5 1.5L1.5 5.5L6.5 7.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ChatWithData() {
  const { dimension: ctxDimension, businesses, user } = useContext(AppContext);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI analyst. Ask me anything about employee engagement:" }
  ]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [focusArea,   setFocusArea]   = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [currentTab,  setCurrentTab]  = useState(getActiveContext().tab ?? 'overview');

  useEffect(() => {
    return subscribeToContext(ctx => setCurrentTab(ctx.tab ?? 'overview'));
  }, []);
  const bottomRef = useRef(null);

  // Company users are already scoped to their own company server-side —
  // hide the company filter for them.
  const showCompanyFilter = user?.role !== 'company' && (businesses?.length ?? 0) > 1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await apiFetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:        msg,
          history:        messages.filter(m => m.content && m.content.trim() && !m.content.includes('AI unavailable') && !m.content.includes('something went wrong')).slice(-10).map(m => ({ role: m.role, content: m.content })),
          dimension:      ctxDimension,
          focusArea:      focusArea || null,
          companyFilter:  companyFilter || null,
          active_context: getActiveContext() || null,
        }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete tail for next chunk
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const { text: tok } = JSON.parse(payload);
            if (tok) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + tok,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Sorry, something went wrong. Please try again.' };
        return updated;
      });
    }
    setLoading(false);
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <AiChatIcon />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="chat-title">CHAT WITH DATA</span>
            <span className="chat-beta">Beta</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Analysing: {TAB_LABELS[currentTab] ?? 'Overview'}
          </span>
        </div>
        <span className="chat-sub">Your AI analyst</span>
      </div>

<div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === 'assistant' && loading && i === messages.length - 1 && !m.content
              ? <span className="chat-typing">●●●</span>
              : renderMd(m.content || '')
            }
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggested">
          <div className="chat-try-label">Try asking</div>
          {SUGGESTED.map((q, i) => (
            <button key={i} className="chat-suggestion" onClick={() => sendMessage(q)}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M9.5 1H1.5a.5.5 0 00-.5.5v6a.5.5 0 00.5.5H3l2 2 2-2h2.5a.5.5 0 00.5-.5v-6A.5.5 0 009.5 1z"
                  stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button className="chat-send" onClick={() => sendMessage()} disabled={loading}>
          <PaperPlaneIcon />
        </button>
      </div>

      <div className="chat-disclaimer">AI can make mistakes. Verify important insights.</div>
    </div>
  );
}
