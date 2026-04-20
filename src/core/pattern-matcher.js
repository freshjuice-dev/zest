/**
 * Pattern Matcher - Categorizes cookies and storage keys by pattern
 */

import { safeRegExp } from './security.js';

/**
 * Default patterns for each category
 */
export const DEFAULT_PATTERNS = {
  essential: [
    /^zest_/,
    /^csrf/i,
    /^xsrf/i,
    /^session/i,
    /^__host-/i,
    /^__secure-/i
  ],
  functional: [
    /^lang/i,
    /^locale/i,
    /^theme/i,
    /^preferences/i,
    /^ui_/i
  ],
  analytics: [
    /^_ga/,
    /^_gid/,
    /^_gat/,
    /^_utm/,
    /^__utm/,
    /^plausible/i,
    /^_pk_/,
    /^matomo/i,
    /^_hj/,
    /^ajs_/
  ],
  marketing: [
    /^_fbp/,
    /^_fbc/,
    /^_gcl/,
    /^_ttp/,
    /^ads/i,
    /^doubleclick/i,
    /^__gads/,
    /^__gpi/,
    /^_pin_/,
    /^li_/
  ]
};

let patterns = { ...DEFAULT_PATTERNS };

/**
 * Set custom patterns. User-supplied strings are validated with safeRegExp,
 * which rejects catastrophic-backtracking shapes and syntax errors.
 * Invalid patterns are silently dropped with a console warning.
 */
export function setPatterns(customPatterns) {
  patterns = { ...DEFAULT_PATTERNS };
  if (!customPatterns || typeof customPatterns !== 'object') return;

  for (const [category, regexList] of Object.entries(customPatterns)) {
    if (!Array.isArray(regexList)) continue;

    const compiled = [];
    for (const p of regexList) {
      const re = safeRegExp(p);
      if (re) {
        compiled.push(re);
      } else {
        try {
          console.warn('[Zest] Rejected unsafe pattern:', p);
        } catch (_) { /* no-op */ }
      }
    }
    patterns[category] = compiled;
  }
}

/**
 * Get current patterns
 */
export function getPatterns() {
  return { ...patterns };
}

/**
 * Determine category for a cookie/storage key name
 * @param {string} name - Cookie or storage key name
 * @returns {string} Category ID (defaults to 'marketing' for unknown)
 */
export function getCategoryForName(name) {
  for (const [category, regexList] of Object.entries(patterns)) {
    if (regexList.some(regex => regex.test(name))) {
      return category;
    }
  }
  // Unknown items default to marketing (strictest)
  return 'marketing';
}

/**
 * Parse cookie string to extract name
 * @param {string} cookieString - Full cookie string (e.g., "name=value; path=/")
 * @returns {string|null} Cookie name or null
 */
export function parseCookieName(cookieString) {
  const match = cookieString.match(/^([^=]+)/);
  return match ? match[1].trim() : null;
}
