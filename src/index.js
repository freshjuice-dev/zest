/**
 * Zest - Lightweight Cookie Consent Toolkit
 * Main entry point
 */

// Core
import { interceptCookies, setConsentChecker as setCookieChecker, replayCookies, getOriginalCookieDescriptor } from './core/cookie-interceptor.js';
import { interceptStorage, setConsentChecker as setStorageChecker, replayStorage } from './core/storage-interceptor.js';
import { startScriptBlocking, setConsentChecker as setScriptChecker, replayScripts } from './core/script-blocker.js';
import { setPatterns } from './core/pattern-matcher.js';
import { getCategoryIds } from './core/categories.js';
import { isDoNotTrackEnabled, getDNTDetails } from './core/dnt.js';

// Integrations
import { applyConsentSignals } from './integrations/consent-signals.js';

// Config
import { getConfig, setConfig, getCurrentConfig } from './config/parser.js';

// Storage
import {
  loadConsent,
  getConsent,
  hasConsent,
  updateConsent,
  acceptAll as storeAcceptAll,
  rejectAll as storeRejectAll,
  resetConsent,
  hasConsentDecision,
  getConsentProof
} from './storage/consent-store.js';
import { emitReady, emitConsent, emitReject, emitChange, emitShow, emitHide, EVENTS } from './storage/events.js';

// UI
import { showBanner, hideBanner, isBannerVisible } from './ui/banner.js';
import { showModal, hideModal, isModalVisible } from './ui/modal.js';
import { showWidget, hideWidget, removeWidget, isWidgetVisible } from './ui/widget.js';

// State
let initialized = false;
let config = null;

/**
 * Consent checker function shared across interceptors
 */
function checkConsent(category) {
  return hasConsent(category);
}

/**
 * Replay all queued items for newly allowed categories
 */
function replayAll(allowedCategories) {
  replayCookies(allowedCategories);
  replayStorage(allowedCategories);
  replayScripts(allowedCategories);
}

/**
 * Handle accept all
 */
function handleAcceptAll() {
  const result = storeAcceptAll(config.expiration);
  const categories = getCategoryIds();

  applyConsentSignals(result.current, config, false);

  hideBanner();
  hideModal();

  replayAll(categories);

  if (config.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }

  emitConsent(result.current, result.previous);
  emitChange(result.current, result.previous);
  config.callbacks?.onAccept?.(result.current);
  config.callbacks?.onChange?.(result.current);
}

/**
 * Handle reject all
 */
function handleRejectAll() {
  const result = storeRejectAll(config.expiration);

  applyConsentSignals(result.current, config, false);

  hideBanner();
  hideModal();

  if (config.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }

  emitReject(result.current);
  emitChange(result.current, result.previous);
  config.callbacks?.onReject?.();
  config.callbacks?.onChange?.(result.current);
}

/**
 * Handle save preferences from modal
 */
function handleSavePreferences(selections) {
  const result = updateConsent(selections, config.expiration);

  applyConsentSignals(result.current, config, false);

  // Find newly allowed categories
  const newlyAllowed = Object.keys(result.current).filter(
    cat => result.current[cat] && !result.previous[cat]
  );

  if (newlyAllowed.length > 0) {
    replayAll(newlyAllowed);
  }

  hideModal();

  if (config.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }

  // Determine if this was acceptance or rejection based on selections
  const hasNonEssential = Object.entries(selections)
    .some(([cat, val]) => cat !== 'essential' && val);

  if (hasNonEssential) {
    emitConsent(result.current, result.previous);
  } else {
    emitReject(result.current);
  }

  emitChange(result.current, result.previous);
  config.callbacks?.onChange?.(result.current);
}

/**
 * Handle show settings
 */
function handleShowSettings() {
  hideBanner();
  hideWidget();

  showModal(getConsent(), {
    onSave: handleSavePreferences,
    onAcceptAll: handleAcceptAll,
    onRejectAll: handleRejectAll,
    onClose: handleCloseModal
  });

  emitShow('modal');
}

/**
 * Handle close modal
 */
function handleCloseModal() {
  hideModal();
  emitHide('modal');

  // Show widget if consent was already given
  if (hasConsentDecision() && config.showWidget) {
    showWidget({ onClick: handleShowSettings });
  } else {
    // Show banner again if no decision made
    showBanner({
      onAcceptAll: handleAcceptAll,
      onRejectAll: handleRejectAll,
      onSettings: handleShowSettings
    });
  }
}

/**
 * Initialize Zest
 */
function init(userConfig = {}) {
  if (initialized) {
    console.warn('[Zest] Already initialized');
    return Zest;
  }

  // Merge config
  config = setConfig(userConfig);

  // Push default denied state to vendor consent mode APIs (must happen before scripts load)
  applyConsentSignals(
    { essential: true, functional: false, analytics: false, marketing: false },
    config,
    true
  );

  // Set patterns if provided
  if (config.patterns) {
    setPatterns(config.patterns);
  }

  // Set up consent checkers
  setCookieChecker(checkConsent);
  setStorageChecker(checkConsent);
  setScriptChecker(checkConsent);

  // Start interception
  interceptCookies();
  interceptStorage();
  startScriptBlocking(config.mode, config.blockedDomains);

  // Load saved consent
  const consent = loadConsent();

  initialized = true;

  // Push update for returning visitors with saved consent
  if (hasConsentDecision()) {
    applyConsentSignals(consent, config, false);
  }

  // Check Do Not Track / Global Privacy Control
  const dntEnabled = isDoNotTrackEnabled();
  let dntApplied = false;

  if (dntEnabled && config.respectDNT && config.dntBehavior !== 'ignore') {
    if (config.dntBehavior === 'reject' && !hasConsentDecision()) {
      // Auto-reject non-essential cookies silently
      const result = storeRejectAll(config.expiration);
      dntApplied = true;

      applyConsentSignals(result.current, config, false);

      // Emit events
      emitReject(result.current);
      emitChange(result.current, result.previous);
      config.callbacks?.onReject?.();
      config.callbacks?.onChange?.(result.current);
    }
    // 'preselect' behavior is handled by default (banner shows with defaults off)
  }

  // Emit ready event
  emitReady(consent);
  config.callbacks?.onReady?.(consent);

  // Show UI based on consent state
  if (!hasConsentDecision() && !dntApplied) {
    // No consent decision yet - show banner
    showBanner({
      onAcceptAll: handleAcceptAll,
      onRejectAll: handleRejectAll,
      onSettings: handleShowSettings
    });
    emitShow('banner');
  } else {
    // Consent already given (or DNT auto-rejected) - show widget for reopening settings
    if (config.showWidget) {
      showWidget({ onClick: handleShowSettings });
    }
  }

  return Zest;
}

/**
 * Public API
 */
const Zest = {
  // Initialization
  init,

  // Banner control
  show() {
    if (!initialized) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    hideModal();
    hideWidget();
    showBanner({
      onAcceptAll: handleAcceptAll,
      onRejectAll: handleRejectAll,
      onSettings: handleShowSettings
    });
    emitShow('banner');
  },

  hide() {
    hideBanner();
    emitHide('banner');
  },

  // Settings modal
  showSettings() {
    if (!initialized) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    handleShowSettings();
  },

  hideSettings() {
    hideModal();
    emitHide('modal');
  },

  // Consent management
  getConsent,
  hasConsent,
  hasConsentDecision,
  getConsentProof,

  // DNT detection
  isDoNotTrackEnabled,
  getDNTDetails,

  // Accept/Reject programmatically
  acceptAll() {
    if (!initialized) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    handleAcceptAll();
  },

  rejectAll() {
    if (!initialized) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    handleRejectAll();
  },

  // Reset and show banner again
  reset() {
    resetConsent();
    hideModal();
    removeWidget();

    if (initialized) {
      showBanner({
        onAcceptAll: handleAcceptAll,
        onRejectAll: handleRejectAll,
        onSettings: handleShowSettings
      });
      emitShow('banner');
    }
  },

  // Config
  getConfig: getCurrentConfig,

  // Events
  EVENTS
};

// Auto-init if config present
if (typeof window !== 'undefined') {
  // Make Zest available globally
  window.Zest = Zest;

  const autoInit = () => {
    const cfg = getConfig();
    if (cfg.autoInit !== false) {
      init(window.ZestConfig);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

export default Zest;
