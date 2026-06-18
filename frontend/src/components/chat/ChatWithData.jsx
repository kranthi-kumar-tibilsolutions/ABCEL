import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { apiFetch } from '../../utils/api';

const SUGGESTED = [
  'Which business has improved the most?',
  'Which BUs are in Open Conflict cluster?',
  'What drives engagement the most?',
  'Show BUs with high polarization',
];

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

function renderInline(line) {
  const parts = [];
  const rx = /\*\*(.*?)\*\*/g;
  let last = 0, m;
  while ((m = rx.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(<strong key={m.index}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

function isTableRow(line) {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|');
}

function isTableDivider(line) {
  const t = line.trim();
  return t.startsWith('|') && /^[\s:|-]+$/.test(t) && t.includes('-');
}

function parseTableCells(line) {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map(c => c.trim());
}

function renderMd(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Markdown table: header row, divider row, then body rows
    if (isTableRow(line) && lines[i + 1] !== undefined && isTableDivider(lines[i + 1])) {
      const headerCells = parseTableCells(line);
      const bodyRows = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        bodyRows.push(parseTableCells(lines[j]));
        j++;
      }
      blocks.push(
        <table key={i} className="chat-md-table">
          <thead>
            <tr>{headerCells.map((c, ci) => <th key={ci}>{renderInline(c)}</th>)}</tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri}>{row.map((c, ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
      i = j;
      continue;
    }

    // Heading (### Text)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push(<div key={i} className="chat-md-heading">{renderInline(headingMatch[2])}</div>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={i} className="chat-md-hr" />);
      i++;
      continue;
    }

    // Blank line — paragraph break
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Plain line(s) — collect consecutive plain lines into one paragraph with <br/>
    const paraLines = [];
    let k = i;
    while (
      k < lines.length &&
      lines[k].trim() !== '' &&
      !isTableRow(lines[k]) &&
      !/^(#{1,6})\s+/.test(lines[k]) &&
      !/^-{3,}$/.test(lines[k].trim())
    ) {
      paraLines.push(lines[k]);
      k++;
    }
    blocks.push(
      <p key={i} className="chat-md-p">
        {paraLines.map((l, li) => (
          <span key={li}>{renderInline(l)}{li < paraLines.length - 1 && <br />}</span>
        ))}
      </p>
    );
    i = k;
  }

  return blocks;
}

function PaperPlaneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12.5 1.5L6.5 7.5M12.5 1.5L8.5 12.5L6.5 7.5M12.5 1.5L1.5 5.5L6.5 7.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M15 13L8 6M8 6v5M8 6h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="13" y="13" width="5" height="5" rx="1" fill="currentColor"/>
    </svg>
  );
}

export default function ChatWithData({ onExpand, messages, setMessages, loading, setLoading }) {
  const { dimension: ctxDimension, businesses, user, activeScreenContext } = useContext(AppContext);
  const [input,   setInput]   = useState('');
  const [focusArea,     setFocusArea]     = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const bottomRef = useRef(null);
  const pendingTextRef = useRef('');
  const flushTimerRef  = useRef(null);

  // Company users are already scoped to their own company server-side —
  // hide the company filter for them.
  const showCompanyFilter = user?.role !== 'company' && (businesses?.length ?? 0) > 1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loading ? 'auto' : 'smooth' });
  }, [messages, loading]);

  useEffect(() => () => clearInterval(flushTimerRef.current), []);

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
          history:        messages.filter(m => m.content && m.content.trim()).slice(-10).map(m => ({ role: m.role, content: m.content })),
          dimension:      ctxDimension,
          focusArea:      focusArea || null,
          companyFilter:  companyFilter || null,
          active_context: activeScreenContext || null,
        }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Typewriter effect: tokens land in a queue as fast as the network
      // delivers them, but we drain the queue onto the screen at a
      // human-readable pace instead of dumping whole chunks instantly.
      // The drain rate scales with queue size so a long response (e.g. a
      // markdown table) doesn't take many seconds of nonstop re-rendering —
      // each tick re-parses the full message text via renderMd, so ticking
      // too slowly for too long is what froze the tab.
      pendingTextRef.current = '';
      let streamDone = false;
      const TICK_MS = 40;
      const MIN_CHARS_PER_TICK = 2;

      const drain = () => {
        const pending = pendingTextRef.current;
        if (!pending) {
          if (streamDone) clearInterval(flushTimerRef.current);
          return;
        }
        // Scale chars/tick so big backlogs (long tables, long answers)
        // never take more than ~1.5s to drain, capping total re-renders.
        const charsThisTick = Math.max(MIN_CHARS_PER_TICK, Math.ceil(pending.length / 35));
        const chunk = pending.slice(0, charsThisTick);
        pendingTextRef.current = pending.slice(charsThisTick);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      };
      flushTimerRef.current = setInterval(drain, TICK_MS);

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
            if (tok) pendingTextRef.current += tok;
          } catch {}
        }
      }
      streamDone = true;
    } catch {
      clearInterval(flushTimerRef.current);
      pendingTextRef.current = '';
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
        <span className="chat-title">CHAT WITH DATA</span>
        <span className="chat-beta">Beta</span>
        <span className="chat-sub" style={{ display: 'none' }}>Your AI analyst</span>
        {onExpand && (
          <button className="chat-expand-btn" onClick={onExpand} title="Expand chat" style={{ marginLeft: 'auto' }}>
            <ExpandIcon />
          </button>
        )}
      </div>

<div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-msg-bubble">
              {m.role === 'assistant' && loading && i === messages.length - 1 && !m.content
                ? (
                  <span className="chat-typing">
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                    <span className="chat-typing-dot" />
                  </span>
                )
                : renderMd(m.content || '')
              }
            </div>
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
