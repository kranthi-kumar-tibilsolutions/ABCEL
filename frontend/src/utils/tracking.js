import { apiFetch } from './api';

const SESSION_ID = crypto.randomUUID();

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
