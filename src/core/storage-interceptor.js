/**
 * Storage Interceptor - Intercepts localStorage and sessionStorage operations
 */

import { getCategoryForName } from './pattern-matcher.js';

// Store originals
let originalLocalStorage = null;
let originalSessionStorage = null;

// Queues for blocked operations
const localStorageQueue = [];
const sessionStorageQueue = [];

// Reference to consent checker function
let checkConsent = () => false;

/**
 * Set the consent checker function
 */
export function setConsentChecker(fn) {
  checkConsent = fn;
}

/**
 * Get original localStorage
 */
export function getOriginalLocalStorage() {
  return originalLocalStorage;
}

/**
 * Get original sessionStorage
 */
export function getOriginalSessionStorage() {
  return originalSessionStorage;
}

/**
 * Get queued localStorage operations
 */
export function getLocalStorageQueue() {
  return [...localStorageQueue];
}

/**
 * Get queued sessionStorage operations
 */
export function getSessionStorageQueue() {
  return [...sessionStorageQueue];
}

/**
 * Clear storage queues
 */
export function clearStorageQueues() {
  localStorageQueue.length = 0;
  sessionStorageQueue.length = 0;
}

/**
 * Create a proxy for storage API
 */
function createStorageProxy(storage, queue, storageName) {
  return new Proxy(storage, {
    get(target, prop) {
      if (prop === 'setItem') {
        return (key, value) => {
          const category = getCategoryForName(key);

          if (checkConsent(category)) {
            target.setItem(key, value);
          } else {
            queue.push({
              key,
              value,
              category,
              timestamp: Date.now()
            });
          }
        };
      }

      // Allow all other operations
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

/**
 * Replay queued storage operations for allowed categories
 */
export function replayStorage(allowedCategories) {
  // Replay localStorage
  const remainingLocal = [];
  for (const item of localStorageQueue) {
    if (allowedCategories.includes(item.category)) {
      originalLocalStorage?.setItem(item.key, item.value);
    } else {
      remainingLocal.push(item);
    }
  }
  localStorageQueue.length = 0;
  localStorageQueue.push(...remainingLocal);

  // Replay sessionStorage
  const remainingSession = [];
  for (const item of sessionStorageQueue) {
    if (allowedCategories.includes(item.category)) {
      originalSessionStorage?.setItem(item.key, item.value);
    } else {
      remainingSession.push(item);
    }
  }
  sessionStorageQueue.length = 0;
  sessionStorageQueue.push(...remainingSession);
}

/**
 * Start intercepting storage APIs
 */
export function interceptStorage() {
  try {
    originalLocalStorage = window.localStorage;
    originalSessionStorage = window.sessionStorage;

    Object.defineProperty(window, 'localStorage', {
      value: createStorageProxy(originalLocalStorage, localStorageQueue, 'localStorage'),
      configurable: true,
      writable: false
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: createStorageProxy(originalSessionStorage, sessionStorageQueue, 'sessionStorage'),
      configurable: true,
      writable: false
    });

    return true;
  } catch (e) {
    console.warn('[Zest] Could not intercept storage APIs:', e);
    return false;
  }
}

/**
 * Restore original storage APIs
 */
export function restoreStorage() {
  try {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: false
      });
    }
    if (originalSessionStorage) {
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
        writable: false
      });
    }
  } catch (e) {
    console.warn('[Zest] Could not restore storage APIs:', e);
  }
}
