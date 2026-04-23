/**
 * Zest - Lightweight Cookie Consent Toolkit
 * Main entry (full build: logic + UI).
 *
 * For a logic-only build without any CSS / Shadow DOM mounting, import
 * from `@freshjuice/zest/headless` instead.
 */

// Core lifecycle (UI-agnostic)
import {
  coreInit,
  coreAcceptAll,
  coreRejectAll,
  coreUpdateConsent,
  coreReset,
  isInitialized,
  getActiveConfig
} from './core-lifecycle.js';

// Consent store + events
import {
  getConsent,
  hasConsent,
  hasConsentDecision,
  getConsentProof
} from './storage/consent-store.js';
import { emitShow, emitHide, EVENTS, on, once } from './storage/events.js';

// DNT introspection
import { isDoNotTrackEnabled, getDNTDetails } from './core/dnt.js';

// Config getters
import { getConfig, getCurrentConfig } from './config/parser.js';

// UI
import { showBanner, hideBanner, isBannerVisible } from './ui/banner.js';
import { showModal, hideModal, isModalVisible } from './ui/modal.js';
import { showWidget, hideWidget, removeWidget, isWidgetVisible } from './ui/widget.js';

/**
 * Handle accept all — delegates consent logic to core, handles UI swap.
 */
function handleAcceptAll() {
  coreAcceptAll();
  const config = getActiveConfig();

  hideBanner();
  hideModal();

  if (config?.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }
}

/**
 * Handle reject all.
 */
function handleRejectAll() {
  coreRejectAll();
  const config = getActiveConfig();

  hideBanner();
  hideModal();

  if (config?.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }
}

/**
 * Handle save preferences from modal.
 */
function handleSavePreferences(selections) {
  coreUpdateConsent(selections);
  const config = getActiveConfig();

  hideModal();

  if (config?.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }
}

/**
 * Open the settings modal.
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
 * Close the modal — either bring the widget back (decision made) or
 * fall back to the banner (no decision yet).
 */
function handleCloseModal() {
  hideModal();
  emitHide('modal');

  const config = getActiveConfig();
  if (hasConsentDecision() && config?.showWidget) {
    showWidget({ onClick: handleShowSettings });
  } else {
    showBanner({
      onAcceptAll: handleAcceptAll,
      onRejectAll: handleRejectAll,
      onSettings: handleShowSettings
    });
  }
}

/**
 * Initialize Zest with UI.
 */
function init(userConfig = {}) {
  const { alreadyInitialized, consent, hasDecision, dntApplied } = coreInit(userConfig);
  if (alreadyInitialized) {
    console.warn('[Zest] Already initialized');
    return Zest;
  }

  const config = getActiveConfig();

  if (!hasDecision && !dntApplied) {
    showBanner({
      onAcceptAll: handleAcceptAll,
      onRejectAll: handleRejectAll,
      onSettings: handleShowSettings
    });
    emitShow('banner');
  } else if (config?.showWidget) {
    showWidget({ onClick: handleShowSettings });
  }

  return Zest;
}

const Zest = {
  init,

  // Banner control
  show() {
    if (!isInitialized()) {
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
    if (!isInitialized()) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    handleShowSettings();
  },

  hideSettings() {
    hideModal();
    emitHide('modal');
  },

  // Consent state
  getConsent,
  hasConsent,
  hasConsentDecision,
  getConsentProof,

  // DNT
  isDoNotTrackEnabled,
  getDNTDetails,

  // Programmatic accept / reject
  acceptAll() {
    if (!isInitialized()) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    handleAcceptAll();
  },

  rejectAll() {
    if (!isInitialized()) {
      console.warn('[Zest] Not initialized. Call Zest.init() first.');
      return;
    }
    handleRejectAll();
  },

  // Reset everything and reshow the banner
  reset() {
    coreReset();
    hideModal();
    removeWidget();
    if (isInitialized()) {
      showBanner({
        onAcceptAll: handleAcceptAll,
        onRejectAll: handleRejectAll,
        onSettings: handleShowSettings
      });
      emitShow('banner');
    }
  },

  // Config introspection
  getConfig: getCurrentConfig,

  // Events
  on,
  once,
  EVENTS
};

// Auto-init if config present
if (typeof window !== 'undefined') {
  // Make Zest available globally. defineProperty with writable:false +
  // configurable:false stops a later-loaded script from replacing the
  // global with a trojanned stand-in.
  try {
    Object.defineProperty(window, 'Zest', {
      value: Object.freeze(Zest),
      writable: false,
      configurable: false,
      enumerable: true
    });
  } catch (e) {
    window.Zest = Zest;
  }

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
