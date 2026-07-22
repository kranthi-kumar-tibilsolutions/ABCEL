import { apiFetch } from './api';

// crypto.randomUUID() only exists in secure contexts (HTTPS, or
// http://localhost) — fall back to a plain UUID v4 elsewhere so an
// insecure-context visit doesn't crash the whole app before it renders.
function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SESSION_ID = generateSessionId();

export function trackEvent(type, page) {
  apiFetch('/api/track/event', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type, page, session_id: SESSION_ID }),
  }).catch(() => {});
}

// Used on tab close/hide — sendBeacon can't carry custom headers, so this
// event arrives without an Authorization header. The monitor service
// resolves identity for it via the shared session_id from earlier events.
export function trackEventBeacon(type, page) {
  const blob = new Blob(
    [JSON.stringify({ type, page, session_id: SESSION_ID })],
    { type: 'application/json' }
  );
  navigator.sendBeacon('/api/track/event', blob);
}
