/**
 * Consent Store - Manages consent state persistence
 */

import { getDefaultConsent, getCategoryIds } from '../core/categories.js';
import { getOriginalCookieDescriptor } from '../core/cookie-interceptor.js';
import { sanitizeConsentPayload } from '../core/security.js';

const COOKIE_NAME = 'zest_consent';
const CONSENT_VERSION = '1.0';

/**
 * Return the Secure flag fragment when running over HTTPS, empty otherwise.
 * On HTTPS sites, omitting Secure lets the cookie leak over plain HTTP.
 */
function secureAttribute() {
  try {
    return typeof location !== 'undefined' && location.protocol === 'https:'
      ? '; Secure'
      : '';
  } catch (_) {
    return '';
  }
}

// Current consent state
let consent = null;

/**
 * Get the original cookie setter (bypasses interception)
 */
function setRawCookie(value) {
  const descriptor = getOriginalCookieDescriptor();
  if (descriptor?.set) {
    descriptor.set.call(document, value);
  } else {
    // Fallback if interceptor not initialized yet
    document.cookie = value;
  }
}

/**
 * Get the original cookie getter
 */
function getRawCookie() {
  const descriptor = getOriginalCookieDescriptor();
  if (descriptor?.get) {
    return descriptor.get.call(document);
  }
  return document.cookie;
}

/**
 * Load consent from cookie.
 *
 * The parsed cookie is validated against the expected schema via
 * sanitizeConsentPayload — only known category keys with boolean values
 * survive, so a tampered cookie can't inject prototype-polluting props
 * or unexpected category shapes.
 */
export function loadConsent() {
  try {
    const cookies = getRawCookie();
    const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));

    if (match) {
      const raw = JSON.parse(decodeURIComponent(match[1]));
      const clean = sanitizeConsentPayload(raw, getCategoryIds());
      if (clean && clean.categories) {
        consent = { ...getDefaultConsent(), ...clean.categories };
        return { ...consent };
      }
    }
  } catch (e) {
    // Invalid or missing cookie
  }

  consent = getDefaultConsent();
  return { ...consent };
}

/**
 * Save consent to cookie
 */
export function saveConsent(expirationDays = 365) {
  if (!consent) {
    consent = getDefaultConsent();
  }

  const data = {
    version: CONSENT_VERSION,
    timestamp: Date.now(),
    categories: consent
  };

  const expires = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toUTCString();
  const cookieValue = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; expires=${expires}; path=/; SameSite=Lax${secureAttribute()}`;

  setRawCookie(cookieValue);
}

/**
 * Get current consent state
 */
export function getConsent() {
  if (!consent) {
    consent = loadConsent();
  }
  return { ...consent };
}

/**
 * Update consent state
 */
export function updateConsent(newConsent, expirationDays = 365) {
  const previous = consent ? { ...consent } : getDefaultConsent();

  consent = {
    essential: true, // Always true
    functional: !!newConsent.functional,
    analytics: !!newConsent.analytics,
    marketing: !!newConsent.marketing
  };

  saveConsent(expirationDays);

  return { current: { ...consent }, previous };
}

/**
 * Check if specific category is allowed
 */
export function hasConsent(category) {
  if (!consent) {
    consent = loadConsent();
  }
  return consent[category] === true;
}

/**
 * Accept all categories
 */
export function acceptAll(expirationDays = 365) {
  return updateConsent({
    essential: true,
    functional: true,
    analytics: true,
    marketing: true
  }, expirationDays);
}

/**
 * Reject all (except essential)
 */
export function rejectAll(expirationDays = 365) {
  return updateConsent({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  }, expirationDays);
}

/**
 * Reset consent (clear cookie)
 */
export function resetConsent() {
  setRawCookie(`${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secureAttribute()}`);
  consent = null;
}

/**
 * Check if consent has been given (any decision made)
 */
export function hasConsentDecision() {
  try {
    const cookies = getRawCookie();
    return cookies.includes(COOKIE_NAME);
  } catch (e) {
    return false;
  }
}

/**
 * Get consent proof for compliance
 */
export function getConsentProof() {
  try {
    const cookies = getRawCookie();
    const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));

    if (match) {
      const raw = JSON.parse(decodeURIComponent(match[1]));
      return sanitizeConsentPayload(raw, getCategoryIds());
    }
  } catch (e) {
    // Invalid cookie
  }

  return null;
}
