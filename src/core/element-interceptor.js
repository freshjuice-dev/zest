/**
 * Element Interceptor - Catches tracker elements BEFORE the browser fetches them.
 *
 * The script-blocker uses MutationObserver. That fires asynchronously
 * (microtask after the DOM mutation), so by the time we can react the
 * browser has already kicked off the network request for the src/href.
 * The script may not execute (we flip type to text/plain) but the
 * fetch already left the building — and to ConsentTheater / a privacy
 * audit that fetch IS a pre-consent leak.
 *
 * This interceptor patches the prototype setters and Element.setAttribute
 * synchronously, so when code does:
 *
 *   const s = document.createElement('script');
 *   s.src = 'https://tracker.example/track.js';   // ← intercepted HERE
 *   document.head.appendChild(s);                 // ← src is already empty,
 *                                                 //   no fetch ever fired
 *
 * Covers four element types and both ways to set the URL:
 *
 *   - HTMLScriptElement   src
 *   - HTMLLinkElement     href      (stylesheets, prefetch, preload, dns-prefetch)
 *   - HTMLImageElement    src       (tracking pixels)
 *   - HTMLIFrameElement   src       (tracking iframes)
 *
 * Plus the global Image() constructor used by classic pixel trackers.
 *
 * What this does NOT catch: inline HTML <script src=...> / <link href=...>
 * tags parsed from the original HTML response. The browser starts those
 * fetches as soon as it encounters the tag during parsing, BEFORE any
 * JavaScript runs. The only complete fix for that class is server-side
 * CSP or template-time removal.
 */

import { getCategoryForScript, isThirdParty } from './known-trackers.js';

// Upper bound on queued blocked elements. Unbounded growth would be a
// memory-exhaustion vector if a page (or a hostile script) tried to
// flood us with src writes.
const MAX_QUEUE_SIZE = 500;

// Queue of blocked element writes. Each entry remembers enough to
// re-apply the original URL via the ORIGINAL setter once consent
// arrives for its category. Without this queue, blocked scripts /
// stylesheets / images would be lost forever and require a page
// reload to come back.
const elementQueue = [];

let blockingMode = 'safe';
let customBlockedDomains = [];
let installed = false;
let checkConsent = () => false;

// Saved originals for restoration in tests / headless teardown.
const originals = {
  scriptSrc: null,
  linkHref: null,
  imgSrc: null,
  iframeSrc: null,
  setAttribute: null,
  Image: null
};

const BLOCKABLE_CATEGORIES = new Set(['functional', 'analytics', 'marketing']);

// Map of tag name -> attribute name that carries a URL we may want to
// block. Lowercased on both sides; setAttribute() gating uses this.
const URL_ATTRS = {
  script: 'src',
  link: 'href',
  img: 'src',
  iframe: 'src'
};

export function setConsentChecker(fn) {
  checkConsent = fn;
}

export function setBlockingMode(mode) {
  blockingMode = mode;
}

export function setCustomBlockedDomains(domains) {
  customBlockedDomains = Array.isArray(domains) ? domains : [];
}

function matchesCustomDomains(hostname) {
  if (!hostname || customBlockedDomains.length === 0) return null;
  const host = hostname.toLowerCase();
  for (const entry of customBlockedDomains) {
    const domain = (typeof entry === 'string' ? entry : entry?.domain || '').toLowerCase();
    if (!domain) continue;
    const category = typeof entry === 'string'
      ? 'marketing'
      : (BLOCKABLE_CATEGORIES.has(entry?.category) ? entry.category : 'marketing');
    if (host === domain || host.endsWith('.' + domain)) {
      return category;
    }
  }
  return null;
}

function getBlockCategory(url) {
  if (!url) return null;
  let hostname;
  try {
    hostname = new URL(url, location.href).hostname;
  } catch (e) {
    return null;
  }

  const customCategory = matchesCustomDomains(hostname);
  if (customCategory) return customCategory;

  switch (blockingMode) {
    case 'manual':
      return null;
    case 'safe':
    case 'strict':
      return getCategoryForScript(url, blockingMode);
    case 'doomsday':
      if (isThirdParty(url)) {
        return getCategoryForScript(url, 'strict') || 'marketing';
      }
      return null;
    default:
      return null;
  }
}

function shouldBlock(url) {
  const category = getBlockCategory(url);
  if (!category) return null;
  if (checkConsent(category)) return null;
  return category;
}

/**
 * Replace the property setter for `prop` on `ProtoCtor.prototype` with
 * a gated version. Returns the original descriptor so we can restore.
 */
function patchUrlSetter(ProtoCtor, prop) {
  if (typeof ProtoCtor !== 'function' || !ProtoCtor.prototype) return null;
  const proto = ProtoCtor.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc || typeof desc.set !== 'function') return null;

  Object.defineProperty(proto, prop, {
    configurable: true,
    enumerable: desc.enumerable,
    get: desc.get,
    set(value) {
      if (typeof value === 'string') {
        const category = shouldBlock(value);
        if (category) {
          // Don't pass through to the original setter — the URL never
          // touches the element. Stash the element + URL + category
          // + original descriptor in the queue so replayElements()
          // can reinstate it once consent arrives.
          if (elementQueue.length < MAX_QUEUE_SIZE) {
            elementQueue.push({
              element: this,
              setter: desc.set,
              prop,
              value,
              category,
              method: 'property'
            });
          }
          return;
        }
      }
      return desc.set.call(this, value);
    }
  });

  return desc;
}

function patchSetAttribute() {
  if (typeof Element === 'undefined' || !Element.prototype) return null;
  const orig = Element.prototype.setAttribute;
  originals.setAttribute = orig;

  Element.prototype.setAttribute = function patchedSetAttribute(name, value) {
    // Fast path: bail out for anything not on our watchlist before doing
    // any string work. setAttribute is hot — keep this cheap.
    if (typeof name !== 'string' || typeof value !== 'string' || !this || !this.tagName) {
      return orig.call(this, name, value);
    }
    const tag = this.tagName.toLowerCase();
    const watched = URL_ATTRS[tag];
    if (!watched) {
      return orig.call(this, name, value);
    }
    const attr = name.toLowerCase();
    if (attr !== watched) {
      return orig.call(this, name, value);
    }
    const category = shouldBlock(value);
    if (category) {
      // Drop silently and queue for replay. The element keeps any
      // other attributes you set before / after.
      if (elementQueue.length < MAX_QUEUE_SIZE) {
        elementQueue.push({
          element: this,
          setter: orig,            // setAttribute itself, called like orig.call(el, name, value)
          prop: name,
          value,
          category,
          method: 'attribute'
        });
      }
      return;
    }
    return orig.call(this, name, value);
  };

  return orig;
}

function patchImageConstructor() {
  if (typeof window === 'undefined' || typeof window.Image !== 'function') return null;
  const OrigImage = window.Image;
  originals.Image = OrigImage;

  function PatchedImage(width, height) {
    const img = arguments.length >= 2
      ? new OrigImage(width, height)
      : new OrigImage();
    // No work needed here — the .src setter patch on HTMLImageElement
    // will catch any later assignment. PatchedImage exists mainly to
    // expose the .src patch via this path for `new Image()` users.
    return img;
  }
  PatchedImage.prototype = OrigImage.prototype;
  // Copy any static fields just in case.
  for (const key of Object.keys(OrigImage)) {
    try { PatchedImage[key] = OrigImage[key]; } catch (e) { /* ignore */ }
  }

  try {
    Object.defineProperty(window, 'Image', {
      configurable: true,
      writable: true,
      value: PatchedImage
    });
  } catch (e) {
    window.Image = PatchedImage;
  }

  return OrigImage;
}

/**
 * Replay blocked element writes for newly-allowed categories.
 *
 * For each queued entry whose category is in `allowedCategories`:
 *   - If the element is still connected to the DOM, re-apply the
 *     URL via the ORIGINAL setter / setAttribute. The browser starts
 *     the fetch as if nothing had been intercepted.
 *   - If the element has since been removed (no `isConnected`), drop
 *     the entry — calling code lost its reference and we have no
 *     parent to attach to.
 *
 * Queue ordering is preserved so that scripts/stylesheets re-execute
 * in the same order the page originally requested them.
 */
export function replayElements(allowedCategories) {
  if (!Array.isArray(allowedCategories) || elementQueue.length === 0) return;
  const remaining = [];

  for (const item of elementQueue) {
    if (!allowedCategories.includes(item.category)) {
      remaining.push(item);
      continue;
    }

    const el = item.element;
    if (!el || !el.isConnected) {
      // Element is detached or gone — nothing to re-apply against.
      continue;
    }

    try {
      if (item.method === 'attribute') {
        item.setter.call(el, item.prop, item.value);
      } else {
        item.setter.call(el, item.value);
      }
    } catch (e) {
      // Restoration failed (rare — element might be in a weird state).
      // Don't requeue; one failure is enough.
    }
  }

  elementQueue.length = 0;
  elementQueue.push(...remaining);
}

export function getElementQueue() {
  return [...elementQueue];
}

export function clearElementQueue() {
  elementQueue.length = 0;
}

/**
 * Install all element-level interceptors. Idempotent — second call
 * just refreshes mode + customDomains without rewrapping.
 */
export function interceptElements(mode = 'safe', customDomains = []) {
  blockingMode = mode;
  customBlockedDomains = Array.isArray(customDomains) ? customDomains : [];

  if (installed) return true;

  if (typeof HTMLScriptElement !== 'undefined') {
    originals.scriptSrc = patchUrlSetter(HTMLScriptElement, 'src');
  }
  if (typeof HTMLLinkElement !== 'undefined') {
    originals.linkHref = patchUrlSetter(HTMLLinkElement, 'href');
  }
  if (typeof HTMLImageElement !== 'undefined') {
    originals.imgSrc = patchUrlSetter(HTMLImageElement, 'src');
  }
  if (typeof HTMLIFrameElement !== 'undefined') {
    originals.iframeSrc = patchUrlSetter(HTMLIFrameElement, 'src');
  }
  patchSetAttribute();
  patchImageConstructor();

  installed = true;
  return true;
}

/**
 * Restore the original setters / Image constructor. For tests / headless.
 */
export function restoreElements() {
  if (!installed) return;

  const reinstall = (ProtoCtor, prop, desc) => {
    if (!ProtoCtor || !desc) return;
    Object.defineProperty(ProtoCtor.prototype, prop, desc);
  };

  reinstall(typeof HTMLScriptElement !== 'undefined' ? HTMLScriptElement : null, 'src', originals.scriptSrc);
  reinstall(typeof HTMLLinkElement !== 'undefined' ? HTMLLinkElement : null, 'href', originals.linkHref);
  reinstall(typeof HTMLImageElement !== 'undefined' ? HTMLImageElement : null, 'src', originals.imgSrc);
  reinstall(typeof HTMLIFrameElement !== 'undefined' ? HTMLIFrameElement : null, 'src', originals.iframeSrc);

  if (originals.setAttribute && typeof Element !== 'undefined') {
    Element.prototype.setAttribute = originals.setAttribute;
  }
  if (originals.Image && typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'Image', {
        configurable: true,
        writable: true,
        value: originals.Image
      });
    } catch (e) {
      window.Image = originals.Image;
    }
  }

  installed = false;
}

export function isInstalled() {
  return installed;
}
