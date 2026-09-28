/**
 * Embed Blocker - consent gating for third-party <iframe> embeds.
 *
 * Static iframes start fetching the moment the parser reaches their tag,
 * before any script can react — the same ceiling the script-blocker has
 * with static <script src> tags. Zest swaps the src to about:blank as
 * soon as it scans (no cookies, no tracking code runs), but for a hard
 * zero-request guarantee authors should emit embeds without a src:
 *
 *   <iframe data-consent-src="https://www.youtube.com/embed/ID"
 *           data-consent-category="marketing" ...></iframe>
 *
 * On activation the stored URL is optionally rewritten to its privacy
 * variant (youtube-nocookie.com host swap, Vimeo dnt=1). Embeds always
 * follow the saved consent state: granting a category activates its
 * embeds, revoking re-blocks them.
 */

import { getCategoryForScript, isThirdParty, isAllowedDomain, matchesTrackerList } from './known-trackers.js';
import { writeElementUrl, setBlockedEmbedWriteHandler } from './element-interceptor.js';
import { emitEmbed } from '../storage/events.js';

// Categories an embed can be gated under (essential is not blockable).
const BLOCKABLE_CATEGORIES = new Set(['functional', 'analytics', 'marketing']);

// Known third-party embed hosts, gated in safe/strict modes. Host entries
// match subdomains; entries with a slash match a host + path prefix.
const EMBED_PROVIDERS = [
  'youtube.com',
  'youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'dailymotion.com',
  'open.spotify.com',
  'soundcloud.com',
  'w.soundcloud.com',
  'facebook.com/plugins',
  'platform.twitter.com',
  'player.twitch.tv',
  'vk.com/video_ext.php',
  'rutube.ru',
  'dzen.ru'
];

const MAX_QUEUE_SIZE = 500;

const embedQueue = [];

let blockingMode = 'safe';
let customBlockedDomains = [];
let customAllowedDomains = [];
let privacyRewriteEnabled = true;
let installed = false;
let observer = null;
let checkConsent = () => false;
let renderOverlay = null;

export function setConsentChecker(fn) {
  checkConsent = fn;
}

/** Register the overlay renderer (full build only; headless stays blank). */
export function setEmbedRenderer(fn) {
  renderOverlay = typeof fn === 'function' ? fn : null;
}

export function getEmbedQueue() {
  return [...embedQueue];
}

export function clearEmbedQueue() {
  embedQueue.length = 0;
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

/** Category decision for an embed URL — mirrors the script-blocker order:
 * custom blocked domains, then mode lists (embed providers + tracker lists). */
function getEmbedCategory(url) {
  if (!url || isAllowedDomain(url, customAllowedDomains)) return null;
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
      if (matchesTrackerList(url, EMBED_PROVIDERS)) return 'marketing';
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

/**
 * Rewrite an embed URL to its privacy variant at activation time:
 * youtube.com/embed -> youtube-nocookie.com (official privacy-enhanced
 * mode; YouTube has no dnt param), Vimeo players get dnt=1.
 */
export function privacyRewriteUrl(url) {
  if (!url) return url;
  let u;
  try {
    u = new URL(url, location.href);
  } catch (e) {
    return url;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' && u.pathname.startsWith('/embed')) {
    u.hostname = 'www.youtube-nocookie.com';
    return u.href;
  }
  if (host === 'vimeo.com') {
    const m = u.pathname.match(/^\/(\d+)\/?$/);
    if (!m) return url;
    u.hostname = 'player.vimeo.com';
    u.pathname = '/video/' + m[1];
  } else if (host !== 'player.vimeo.com') {
    return url;
  }
  if (!u.searchParams.has('dnt')) {
    u.searchParams.set('dnt', '1');
  }
  return u.href;
}

/** Gate one iframe. Returns true when it was queued for consent gating. */
export function gateEmbed(iframe, changedAttribute, pendingUrl) {
  if (!iframe || typeof iframe.getAttribute !== 'function') return false;
  if (iframe.getAttribute('data-zest-embed') === 'blocked') {
    const src = iframe.getAttribute('src');
    if (changedAttribute === 'data-consent-src') {
      updateBlockedEmbed(iframe, iframe.getAttribute('data-consent-src'));
    } else if (src && !/^about:/i.test(src)) {
      updateBlockedEmbed(iframe, src);
      writeElementUrl(iframe, 'src', 'about:blank');
    }
    const entry = embedQueue.find((item) => item.element === iframe);
    if (entry && !entry.hideOverlay && renderOverlay && iframe.isConnected) {
      try {
        entry.hideOverlay = renderOverlay(entry, () => activateEmbedEntry(entry));
      } catch (_) { /* ignored */ }
    }
    return false;
  }
  if (iframe.hasAttribute('data-zest-embed')) return false;

  // Same opt-out as scripts, plus srcdoc embeds (inline content, no URL to gate).
  if (iframe.hasAttribute('data-zest-allow') || iframe.hasAttribute('srcdoc')) {
    iframe.setAttribute('data-zest-embed', 'allowed');
    return false;
  }

  const src = iframe.getAttribute('src');
  const dataSrc = iframe.getAttribute('data-consent-src');
  let url = pendingUrl && !/^about:/i.test(pendingUrl) ? pendingUrl : null;
  if (!url && src && !/^about:/i.test(src)) url = src;
  if (!url && dataSrc) url = dataSrc;
  if (!url) {
    // No URL yet — leave unstamped so the attribute observer re-evaluates
    // when src / data-consent-src arrives (framework hydration, lazy-load).
    return false;
  }

  if (isAllowedDomain(url, customAllowedDomains)) {
    iframe.setAttribute('data-zest-embed', 'allowed');
    return false;
  }

  // Explicit tagging wins (blockable categories only — a third party can't
  // self-label as essential). Authored data-consent-src with no resolvable
  // category defaults to marketing: it was written to be gated, fail closed.
  const explicit = iframe.getAttribute('data-consent-category');
  let category = explicit && BLOCKABLE_CATEGORIES.has(explicit) ? explicit : null;
  if (!category) category = getEmbedCategory(url);
  if (!category && dataSrc) category = 'marketing';
  if (!category) {
    iframe.setAttribute('data-zest-embed', 'allowed');
    return false;
  }

  if (embedQueue.length >= MAX_QUEUE_SIZE) return false;

  const entry = { element: iframe, url, category, blocked: false, hideOverlay: null };
  embedQueue.push(entry);

  if (!checkConsent(category)) {
    blockEmbedEntry(entry);
  } else {
    iframe.setAttribute('data-zest-embed', 'active');
    if (url === dataSrc || pendingUrl) {
      // data-consent-src authoring: the URL never touched the DOM, and a
      // visitor who already consented gets no later syncEmbeds for this
      // element — write it now (privacy rewrite applies, same as unblock).
      writeElementUrl(iframe, 'src', privacyRewriteEnabled ? privacyRewriteUrl(url) : url);
    }
  }
  return true;
}

function updateBlockedEmbed(iframe, url) {
  const entry = embedQueue.find((item) => item.element === iframe && item.blocked);
  if (!entry || !url || /^about:/i.test(url)) return false;
  entry.url = url;
  return true;
}

function blockEmbedEntry(entry) {
  entry.blocked = true;
  const el = entry.element;
  // Stamp FIRST — the attribute observer watches src writes; without the
  // stamp already in place, our own about:blank swap would re-enter gateEmbed.
  el.setAttribute('data-zest-embed', 'blocked');
  if (el.getAttribute('src')) {
    writeElementUrl(el, 'src', 'about:blank');
  }
  try {
    el.setAttribute('tabindex', '-1');
  } catch (e) {
    /* non-standard element — ignore */
  }
  if (renderOverlay) {
    try {
      entry.hideOverlay = renderOverlay(entry, () => activateEmbedEntry(entry));
    } catch (e) {
      entry.hideOverlay = null;
    }
  }
  emitEmbed('blocked', { element: el, category: entry.category, url: entry.url });
}

function activateEmbedEntry(entry) {
  if (!entry.blocked) return;
  const el = entry.element;
  const target = privacyRewriteEnabled ? privacyRewriteUrl(entry.url) : entry.url;
  el.setAttribute('data-zest-embed', 'active');
  writeElementUrl(el, 'src', target);
  try {
    el.removeAttribute('tabindex');
  } catch (e) {
    /* non-standard element — ignore */
  }
  entry.blocked = false;
  if (typeof entry.hideOverlay === 'function') {
    try {
      entry.hideOverlay();
    } catch (e) {
      /* overlay already gone — ignore */
    }
    entry.hideOverlay = null;
  }
  emitEmbed('activated', { element: el, category: entry.category, url: target });
}

/**
 * Bring every gated embed in line with `consentState`: allowed categories
 * activate, revoked categories re-block (a "Load content" click is a
 * one-time exception until the next consent write).
 */
export function syncEmbeds(consentState) {
  if (!consentState || typeof consentState !== 'object') return;
  const remaining = [];
  for (const entry of embedQueue) {
    const el = entry.element;
    if (!el || el.isConnected === false) continue;
    remaining.push(entry);
    if (consentState[entry.category] === true) {
      activateEmbedEntry(entry);
    } else if (entry.blocked === false) {
      blockEmbedEntry(entry);
    } else if (typeof entry.hideOverlay !== 'function' && renderOverlay) {
      // Blocked before the renderer was registered (initial scan runs
      // inside coreInit, the UI registers the overlay afterwards).
      try {
        entry.hideOverlay = renderOverlay(entry, () => activateEmbedEntry(entry));
      } catch (e) {
        entry.hideOverlay = null;
      }
    }
  }
  embedQueue.length = 0;
  embedQueue.push(...remaining);
}

/** Activate one gated iframe (the overlay's "Load content" button, or a
 * headless consumer's own UI). No consent is recorded. */
export function activateEmbed(element) {
  const entry = embedQueue.find((e) => e.element === element);
  if (!entry) {
    try {
      console.warn('[Zest] activateEmbed: iframe is not a gated embed');
    } catch (e) {
      /* no-op */
    }
    return false;
  }
  activateEmbedEntry(entry);
  return true;
}

function scanEmbeds() {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    gateEmbed(iframe);
  }
}

/**
 * Install embed gating: scan the current DOM, then watch for late-injected
 * iframes (CMS lazy embeds, innerHTML). Idempotent — a second call only
 * refreshes mode/domains and rescans.
 */
export function startEmbedBlocking(mode = 'safe', customDomains = [], allowedDomains = [], privacyRewriteOn = true) {
  blockingMode = mode;
  customBlockedDomains = Array.isArray(customDomains) ? customDomains : [];
  customAllowedDomains = Array.isArray(allowedDomains) ? allowedDomains : [];
  privacyRewriteEnabled = privacyRewriteOn !== false;

  setBlockedEmbedWriteHandler((iframe, url) => {
    if (iframe.getAttribute('data-zest-embed') === 'blocked') return updateBlockedEmbed(iframe, url);
    if (iframe.getAttribute('data-zest-embed') === 'allowed') iframe.removeAttribute('data-zest-embed');
    return gateEmbed(iframe, null, url);
  });
  scanEmbeds();

  if (installed) return true;

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      // Attribute path: src / data-consent-src arriving after insertion
      // (framework hydration, carousel lazy-load). The data-zest-embed
      // guard inside gateEmbed keeps our own about:blank swaps loop-free.
      if (m.type === 'attributes') {
        if (m.target?.tagName === 'IFRAME') {
          // A previous 'allowed' verdict (same-origin placeholder src) must
          // not survive a later src swap — clear it so gateEmbed re-decides.
          // Zest's own writes happen while stamped blocked/active, never
          // allowed, so this stays loop-free.
          if (m.target.getAttribute('data-zest-embed') === 'allowed') {
            m.target.removeAttribute('data-zest-embed');
          }
          gateEmbed(m.target, m.attributeName);
        }
        continue;
      }
      for (const node of m.addedNodes) {
        if (!node || node.nodeType !== 1) continue;
        if (node.tagName === 'IFRAME') {
          gateEmbed(node);
        } else if (typeof node.querySelectorAll === 'function') {
          for (const iframe of node.querySelectorAll('iframe')) {
            gateEmbed(iframe);
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-consent-src']
  });
  installed = true;
  return true;
}

/** Tear down (tests / headless teardown). */
export function restoreEmbedBlocking() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  installed = false;
  setBlockedEmbedWriteHandler(null);
  embedQueue.length = 0;
  renderOverlay = null;
}