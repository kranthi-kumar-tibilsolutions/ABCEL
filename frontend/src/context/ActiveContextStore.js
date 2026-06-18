// Global store — any tab can write, chat popup reads synchronously
let _activeContext = { tab: 'overview' };
let _listeners = [];

export function setActiveContext(context) {
  _activeContext = context;
  _listeners.forEach(fn => fn(context));
}

export function getActiveContext() {
  return _activeContext;
}

export function subscribeToContext(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
