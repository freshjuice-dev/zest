/**
 * Default configuration values
 */

import { DEFAULT_CATEGORIES } from '../core/categories.js';
import { detectLanguage, getTranslation } from '../i18n/translations.js';

export const DEFAULTS = {
  // Language: 'auto' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'pl' | 'uk' | 'ru' | 'ja' | 'zh'
  lang: 'auto',

  // UI positioning
  position: 'bottom', // 'bottom' | 'bottom-left' | 'bottom-right' | 'top'

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
      rejectAll: 'Reject All'
    },
    widget: {
      label: 'Cookie Settings'
    }
  },

  // Behavior
  autoInit: true,
  showWidget: true,
  expiration: 365,

  // Do Not Track / Global Privacy Control
  // respectDNT: true = respect DNT/GPC signals
  // dntBehavior: 'reject' | 'preselect' | 'ignore'
  //   - 'reject': auto-reject non-essential, don't show banner
  //   - 'preselect': show banner with non-essential unchecked (same as normal)
  //   - 'ignore': ignore DNT completely
  respectDNT: true,
  dntBehavior: 'reject',

  // Custom styles to inject into Shadow DOM
  customStyles: '',

  // Vendor consent mode integrations (optional)
  consentModeGoogle: false,
  consentModeMicrosoft: false,

  // Blocking mode: 'manual' | 'safe' | 'strict' | 'doomsday'
  mode: 'safe',

  // Custom domains to block (in addition to mode-based blocking)
  blockedDomains: [], // days

  // Links
  policyUrl: null,
  imprintUrl: null,

  // Callbacks
  callbacks: {
    onAccept: null,
    onReject: null,
    onChange: null,
    onReady: null
  }
};

/**
 * Merge user config with defaults (deep merge)
 */
export function mergeConfig(userConfig) {
  const config = { ...DEFAULTS };

  if (!userConfig) {
    userConfig = {};
  }

  // Simple properties
  const simpleKeys = ['lang', 'position', 'theme', 'accentColor', 'autoInit', 'showWidget', 'expiration', 'policyUrl', 'imprintUrl', 'customStyles', 'mode', 'blockedDomains', 'respectDNT', 'dntBehavior', 'consentModeGoogle', 'consentModeMicrosoft'];
  for (const key of simpleKeys) {
    if (userConfig[key] !== undefined) {
      config[key] = userConfig[key];
    }
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

  return config;
}
