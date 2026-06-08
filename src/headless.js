/**
 * Zest Headless - consent logic only, zero UI.
 *
 * Use this entry when you want to bring your own banner / modal / settings
 * markup and style it with your own CSS. No Shadow DOM is mounted, no
 * inline stylesheet is injected, and nothing is attached to `window`.
 *
 * Everything you need to wire a custom UI is here:
 *
 *   import Zest from '@freshjuice/zest/headless';
 *
 *   Zest.init({ mode: 'safe', respectDNT: true });
 *
 *   if (!Zest.hasConsentDecision()) {
 *     myBanner.show();
 *   }
 *
 *   myAcceptBtn.addEventListener('click', () => Zest.acceptAll());
 *   myRejectBtn.addEventListener('click', () => Zest.rejectAll());
 *   mySaveBtn.addEventListener('click', () => {
 *     Zest.updateConsent({ analytics: true, marketing: false });
 *   });
 *
 *   Zest.on(Zest.EVENTS.CHANGE, (e) => console.log(e.detail.consent));
 *
 * The headless build does NOT auto-initialize. You must call `init()`
 * yourself, so you control exactly when interceptors come online.
 */

import {
  coreInit,
  coreAcceptAll,
  coreRejectAll,
  coreUpdateConsent,
  coreReset,
  coreResolveGeo,
  isInitialized,
  getActiveConfig
} from './core-lifecycle.js';

import {
  getConsent,
  hasConsent,
  hasConsentDecision,
  getConsentProof
} from './storage/consent-store.js';

import { isDoNotTrackEnabled, getDNTDetails } from './core/dnt.js';

import { EVENTS, on, once } from './storage/events.js';

function init(userConfig = {}) {
  const snapshot = coreInit(userConfig);

  // If geo gating is configured, kick off resolution. Headless renders no UI,
  // so the result reaches the consumer via the `zest:geo` event and the
  // `onGeo` callback (action + verdict). Callers should branch on
  // `snapshot.geoPending`: when true, wait for `zest:geo` before deciding
  // whether to show their banner rather than reading hasConsentDecision()
  // immediately (it's still false until the verdict lands).
  if (snapshot.geoPending) {
    coreResolveGeo();
  }

  // Headless returns the snapshot so callers can decide whether to
  // render their banner / settings UI based on hasDecision / dntApplied /
  // geoPending.
  return snapshot;
}

/**
 * Manually resolve the visitor's jurisdiction. Normally init() triggers this
 * automatically when `geo` is configured; exposed so headless consumers can
 * await the `{ action, verdict }` result directly instead of listening for the
 * event. No-op (resolves null) when geo is off or a decision already exists.
 */
function resolveGeo() {
  return coreResolveGeo();
}

function acceptAll() {
  if (!isInitialized()) {
    console.warn('[Zest] Not initialized. Call Zest.init() first.');
    return null;
  }
  return coreAcceptAll();
}

function rejectAll() {
  if (!isInitialized()) {
    console.warn('[Zest] Not initialized. Call Zest.init() first.');
    return null;
  }
  return coreRejectAll();
}

function updateConsent(selections) {
  if (!isInitialized()) {
    console.warn('[Zest] Not initialized. Call Zest.init() first.');
    return null;
  }
  return coreUpdateConsent(selections);
}

function reset() {
  coreReset();
}

const Zest = {
  init,

  // Consent state
  getConsent,
  hasConsent,
  hasConsentDecision,
  getConsentProof,

  // Actions
  acceptAll,
  rejectAll,
  updateConsent,
  reset,

  // Geo
  resolveGeo,

  // DNT introspection
  isDoNotTrackEnabled,
  getDNTDetails,

  // Events
  on,
  once,
  EVENTS,

  // Config introspection
  getConfig: getActiveConfig
};

export default Zest;

// Named exports for tree-shake friendly consumers who only need a slice.
export {
  init,
  acceptAll,
  rejectAll,
  updateConsent,
  reset,
  resolveGeo,
  getConsent,
  hasConsent,
  hasConsentDecision,
  getConsentProof,
  isDoNotTrackEnabled,
  getDNTDetails,
  on,
  once,
  EVENTS,
  getActiveConfig as getConfig
};
