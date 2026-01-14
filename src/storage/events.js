/**
 * Events - Custom event dispatching for consent changes
 */

// Event names
export const EVENTS = {
  READY: 'zest:ready',
  CONSENT: 'zest:consent',
  REJECT: 'zest:reject',
  CHANGE: 'zest:change',
  SHOW: 'zest:show',
  HIDE: 'zest:hide'
};

/**
 * Dispatch a custom event
 */
export function emit(eventName, detail = {}) {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(event);
  return event;
}

/**
 * Emit ready event
 */
export function emitReady(consent) {
  return emit(EVENTS.READY, { consent });
}

/**
 * Emit consent event (user accepted)
 */
export function emitConsent(consent, previous) {
  return emit(EVENTS.CONSENT, { consent, previous });
}

/**
 * Emit reject event (user rejected all)
 */
export function emitReject(consent) {
  return emit(EVENTS.REJECT, { consent });
}

/**
 * Emit change event (any consent change)
 */
export function emitChange(consent, previous) {
  return emit(EVENTS.CHANGE, { consent, previous });
}

/**
 * Emit show event (banner/modal shown)
 */
export function emitShow(type = 'banner') {
  return emit(EVENTS.SHOW, { type });
}

/**
 * Emit hide event (banner/modal hidden)
 */
export function emitHide(type = 'banner') {
  return emit(EVENTS.HIDE, { type });
}

/**
 * Subscribe to an event
 */
export function on(eventName, callback) {
  document.addEventListener(eventName, callback);
  return () => document.removeEventListener(eventName, callback);
}

/**
 * Subscribe to an event once
 */
export function once(eventName, callback) {
  document.addEventListener(eventName, callback, { once: true });
}
