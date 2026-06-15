import { useState, useRef, useCallback, useEffect, useContext } from 'react';
import Lottie from 'lottie-react';
import { AppContext } from '../context/AppContext';
import loaderAnim from '../assets/loader.json';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const STAGES = {
  idle:       { label: '',                                  step: 0 },
  uploading:  { label: 'Uploading your file...',           step: 1 },
  processing: { label: 'Reading survey data...',           step: 2 },
  computing:  { label: 'Computing engagement scores...',   step: 3 },
  generating: { label: 'AI generating insights...',        step: 4 },
  ready:      { label: 'Dashboard ready!',                 step: 5 },
  error:      { label: '',                                  step: 0 },
};

export default function UploadPage({ onUploadComplete }) {
  const { user, logout } = useContext(AppContext);
  const [stage,      setStage]      = useState('idle');
  const [logLine,    setLogLine]    = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [hasData,    setHasData]    = useState(false);
  const [navigating, setNavigating] = useState(false);
  const inputRef = useRef(null);

  const goToDashboard = useCallback(() => {
    setNavigating(true);
    setTimeout(() => onUploadComplete(), 5000);
  }, [onUploadComplete]);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { if (d.ready) setHasData(true); })
      .catch(() => {});
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setErrorMsg('Only .xlsx and .xls files are supported.');
      setStage('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setStage('uploading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const reader   = response.body.getReader();
      const decoder  = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text  = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const { stage: s, message: m } = JSON.parse(payload);
            if (s === 'error') { setErrorMsg(m); setStage('error'); return; }
            if (s === 'ready') { setStage('ready'); goToDashboard(); return; }
            setStage(s);
            setLogLine(m);
          } catch {}
        }
      }
    } catch {
      setErrorMsg('Upload failed. Is the server running?');
      setStage('error');
    }
  }, [goToDashboard]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSampleData = async () => {
    setStage('computing');
    setLogLine('Loading sample ABG Vibes 2026 data...');
    try {
      const res = await fetch('/api/load-sample', { method: 'POST' });
      if (res.ok) {
        setStage('ready');
        goToDashboard();
      } else {
        goToDashboard();
      }
    } catch {
      goToDashboard();
    }
  };

  const isProcessing = ['uploading','processing','computing','generating'].includes(stage);
  const stageInfo    = STAGES[stage] || STAGES.idle;

  return (
    <>
    <div className="upload-page">
    <div className="upload-card">
      {/* Back button */}
      <button className="upload-page-back-btn" onClick={logout} aria-label="Back">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.03 3.97a1 1 0 0 1 0 1.41L6.91 9.5H19a1 1 0 0 1 0 2H6.91l4.12 4.12a1 1 0 0 1-1.41 1.41l-5.83-5.83a1 1 0 0 1 0-1.41l5.83-5.83a1 1 0 0 1 1.41 0z"/>
        </svg>
      </button>

      {/* Greeting */}
      <div className="upload-header">
        <div className="upload-logo-title">{getGreeting()}{user?.name ? `, ${user.name}` : ''}</div>
        <div className="upload-subtitle">Let's get your engagement data ready</div>
      </div>

      {/* Drop zone */}
      {!isProcessing && stage !== 'ready' && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${stage === 'error' ? 'error' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => processFile(e.target.files[0])}
          />
          <div className="drop-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="8" y="4" width="24" height="30" rx="3" stroke="#94A3B8" strokeWidth="1.5" fill="none"/>
              <rect x="12" y="14" width="16" height="2" rx="1" fill="#94A3B8"/>
              <rect x="12" y="19" width="16" height="2" rx="1" fill="#94A3B8"/>
              <rect x="12" y="24" width="10" height="2" rx="1" fill="#94A3B8"/>
              <path d="M22 4V10H30" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="drop-title">Drop your Excel file here</div>
          <div className="drop-sub">or click to browse · Supports .xlsx, .xls · Max 100MB</div>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="upload-error">
          {errorMsg}
          <button onClick={() => setStage('idle')} className="retry-btn">Try again</button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="upload-progress">
          <div className="progress-stage">{stageInfo.label}</div>
          <div className="progress-log">{logLine}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(stageInfo.step / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Ready */}
      {stage === 'ready' && !navigating && (
        <div className="upload-ready">
          <div className="ready-icon">✓</div>
          <div className="ready-title">Dashboard ready!</div>
        </div>
      )}

      {/* Continue with existing data */}
      {hasData && stage === 'idle' && (
        <button
          className="sample-btn"
          style={{ background: 'var(--abg-orange)', color: '#fff', fontWeight: 700, borderColor: 'transparent' }}
          onClick={goToDashboard}
        >
          Go to Dashboard →
        </button>
      )}

      {/* Sample data option */}
      {(stage === 'idle' || stage === 'error') && (
        <button className="sample-btn" onClick={handleSampleData}>
          Try with sample data →
        </button>
      )}
    </div>
    </div>

    {navigating && (
      <div className="login-loading-overlay">
        <Lottie animationData={loaderAnim} loop autoplay style={{ width: 180, height: 60 }} />
        <div className="login-loading-text">Loading dashboard…</div>
      </div>
    )}
    </>
  );
}
