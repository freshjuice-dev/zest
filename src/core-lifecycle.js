/**
 * Core lifecycle - UI-agnostic initialization and consent actions.
 *
 * This module contains everything the main entry (with UI) and the
 * headless entry (no UI) share: interceptor setup, consent load/save,
 * replay, DNT handling, and the events/callbacks fan-out. It intentionally
 * does NOT import anything from `./ui/*` so tree-shakers can drop the UI
 * bundle entirely when only the headless API is used.
 */

import { interceptCookies, setConsentChecker as setCookieChecker, replayCookies } from './core/cookie-interceptor.js';
import { interceptStorage, setConsentChecker as setStorageChecker, replayStorage } from './core/storage-interceptor.js';
import { startScriptBlocking, setConsentChecker as setScriptChecker, replayScripts } from './core/script-blocker.js';
import { setPatterns } from './core/pattern-matcher.js';
import { getCategoryIds } from './core/categories.js';
import { isDoNotTrackEnabled } from './core/dnt.js';
import { safeInvoke } from './core/security.js';

import { applyConsentSignals } from './integrations/consent-signals.js';

import { setConfig } from './config/parser.js';

import {
  loadConsent,
  hasConsent,
  updateConsent,
  acceptAll as storeAcceptAll,
  rejectAll as storeRejectAll,
  resetConsent,
  hasConsentDecision
} from './storage/consent-store.js';
import { emitReady, emitConsent, emitReject, emitChange } from './storage/events.js';

let initialized = false;
let currentConfig = null;

function checkConsent(category) {
  return hasConsent(category);
}

function replayAll(categories) {
  replayCookies(categories);
  replayStorage(categories);
  replayScripts(categories);
}

/**
 * Run the non-UI half of init. Returns a snapshot the caller (UI or
 * headless) can use to decide what to do next.
 */
export function coreInit(userConfig = {}) {
  if (initialized) {
    return {
      alreadyInitialized: true,
      config: currentConfig,
      consent: loadConsent(),
      hasDecision: hasConsentDecision(),
      dntApplied: false
    };
  }

  currentConfig = setConfig(userConfig);

  // Push default-denied state to vendor consent mode APIs BEFORE any
  // third-party script has a chance to fire.
  applyConsentSignals(
    { essential: true, functional: false, analytics: false, marketing: false },
    currentConfig,
    true
  );

  if (currentConfig.patterns) {
    setPatterns(currentConfig.patterns);
  }

  setCookieChecker(checkConsent);
  setStorageChecker(checkConsent);
  setScriptChecker(checkConsent);

  interceptCookies();
  interceptStorage();
  startScriptBlocking(currentConfig.mode, currentConfig.blockedDomains);

  const consent = loadConsent();
  initialized = true;

  if (hasConsentDecision()) {
    applyConsentSignals(consent, currentConfig, false);
  }

  // DNT / GPC handling — if the user signalled opt-out at the browser
  // level and the site opts to respect it, auto-reject before the UI
  // layer ever runs.
  const dntEnabled = isDoNotTrackEnabled();
  let dntApplied = false;

  if (dntEnabled && currentConfig.respectDNT && currentConfig.dntBehavior !== 'ignore') {
    if (currentConfig.dntBehavior === 'reject' && !hasConsentDecision()) {
      const result = storeRejectAll(currentConfig.expiration);
      dntApplied = true;
      applyConsentSignals(result.current, currentConfig, false);
      emitReject(result.current);
      emitChange(result.current, result.previous);
      safeInvoke(currentConfig.callbacks?.onReject);
      safeInvoke(currentConfig.callbacks?.onChange, result.current);
    }
  }

  emitReady(consent);
  safeInvoke(currentConfig.callbacks?.onReady, consent);

  return {
    alreadyInitialized: false,
    config: currentConfig,
    consent,
    hasDecision: hasConsentDecision(),
    dntApplied
  };
}

/**
 * Accept all categories, replay queued items, fire events + callbacks.
 * Returns { current, previous } or null if not yet initialized.
 */
export function coreAcceptAll() {
  if (!initialized) return null;
  const result = storeAcceptAll(currentConfig.expiration);
  applyConsentSignals(result.current, currentConfig, false);
  replayAll(getCategoryIds());
  emitConsent(result.current, result.previous);
  emitChange(result.current, result.previous);
  safeInvoke(currentConfig.callbacks?.onAccept, result.current);
  safeInvoke(currentConfig.callbacks?.onChange, result.current);
  return result;
}

/**
 * Reject all non-essential categories, fire events + callbacks.
 */
export function coreRejectAll() {
  if (!initialized) return null;
  const result = storeRejectAll(currentConfig.expiration);
  applyConsentSignals(result.current, currentConfig, false);
  emitReject(result.current);
  emitChange(result.current, result.previous);
  safeInvoke(currentConfig.callbacks?.onReject);
  safeInvoke(currentConfig.callbacks?.onChange, result.current);
  return result;
}

/**
 * Save custom selections and replay only the newly-allowed categories.
 */
export function coreUpdateConsent(selections) {
  if (!initialized) return null;
  const result = updateConsent(selections, currentConfig.expiration);
  applyConsentSignals(result.current, currentConfig, false);

  const newlyAllowed = Object.keys(result.current).filter(
    (cat) => result.current[cat] && !result.previous[cat]
  );
  if (newlyAllowed.length > 0) {
    replayAll(newlyAllowed);
  }

  const hasNonEssential = Object.entries(selections || {}).some(
    ([cat, val]) => cat !== 'essential' && val
  );
  if (hasNonEssential) {
    emitConsent(result.current, result.previous);
  } else {
    emitReject(result.current);
  }
  emitChange(result.current, result.previous);
  safeInvoke(currentConfig.callbacks?.onChange, result.current);
  return result;
}

/**
 * Clear the consent cookie. The caller is responsible for any UI reset.
 */
export function coreReset() {
  resetConsent();
}

export function isInitialized() {
  return initialized;
}

export function getActiveConfig() {
  return currentConfig;
}
