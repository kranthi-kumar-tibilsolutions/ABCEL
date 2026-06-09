import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';

const SUGGESTED = [
  'Which business has improved the most?',
  'Which BUs are in Open Conflict cluster?',
  'What drives engagement the most?',
  'Show BUs with high polarization',
];

export default function ChatWithData() {
  const { dimension } = useContext(AppContext);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI analyst. Ask me anything about employee engagement." }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

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
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:   msg,
          history:   messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          dimension,
        }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
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
        <span className="chat-dot" />
        <span className="chat-title">CHAT WITH DATA</span>
        <span className="chat-beta">Beta</span>
        <span className="chat-sub">Your AI Analyst</span>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.content || (m.role === 'assistant' && loading && i === messages.length - 1
              ? <span className="chat-typing">●●●</span>
              : null
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-suggested">
        {SUGGESTED.map((q, i) => (
          <button key={i} className="chat-suggestion" onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button className="chat-send" onClick={() => sendMessage()} disabled={loading}>→</button>
      </div>
      <div className="chat-disclaimer">AI can make mistakes. Verify important insights.</div>
    </div>
  );
}
