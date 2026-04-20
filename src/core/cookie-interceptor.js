/**
 * Cookie Interceptor - Intercepts document.cookie operations
 */

import { getCategoryForName, parseCookieName } from './pattern-matcher.js';

// Store original descriptor
let originalCookieDescriptor = null;

// Upper bound on the number of queued cookies awaiting consent replay.
// An unbounded queue is a memory-exhaustion DoS vector — a hostile
// script could flood it with document.cookie writes.
const MAX_QUEUE_SIZE = 100;

// Queue for blocked cookies
const cookieQueue = [];

// Reference to consent checker function
let checkConsent = () => false;

/**
 * Set the consent checker function
 */
export function setConsentChecker(fn) {
  checkConsent = fn;
}

/**
 * Get the original cookie descriptor
 */
export function getOriginalCookieDescriptor() {
  return originalCookieDescriptor;
}

/**
 * Get queued cookies
 */
export function getCookieQueue() {
  return [...cookieQueue];
}

/**
 * Clear the cookie queue
 */
export function clearCookieQueue() {
  cookieQueue.length = 0;
}

/**
 * Replay queued cookies for allowed categories
 */
export function replayCookies(allowedCategories) {
  const remaining = [];

  for (const item of cookieQueue) {
    if (allowedCategories.includes(item.category)) {
      // Set the cookie using original setter
      if (originalCookieDescriptor?.set) {
        originalCookieDescriptor.set.call(document, item.value);
      }
    } else {
      remaining.push(item);
    }
  }

  cookieQueue.length = 0;
  cookieQueue.push(...remaining);
}

/**
 * Start intercepting cookies
 */
export function interceptCookies() {
  // Store original
  originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

  if (!originalCookieDescriptor) {
    console.warn('[Zest] Could not get cookie descriptor');
    return false;
  }

  Object.defineProperty(document, 'cookie', {
    get() {
      // Always allow reading
      return originalCookieDescriptor.get.call(document);
    },
    set(value) {
      const name = parseCookieName(value);
      if (!name) {
        return;
      }

      const category = getCategoryForName(name);

      if (checkConsent(category)) {
        // Consent given - set cookie
        originalCookieDescriptor.set.call(document, value);
      } else if (cookieQueue.length < MAX_QUEUE_SIZE) {
        // No consent - queue for later (capped to prevent DoS)
        cookieQueue.push({
          value,
          name,
          category,
          timestamp: Date.now()
        });
      }
    },
    // configurable: false prevents a later-loaded script from
    // overriding our descriptor and bypassing the interceptor.
    configurable: false
  });

  return true;
}

/**
 * Restore original cookie behavior.
 *
 * Note: after interceptCookies() has locked the descriptor with
 * configurable:false, this call will throw. The lock is intentional —
 * it stops a later-loaded script from unwinding the interceptor. If you
 * need a reset, call this before the first interceptCookies() call.
 */
export function restoreCookies() {
  if (!originalCookieDescriptor) return;
  try {
    Object.defineProperty(document, 'cookie', originalCookieDescriptor);
  } catch (_) {
    // Descriptor is locked; nothing we can do.
  }
}
