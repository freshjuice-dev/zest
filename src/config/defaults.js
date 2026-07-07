/**
 * Default configuration values
 */

import { DEFAULT_CATEGORIES } from '../core/categories.js';
import { detectLanguage, getTranslation } from '../i18n/translations.js';
import { safeUrl } from '../core/security.js';
import { GEO_ACTIONS } from '../core/geo.js';

export const DEFAULTS = {
  // Language: 'auto' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'pl' | 'uk' | 'ru' | 'ja' | 'zh'
  lang: 'auto',

  // UI positioning
  position: 'bottom', // 'bottom' | 'bottom-left' | 'bottom-right' | 'top' | 'top-left' | 'top-right' | 'center'

  // Theming
  theme: 'auto', // 'light' | 'dark' | 'auto'
  accentColor: '#0071e3',

  // Categories
  categories: DEFAULT_CATEGORIES,

  // UI Labels
  labels: {
    banner: {
      title: 'We value your privacy',
      description: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      settings: 'Settings'
    },
    modal: {
      title: 'Privacy Settings',
      description: 'Manage your cookie preferences. You can enable or disable different types of cookies below.',
      save: 'Save Preferences',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      // Anchor text for the privacy-policy link rendered next to the modal
      // description when `policyUrl` is set. Overridable per-language via
      // translations and per-site via `labels.modal.policyText`.
      policyText: 'Privacy Policy'
    },
    widget: {
      label: 'Cookie Settings'
    },
    notice: {
      title: 'Your Privacy Choices',
      optOut: 'Do Not Sell or Share My Personal Information',
      dismiss: 'Dismiss'
    }
  },

  // Behavior
  autoInit: true,
  showWidget: true,
  expiration: 365,

  // "Powered by Zest" attribution link (→ https://cookiezest.com).
  //   true | 'modal' | 'banner' | false
  // `true` (default) shows it on both the banner and the settings modal;
  // `'modal'` / `'banner'` restrict it to one surface; `false` removes it
  // everywhere. Normalised by normalizeBranding() in mergeConfig.
  branding: true,

  // Do Not Track / Global Privacy Control
  // respectDNT: true = respect DNT/GPC signals
  // dntBehavior: 'reject' | 'preselect' | 'ignore'
  //   - 'reject': auto-reject non-essential, don't show banner
  //   - 'preselect': show banner with non-essential unchecked (same as normal)
  //   - 'ignore': ignore DNT completely
  respectDNT: true,
  dntBehavior: 'reject',

  // Button style for both Accept and Reject buttons:
  //   'fill'    — solid, equal visual weight (default, equal prominence)
  //   'outline' — accent-colored border, transparent background
  buttonStyle: 'fill',

  // Button layout in the banner and modal footer:
  //   'row'   — all buttons in a single row (default)
  //   'split' — settings on the left, accept+reject grouped on the right
  buttonLayout: 'row',

  // Blur the page content behind the settings modal and hard wall.
  // A number in pixels (e.g. 8) or false/0 to disable. Off by default —
  // backdrop-filter can be expensive on low-end devices.
  backdropBlur: 0,

  // Hard consent wall: a full-viewport overlay behind the banner that
  // blocks interaction with the page until the visitor accepts or rejects.
  // Off by default — it is an aggressive UX pattern. Use when the site
  // needs provable awareness that the visitor saw and decided.
  hardWall: false,

  // Custom styles to inject into Shadow DOM
  customStyles: '',

  // Vendor consent mode integrations (optional)
  consentModeGoogle: false,
  consentModeMicrosoft: false,

  // Blocking mode: 'manual' | 'safe' | 'strict' | 'doomsday'
  mode: 'safe',

  // Interceptor toggles. By default Zest installs cookie + storage
  // interceptors that route writes through the consent layer. Consumers
  // who manage gating themselves (typically headless mode with custom
  // analytics integrations) can opt out per channel.
  intercept: {
    cookies: true,
    storage: true,
    scripts: true,
    network: true
  },

  // Strictly-necessary declarations. Both fields *append* to whatever
  // the essential category already matches via the pattern matcher
  // defaults — they do not replace.
  //
  // - essentialKeys:    array of exact storage / cookie names to treat
  //                     as strictly-necessary. Easiest case.
  // - essentialPatterns: array of regex source strings, validated via
  //                      safeRegExp. For prefix or family matches.
  //
  // Use these instead of `patterns.essential` when you only want to
  // ADD entries to the essential category without replacing the
  // built-in patterns (zest_*, csrf*, xsrf*, session*, __host-*,
  // __secure-*).
  essentialKeys: [],
  essentialPatterns: [],

  // Custom domains to block (in addition to mode-based blocking)
  blockedDomains: [], // days

  // Links
  policyUrl: null,
  imprintUrl: null,

  // Geo / jurisdiction gating (opt-in). null = off (show to everyone).
  // When set, Zest resolves the visitor's jurisdiction and decides which
  // experience to present (full banner / "Do Not Sell" notice / nothing).
  // See src/core/geo.js for the verdict shape and action vocabulary.
  //   geo: {
  //     provider: 'gateway',        // use https://geo.cookiezest.com/privacy
  //     endpoint: 'https://…',      // OR a self-hosted zest-geo /privacy URL
  //     resolver: async () => ({ isGDPR, isUSPrivacy, … }), // OR your own fn
  //     decide(geo) { … return 'consent' | 'notice' | 'allow' | 'block' },
  //     timeout: 1500,              // ms before falling back
  //     fallback: 'consent'         // action when resolution fails (fail-closed)
  //   }
  geo: null,

  // Callbacks
  callbacks: {
    onAccept: null,
    onReject: null,
    onChange: null,
    onReady: null,
    // Fired once geo resolution completes: (action, verdict) where action is
    // 'consent' | 'notice' | 'allow' | 'block' and verdict is the sanitized
    // jurisdiction object (or null on failure). Primary hook for headless.
    onGeo: null
  }
};

/**
 * Surfaces that can carry the "Powered by Zest" attribution.
 */
export const BRANDING_SURFACES = new Set(['banner', 'modal']);

/**
 * Normalise a `branding` config value into a canonical form:
 *   true | false | 'modal' | 'banner'
 *
 * Accepts booleans and the strings `'modal'` / `'banner'` (case-insensitive)
 * plus the usual on/off aliases. Unknown / unexpected values fall back to
 * `true` (the default, fail-safe) so a typo never silently hides the
 * attribution the project relies on.
 */
export function normalizeBranding(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'false' || v === 'off' || v === 'no' || v === '0') return false;
    if (v === 'true' || v === 'on' || v === 'yes' || v === '1' || v === '') return true;
    if (BRANDING_SURFACES.has(v)) return v;
  }
  return true;
}

/**
 * Decide whether the attribution should render on a given surface, given
 * the normalised `branding` value. `surface` must be `'banner'` or `'modal'`.
 */
export function shouldShowBranding(branding, surface) {
  if (branding === false) return false;
  if (branding === 'modal') return surface === 'modal';
  if (branding === 'banner') return surface === 'banner';
  return true; // true / unknown -> show everywhere (fail-safe)
}

/**
 * Normalise a `buttonStyle` config value into a canonical form:
 *   'fill' | 'outline'
 *
 * Accepts the strings `'fill'` / `'outline'` (case-insensitive). Anything
 * else (unknown string, number, etc.) falls back to `'fill'` — the default,
 * fail-safe rendering — so a typo can never silently switch the buttons to
 * the outlined variant.
 */
export function normalizeButtonStyle(value) {
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'outline') return 'outline';
    if (v === 'fill') return 'fill';
  }
  return 'fill';
}

/**
 * Normalise a `buttonLayout` config value into a canonical form:
 *   'row' | 'split'
 *
 * Unknown values fall back to 'row' (the default, fail-safe).
 */
export function normalizeButtonLayout(value) {
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'split') return 'split';
    if (v === 'split-modern') return 'split-modern';
    if (v === 'row') return 'row';
  }
  return 'row';
}

/**
 * Validate and normalise the opt-in `geo` config block. Unknown / unsafe
 * values are dropped; `endpoint` must be an http(s) URL. Returns null when no
 * usable source is present.
 *
 * Accepts `geo: true` as a shorthand for the hosted gateway — the simplest
 * "just turn geo on" form, equivalent to `{ provider: 'gateway' }`.
 */
function normalizeGeoConfig(geo) {
  if (geo === true) return { provider: 'gateway', timeout: 1500, fallback: 'consent' };
  if (!geo || typeof geo !== 'object' || Array.isArray(geo)) return null;

  const out = {};

  if (geo.provider === 'gateway') out.provider = 'gateway';

  if (typeof geo.endpoint === 'string') {
    const url = safeUrl(geo.endpoint);
    if (url && /^https?:/i.test(url)) out.endpoint = url;
  }

  if (typeof geo.resolver === 'function') out.resolver = geo.resolver;
  if (typeof geo.decide === 'function') out.decide = geo.decide;

  out.timeout = (typeof geo.timeout === 'number' && geo.timeout >= 100 && geo.timeout <= 10000)
    ? geo.timeout
    : 1500;

  out.fallback = GEO_ACTIONS.includes(geo.fallback) ? geo.fallback : 'consent';

  // No explicit source given -> default to the hosted gateway, which is the
  // common "just turn geo on" intent (e.g. data-geo="on").
  if (!out.resolver && !out.endpoint && !out.provider) out.provider = 'gateway';

  return out;
}

/**
 * Merge user config with defaults (deep merge)
 */
export function mergeConfig(userConfig) {
  const config = { ...DEFAULTS };

  if (!userConfig) {
    userConfig = {};
  }

  // Simple properties
  const simpleKeys = ['lang', 'position', 'theme', 'accentColor', 'autoInit', 'showWidget', 'expiration', 'policyUrl', 'imprintUrl', 'customStyles', 'mode', 'blockedDomains', 'respectDNT', 'dntBehavior', 'consentModeGoogle', 'consentModeMicrosoft', 'backdropBlur', 'hardWall', 'buttonLayout'];
  for (const key of simpleKeys) {
    if (userConfig[key] !== undefined) {
      config[key] = userConfig[key];
    }
  }

  // Branding accepts true | false | 'modal' | 'banner' (plus on/off aliases).
  // Normalise into a canonical value so the UI only ever sees the four forms.
  if (userConfig.branding !== undefined) {
    config.branding = normalizeBranding(userConfig.branding);
  }

  // Button style: 'fill' (default, solid) or 'outline' (bordered, transparent).
  // Normalised so a typo or wrong case never silently falls through to the
  // outline branch in styles.js — unknown values stay on the safe 'fill' default.
  if (userConfig.buttonStyle !== undefined) {
    config.buttonStyle = normalizeButtonStyle(userConfig.buttonStyle);
  }

  // Button layout: 'row' (default) or 'split'. Normalised so unknown values
  // fall back to 'row' rather than silently switching to split.
  if (userConfig.buttonLayout !== undefined) {
    config.buttonLayout = normalizeButtonLayout(userConfig.buttonLayout);
  }

  // Detect language and get translations
  const detectedLang = detectLanguage(config.lang);
  config.lang = detectedLang;
  const translation = getTranslation(detectedLang);

  // Deep merge labels (translation < user config)
  const translationLabels = translation.labels || {};
  const userLabels = userConfig.labels || {};
  config.labels = {
    banner: {
      ...DEFAULTS.labels.banner,
      ...translationLabels.banner,
      ...userLabels.banner
    },
    modal: {
      ...DEFAULTS.labels.modal,
      ...translationLabels.modal,
      ...userLabels.modal
    },
    widget: {
      ...DEFAULTS.labels.widget,
      ...translationLabels.widget,
      ...userLabels.widget
    },
    notice: {
      ...DEFAULTS.labels.notice,
      ...translationLabels.notice,
      ...userLabels.notice
    }
  };

  // Deep merge categories (translation < user config)
  const translationCategories = translation.categories || {};
  const userCategories = userConfig.categories || {};
  config.categories = { ...DEFAULTS.categories };
  for (const key of Object.keys(DEFAULTS.categories)) {
    config.categories[key] = {
      ...DEFAULTS.categories[key],
      ...translationCategories[key],
      ...userCategories[key]
    };
  }

  // Merge callbacks
  if (userConfig.callbacks) {
    config.callbacks = { ...DEFAULTS.callbacks, ...userConfig.callbacks };
  }

  // Patterns (for pattern matcher)
  if (userConfig.patterns) {
    config.patterns = userConfig.patterns;
  }

  // Interceptor toggles — shallow-merge so consumers can pass partial
  // overrides like `intercept: { storage: false }` without losing the
  // other defaults.
  if (userConfig.intercept && typeof userConfig.intercept === 'object') {
    config.intercept = {
      ...DEFAULTS.intercept,
      ...userConfig.intercept
    };
  }

  // Strictly-necessary declarations
  if (Array.isArray(userConfig.essentialKeys)) {
    config.essentialKeys = userConfig.essentialKeys.filter(
      (k) => typeof k === 'string' && k.length > 0 && k.length <= 200
    );
  }
  if (Array.isArray(userConfig.essentialPatterns)) {
    config.essentialPatterns = userConfig.essentialPatterns.filter(
      (p) => typeof p === 'string' && p.length > 0 && p.length <= 500
    );
  }

  // Geo / jurisdiction gating (opt-in, validated).
  if (userConfig.geo !== undefined) {
    config.geo = normalizeGeoConfig(userConfig.geo);
  }

  return config;
}
