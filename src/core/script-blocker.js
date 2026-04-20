/**
 * Script Blocker - Blocks and manages consent-gated scripts
 *
 * Modes:
 * - manual: Only blocks scripts with data-consent-category attribute
 * - safe: Manual + known major trackers (Google, Facebook, etc.)
 * - strict: Safe + extended tracker list (Hotjar, Mixpanel, etc.)
 * - doomsday: Block ALL third-party scripts
 */

import { getCategoryForScript, isThirdParty } from './known-trackers.js';

// Categories the author has declared blockable. A script can self-label
// into one of these, but not into 'essential' (a common bypass).
const BLOCKABLE_CATEGORIES = new Set(['functional', 'analytics', 'marketing']);

// Upper bound on queued scripts awaiting consent replay — prevents a
// hostile page from flooding the queue with <script> nodes.
const MAX_QUEUE_SIZE = 500;

// Queue for blocked scripts — the authoritative source for replay,
// snapshotting src/inline BEFORE any DOM mutation so later tampering
// cannot hijack what gets executed.
const scriptQueue = [];

// MutationObserver instance
let observer = null;

// Current blocking mode
let blockingMode = 'safe';

// Custom blocked domains (user-defined)
let customBlockedDomains = [];

// Reference to consent checker function
let checkConsent = () => false;

/**
 * Set the consent checker function
 */
export function setConsentChecker(fn) {
  checkConsent = fn;
}

/**
 * Set blocking mode
 */
export function setBlockingMode(mode) {
  blockingMode = mode;
}

/**
 * Set custom blocked domains
 */
export function setCustomBlockedDomains(domains) {
  customBlockedDomains = domains || [];
}

/**
 * Get queued scripts
 */
export function getScriptQueue() {
  return [...scriptQueue];
}

/**
 * Clear the script queue
 */
export function clearScriptQueue() {
  scriptQueue.length = 0;
}

/**
 * Check if script URL matches custom blocked domains
 */
function matchesCustomDomains(url) {
  if (!url || customBlockedDomains.length === 0) return null;

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    for (const entry of customBlockedDomains) {
      const domain = typeof entry === 'string' ? entry : entry.domain;
      const category = typeof entry === 'string' ? 'marketing' : (entry.category || 'marketing');

      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return category;
      }
    }
  } catch (e) {
    // Invalid URL
  }

  return null;
}

/**
 * Determine if a script should be blocked and get its category.
 *
 * A self-applied 'essential' label is ignored — only explicit blockable
 * categories are accepted. That prevents a third-party script from
 * stamping itself with data-consent-category="essential" to slip past
 * mode-based blocking.
 */
function getScriptBlockCategory(script) {
  // Skip if script has data-zest-allow attribute (opt-out)
  if (script.hasAttribute('data-zest-allow')) {
    return null;
  }

  // 1. Check for explicit data-consent-category attribute.
  // Only honor values from the blockable set; 'essential' and unknown
  // values fall through to the other checks.
  const explicitCategory = script.getAttribute('data-consent-category');
  const explicitBlockable = explicitCategory && BLOCKABLE_CATEGORIES.has(explicitCategory)
    ? explicitCategory
    : null;

  const src = script.src;

  // No src = inline script, only block if explicitly tagged (blockable only)
  if (!src) {
    return explicitBlockable;
  }

  // 2. Check custom blocked domains
  const customCategory = matchesCustomDomains(src);

  // 3. Mode-based blocking
  let modeCategory = null;
  switch (blockingMode) {
    case 'manual':
      break;

    case 'safe':
    case 'strict':
      modeCategory = getCategoryForScript(src, blockingMode);
      break;

    case 'doomsday':
      if (isThirdParty(src)) {
        modeCategory = getCategoryForScript(src, 'strict') || 'marketing';
      }
      break;

    default:
      break;
  }

  // Use the strictest category among explicit/custom/mode decisions.
  // We collect all categories the script matches and pick the first
  // that appears in the blockable set (any match wins — but we prefer
  // the mode-assigned one since it's authoritative for third-party
  // trackers that try to self-label as 'functional').
  return modeCategory || customCategory || explicitBlockable;
}

/**
 * Block a script element
 */
function blockScript(script) {
  // Skip already processed scripts
  if (script.hasAttribute('data-zest-processed')) {
    return false;
  }

  const category = getScriptBlockCategory(script);

  if (!category) {
    script.setAttribute('data-zest-processed', 'allowed');
    return false;
  }

  if (checkConsent(category)) {
    // Consent already given - allow script
    script.setAttribute('data-zest-processed', 'allowed');
    return false;
  }

  // Store script info for later execution. Snapshot the src/text BEFORE
  // mutating the DOM — this snapshot is the authoritative replay source
  // so later DOM tampering cannot hijack the replayed script URL.
  const scriptInfo = {
    category,
    src: script.src || '',
    inline: script.textContent,
    type: script.type,
    async: script.async,
    defer: script.defer,
    element: script,
    timestamp: Date.now()
  };

  // Mark as processed
  script.setAttribute('data-zest-processed', 'blocked');
  script.setAttribute('data-consent-category', category);

  // Disable the script
  script.type = 'text/plain';

  // Remove src to prevent loading. We no longer stash it on the element
  // (data-blocked-src was a tampering vector); scriptQueue is the single
  // source of truth for replay.
  if (script.src) {
    script.removeAttribute('src');
  }

  if (scriptQueue.length < MAX_QUEUE_SIZE) {
    scriptQueue.push(scriptInfo);
  }
  return true;
}

/**
 * Replay queued scripts for allowed categories.
 *
 * scriptQueue is the single source of truth for src and inline body —
 * we never re-read data-* attributes from the DOM (which an attacker
 * could have rewritten in the intervening time).
 */
export function replayScripts(allowedCategories) {
  const remaining = [];

  for (const scriptInfo of scriptQueue) {
    if (!allowedCategories.includes(scriptInfo.category)) {
      remaining.push(scriptInfo);
      continue;
    }

    const newScript = document.createElement('script');
    if (scriptInfo.src) {
      newScript.src = scriptInfo.src;
    } else if (scriptInfo.inline) {
      newScript.textContent = scriptInfo.inline;
    }
    if (scriptInfo.async) newScript.async = true;
    if (scriptInfo.defer) newScript.defer = true;
    if (scriptInfo.type && scriptInfo.type !== 'text/plain') {
      newScript.type = scriptInfo.type;
    }
    newScript.setAttribute('data-zest-processed', 'executed');
    newScript.setAttribute('data-consent-executed', 'true');

    // If the original element is still in the DOM, replace it in place
    // so execution order is preserved. Otherwise append to <head>.
    const original = scriptInfo.element;
    if (original && original.isConnected && original.parentNode) {
      original.parentNode.replaceChild(newScript, original);
    } else {
      document.head.appendChild(newScript);
    }
  }

  scriptQueue.length = 0;
  scriptQueue.push(...remaining);
}

/**
 * Process existing scripts in the DOM
 */
function processExistingScripts() {
  const scripts = document.querySelectorAll('script:not([data-zest-processed])');
  scripts.forEach(blockScript);
}

/**
 * Handle mutations (new scripts added to DOM)
 */
function handleMutations(mutations) {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeName === 'SCRIPT' && !node.hasAttribute('data-zest-processed')) {
        blockScript(node);
      }

      // Check child scripts
      if (node.querySelectorAll) {
        const scripts = node.querySelectorAll('script:not([data-zest-processed])');
        scripts.forEach(blockScript);
      }
    }
  }
}

/**
 * Start observing for new scripts
 */
export function startScriptBlocking(mode = 'safe', customDomains = []) {
  blockingMode = mode;
  customBlockedDomains = customDomains;

  // Process existing scripts
  processExistingScripts();

  // Watch for new scripts
  observer = new MutationObserver(handleMutations);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  return true;
}

/**
 * Stop observing for new scripts
 */
export function stopScriptBlocking() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
