import { useState } from 'react';
import Lottie from 'lottie-react';
import abgLogo from '../assets/abg.avif';
import loaderAnim from '../assets/loader.json';

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const startTime = Date.now();
    const MIN_LOADING_MS = 5000;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise(r => setTimeout(r, MIN_LOADING_MS - elapsed));
      }
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      onLogin(data.user, data.token);
    } catch {
      setError('Unable to reach the server. Is it running?');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="upload-logo" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <img src={abgLogo} alt="ABG" width="48" height="48" style={{ objectFit: 'contain', borderRadius: 6 }} />
          <div>
            <div className="upload-logo-title">ABG VIBES</div>
            <div className="upload-logo-sub">Employee Engagement Intelligence</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="primary-btn login-submit" disabled={loading}>
            Sign in
          </button>
        </form>
      </div>

      {loading && (
        <div className="login-loading-overlay">
          <Lottie animationData={loaderAnim} loop autoplay style={{ width: 180, height: 60 }} />
          <div className="login-loading-text">Signing in…</div>
        </div>
      )}
    </div>
  );
}
