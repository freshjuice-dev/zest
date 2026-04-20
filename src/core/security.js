/**
 * Security utilities - escaping, validation, and safe parsing helpers
 *
 * These helpers are used across UI components, URL/CSS validation, and
 * consent-cookie parsing to provide defense-in-depth against untrusted
 * config (CMS-driven, i18n-loaded, or attacker-supplied).
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
};

/**
 * Escape a value for safe embedding in HTML text nodes and attribute values.
 * Accepts any value — non-strings are stringified first. null/undefined -> ''.
 */
export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return str.replace(/[&<>"'`]/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

/**
 * Validate a URL — return the URL if it uses http:/https:/mailto:/tel:,
 * otherwise return null. Blocks javascript:, data:, vbscript:, file:, etc.
 */
export function safeUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  // Relative URLs (no protocol) are safe — treat as same-origin path
  if (/^[/?#]/.test(trimmed)) return trimmed;

  // Check protocol explicitly, do NOT rely on URL parsing alone —
  // attackers may use whitespace/control characters to confuse parsers.
  const match = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!match) {
    // No protocol — treat as relative
    return trimmed;
  }

  const protocol = match[1].toLowerCase();
  if (protocol === 'http' || protocol === 'https' || protocol === 'mailto' || protocol === 'tel') {
    return trimmed;
  }
  return null;
}

/**
 * Validate a CSS color value. Accepts #rgb/#rrggbb/#rrggbbaa and a
 * small allowlist of CSS named colors and rgb()/rgba()/hsl()/hsla()
 * functional forms with numeric-only arguments.
 */
const NAMED_COLORS = new Set([
  'transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow',
  'orange', 'purple', 'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta',
  'silver', 'gold', 'navy', 'teal', 'maroon', 'olive', 'lime', 'aqua',
  'fuchsia', 'indigo', 'violet', 'crimson', 'coral', 'salmon', 'tomato'
]);

export function safeColor(color) {
  if (typeof color !== 'string') return null;
  const trimmed = color.trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (NAMED_COLORS.has(trimmed.toLowerCase())) return trimmed;

  // Functional notations: only digits, dots, commas, %, whitespace between parens
  if (/^(rgb|rgba|hsl|hsla)\(\s*[\d.,%\s/]+\s*\)$/i.test(trimmed)) return trimmed;

  return null;
}

/**
 * Validate a regex pattern string. Rejects patterns that contain known
 * catastrophic-backtracking shapes (nested quantifiers). Compiles with
 * try/catch.
 *
 * Returns a RegExp on success, null on failure.
 */
const REDOS_PATTERNS = [
  /(\([^)]*[+*][^)]*\)|\[[^\]]*\]|\\w|\\d|\\s)\s*[+*]/, // nested quantifier
  /\(\?[=!][^)]*[+*][^)]*\)[+*]/, // lookahead with quantifier, then quantifier
];

export function safeRegExp(pattern, flags) {
  if (pattern instanceof RegExp) return pattern;
  if (typeof pattern !== 'string') return null;

  // Cap pattern length to limit compiled-regex state
  if (pattern.length > 500) return null;

  // Heuristic: reject obviously dangerous patterns
  for (const bad of REDOS_PATTERNS) {
    if (bad.test(pattern)) return null;
  }

  try {
    return new RegExp(pattern, flags);
  } catch (e) {
    return null;
  }
}

/**
 * Sanitize a consent-cookie payload. Only known category keys with
 * boolean values survive; prototype-polluting keys are stripped.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeConsentPayload(raw, knownCategoryIds) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const result = {
    version: typeof raw.version === 'string' ? raw.version : null,
    timestamp: typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : null,
    categories: {}
  };

  const cats = raw.categories;
  if (!cats || typeof cats !== 'object' || Array.isArray(cats)) return null;

  for (const key of knownCategoryIds) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (Object.prototype.hasOwnProperty.call(cats, key)) {
      result.categories[key] = cats[key] === true;
    }
  }

  // essential is always true regardless of stored value
  if (knownCategoryIds.includes('essential')) {
    result.categories.essential = true;
  }

  return result;
}

/**
 * Invoke a user-supplied callback, swallowing and logging exceptions so
 * a misbehaving callback can't break the consent flow.
 */
export function safeInvoke(fn, ...args) {
  if (typeof fn !== 'function') return undefined;
  try {
    return fn(...args);
  } catch (e) {
    try {
      console.error('[Zest] User callback threw:', e);
    } catch (_) {
      /* no-op */
    }
    return undefined;
  }
}

/**
 * Strip comments and selector-level content from a customStyles string
 * while still allowing property/value declarations scoped under the
 * component selectors the author is targeting. We cannot fully sandbox
 * CSS without a parser, but we can at least neutralise the most
 * dangerous clickjacking vector (rules targeting Zest's own buttons).
 *
 * Returns the sanitized CSS string (possibly empty).
 */
export function sanitizeCustomStyles(css) {
  if (typeof css !== 'string' || css.length === 0) return '';

  // Hard cap on size to avoid runaway payloads
  if (css.length > 20000) return '';

  // Remove CSS comments (can hide payloads)
  let out = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Block at-rules that can load external resources or alter behavior
  out = out.replace(/@import\s+[^;]+;?/gi, '');
  out = out.replace(/@charset\s+[^;]+;?/gi, '');

  // Block url() values pointing outside of data: or https:
  out = out.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (match, quote, value) => {
    const v = value.trim().toLowerCase();
    if (v.startsWith('https:') || v.startsWith('data:image/') || v.startsWith('/') || v.startsWith('#')) {
      return match;
    }
    return 'url(#)';
  });

  // Block selectors that target the built-in reject button, which could
  // be used to hide it for clickjacking consent bypass.
  out = out.replace(/\.zest-btn--secondary\s*\{[^}]*\}/gi, '');
  out = out.replace(/\[data-action\s*=\s*["']reject-all["']\]\s*\{[^}]*\}/gi, '');
  out = out.replace(/\[data-action\s*=\s*["']accept-all["']\]\s*\{[^}]*\}/gi, '');

  // Block expression() (ancient IE) and -moz-binding (ancient FF)
  out = out.replace(/expression\s*\([^)]*\)/gi, '');
  out = out.replace(/-moz-binding\s*:[^;}]*/gi, '');

  return out;
}
