/**
 * Consent Signals - Optional vendor consent mode integrations
 *
 * Pushes consent state to Google Consent Mode v2 and/or Microsoft UET
 * Consent Mode when enabled via config.
 */

/**
 * Map Zest consent state to Google Consent Mode v2 signals
 */
function toGoogleSignals(consent) {
  const g = (val) => val ? 'granted' : 'denied';
  return {
    ad_storage: g(consent.marketing),
    ad_user_data: g(consent.marketing),
    ad_personalization: g(consent.marketing),
    analytics_storage: g(consent.analytics),
    functionality_storage: 'granted', // essential is always true
    personalization_storage: g(consent.functional)
  };
}

/**
 * Push consent signal to Google via gtag or dataLayer fallback.
 * Uses a local function to preserve the `arguments` object shape
 * that gtag/dataLayer expects (not an array).
 */
function pushGoogle(type, signals) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === 'function') {
    window.gtag('consent', type, signals);
  } else {
    function gtagFallback() { window.dataLayer.push(arguments); }
    gtagFallback('consent', type, signals);
  }
}

/**
 * Map Zest consent state to Microsoft UET signal.
 * Microsoft UET only exposes ad_storage.
 */
function toMicrosoftSignals(consent) {
  return { ad_storage: consent.marketing ? 'granted' : 'denied' };
}

/**
 * Push consent signal to Microsoft UET
 */
function pushMicrosoft(type, signals) {
  window.uetq = window.uetq || [];
  window.uetq.push('consent', type, signals);
}

/**
 * Apply consent signals to enabled vendor integrations.
 *
 * @param {Object} consent    Current Zest consent state
 * @param {Object} config     Merged Zest config
 * @param {boolean} isDefault true on first call (pushes 'default'), false for updates
 */
export function applyConsentSignals(consent, config, isDefault) {
  const type = isDefault ? 'default' : 'update';

  if (config.consentModeGoogle) {
    pushGoogle(type, toGoogleSignals(consent));
  }

  if (config.consentModeMicrosoft) {
    pushMicrosoft(type, toMicrosoftSignals(consent));
  }
}
