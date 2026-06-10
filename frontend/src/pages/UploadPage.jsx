import { useState, useRef, useCallback, useEffect } from 'react';
import abgLogo from '../assets/abg.avif';

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
  const [stage,      setStage]      = useState('idle');
  const [logLine,    setLogLine]    = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [hasData,    setHasData]    = useState(false);
  const inputRef = useRef(null);

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
            if (s === 'ready') { setStage('ready'); setTimeout(() => onUploadComplete(), 800); return; }
            setStage(s);
            setLogLine(m);
          } catch {}
        }
      }
    } catch {
      setErrorMsg('Upload failed. Is the server running?');
      setStage('error');
    }
  }, [onUploadComplete]);

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
        setTimeout(() => onUploadComplete(), 800);
      } else {
        onUploadComplete();
      }
    } catch {
      onUploadComplete();
    }
  };

  const isProcessing = ['uploading','processing','computing','generating'].includes(stage);
  const stageInfo    = STAGES[stage] || STAGES.idle;

  return (
    <div className="upload-page">
      {/* Logo */}
      <div className="upload-logo">
        <img src={abgLogo} alt="ABG" width="48" height="48" style={{ objectFit: 'contain', borderRadius: 6 }} />
        <div>
          <div className="upload-logo-title">ABG VIBES 2026</div>
          <div className="upload-logo-sub">Employee Engagement Intelligence</div>
        </div>
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
          <div className="progress-spinner" />
          <div className="progress-stage">{stageInfo.label}</div>
          <div className="progress-log">{logLine}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(stageInfo.step / 5) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Ready */}
      {stage === 'ready' && (
        <div className="upload-ready">
          <div className="ready-icon">✓</div>
          <div className="ready-title">Dashboard ready!</div>
        </div>
      )}

      {/* Feature bullets */}
      {stage === 'idle' && (
        <div className="upload-features">
          <div className="feature-item">✓ ABG Vibes format supported (WTW platform)</div>
          <div className="feature-item">✓ Data stays on your server — never sent externally</div>
          <div className="feature-item">✓ AI insights generated automatically</div>
          <div className="feature-item">✓ Schema-agnostic — works with any column naming</div>
        </div>
      )}

      {/* Continue with existing data */}
      {hasData && stage === 'idle' && (
        <button
          className="sample-btn"
          style={{ background: 'var(--blue-primary)', color: '#fff', fontWeight: 700, borderColor: 'transparent' }}
          onClick={onUploadComplete}
        >
          Continue to Dashboard with existing data →
        </button>
      )}

      {/* Sample data option */}
      {(stage === 'idle' || stage === 'error') && (
        <button className="sample-btn" onClick={handleSampleData}>
          Or use sample data to explore the dashboard →
        </button>
      )}
    </div>
  );
}
