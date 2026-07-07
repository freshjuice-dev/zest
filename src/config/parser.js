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

  // "Powered by Zest" attribution. Accepts 'true'/'false'/'modal'/'banner'
  // (plus on/off aliases). Passed through raw and normalised in mergeConfig
  // so the canonical form (true | false | 'modal' | 'banner') reaches the UI.
  const branding = script.getAttribute('data-branding');
  if (branding !== null) config.branding = branding;

  // Button style: 'fill' (default, solid) or 'outline' (bordered, transparent).
  // Passed through raw and normalised in mergeConfig.
  const buttonStyle = script.getAttribute('data-button-style');
  if (buttonStyle !== null) config.buttonStyle = buttonStyle;

  // Backdrop blur: blur the page content behind the modal and hard wall.
  // A number in pixels (e.g. data-backdrop-blur="8"). 0 or "false" disables.
  const backdropBlurAttr = script.getAttribute('data-backdrop-blur');
  if (backdropBlurAttr !== null) {
    if (backdropBlurAttr === 'false' || backdropBlurAttr === '0') {
      config.backdropBlur = 0;
    } else {
      const px = parseInt(backdropBlurAttr, 10);
      config.backdropBlur = isNaN(px) ? 8 : Math.max(0, Math.min(50, px));
    }
  }

  // Hard consent wall: block page interaction until the visitor decides.
  // Off by default. data-hard-wall="on" / "true" / "yes" enables it.
  const hardWall = script.getAttribute('data-hard-wall');
  if (hardWall !== null) config.hardWall = hardWall !== 'false';

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

  // Geo gating. `data-geo="on"` (or "gateway"/"true") turns on jurisdiction
  // detection via the hosted gateway. A custom endpoint / timeout / fallback
  // can be supplied too. (decide()/resolver() are JS-only, never attributes.)
  const geoAttr = script.getAttribute('data-geo');
  if (geoAttr !== null) {
    const geo = {};
    if (geoAttr === '' || geoAttr === 'on' || geoAttr === 'true' || geoAttr === 'gateway') {
      geo.provider = 'gateway';
    }
    const geoEndpoint = script.getAttribute('data-geo-endpoint');
    if (geoEndpoint) geo.endpoint = geoEndpoint;
    const geoTimeout = script.getAttribute('data-geo-timeout');
    if (geoTimeout) geo.timeout = parseInt(geoTimeout, 10);
    const geoFallback = script.getAttribute('data-geo-fallback');
    if (geoFallback) geo.fallback = geoFallback;
    config.geo = geo;
  }

  // Hide consent categories from the settings modal.
  // data-hide-categories="analytics" or data-hide-categories="analytics,marketing"
  // Hidden categories are forced to false (rejected) — a visitor must never
  // accept a toggle they cannot see. Essential is always visible.
  const hideAttr = script.getAttribute('data-hide-categories');
  if (hideAttr) {
    const ids = hideAttr.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      config.categories = {};
      for (const id of ids) {
        config.categories[id] = { hidden: true };
      }
    }
  }

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

  // Shallow spread, but deep-merge `categories` so window.ZestConfig
  // category overrides (label, description, …) are not clobbered by
  // data-hide-categories which sets { hidden: true } per category.
  const merged = { ...windowConfig, ...dataConfig };
  if (windowConfig.categories && dataConfig.categories) {
    merged.categories = {};
    for (const key of Object.keys(windowConfig.categories)) {
      merged.categories[key] = { ...windowConfig.categories[key] };
    }
    for (const key of Object.keys(dataConfig.categories)) {
      merged.categories[key] = {
        ...merged.categories[key],
        ...dataConfig.categories[key]
      };
    }
  }

  return mergeConfig(merged);
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
