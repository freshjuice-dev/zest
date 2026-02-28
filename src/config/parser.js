/**
 * Configuration Parser - Reads config from various sources
 */

import { mergeConfig } from './defaults.js';

/**
 * Parse data attributes from script tag
 */
function parseDataAttributes() {
  // Find the Zest script tag
  const script = document.currentScript ||
    document.querySelector('script[data-zest]') ||
    document.querySelector('script[src*="zest"]');

  if (!script) {
    return {};
  }

  const config = {};

  // Position
  const position = script.getAttribute('data-position');
  if (position) config.position = position;

  // Theme
  const theme = script.getAttribute('data-theme');
  if (theme) config.theme = theme;

  // Accent color
  const accent = script.getAttribute('data-accent') || script.getAttribute('data-accent-color');
  if (accent) config.accentColor = accent;

  // Policy URL
  const policyUrl = script.getAttribute('data-policy-url') || script.getAttribute('data-privacy-url');
  if (policyUrl) config.policyUrl = policyUrl;

  // Imprint URL
  const imprintUrl = script.getAttribute('data-imprint-url');
  if (imprintUrl) config.imprintUrl = imprintUrl;

  // Show widget
  const showWidget = script.getAttribute('data-show-widget');
  if (showWidget !== null) config.showWidget = showWidget !== 'false';

  // Auto init
  const autoInit = script.getAttribute('data-auto-init');
  if (autoInit !== null) config.autoInit = autoInit !== 'false';

  // Expiration
  const expiration = script.getAttribute('data-expiration');
  if (expiration) config.expiration = parseInt(expiration, 10);

  // Consent mode integrations
  const consentModeGoogle = script.getAttribute('data-consent-mode-google');
  if (consentModeGoogle !== null) config.consentModeGoogle = consentModeGoogle !== 'false';

  const consentModeMicrosoft = script.getAttribute('data-consent-mode-microsoft');
  if (consentModeMicrosoft !== null) config.consentModeMicrosoft = consentModeMicrosoft !== 'false';

  return config;
}

/**
 * Parse window.ZestConfig object
 */
function parseWindowConfig() {
  if (typeof window !== 'undefined' && window.ZestConfig) {
    return window.ZestConfig;
  }
  return {};
}

/**
 * Get final merged configuration
 * Priority: data attributes > window.ZestConfig > defaults
 */
export function getConfig() {
  const windowConfig = parseWindowConfig();
  const dataConfig = parseDataAttributes();

  // Merge: defaults < windowConfig < dataConfig
  return mergeConfig({
    ...windowConfig,
    ...dataConfig
  });
}

/**
 * Update configuration at runtime
 */
let currentConfig = null;

export function setConfig(config) {
  currentConfig = mergeConfig(config);
  return currentConfig;
}

export function getCurrentConfig() {
  if (!currentConfig) {
    currentConfig = getConfig();
  }
  return currentConfig;
}
