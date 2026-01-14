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

// Queue for blocked scripts
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
 * Determine if a script should be blocked and get its category
 */
function getScriptBlockCategory(script) {
  // 1. Check for explicit data-consent-category attribute (always respected)
  const explicitCategory = script.getAttribute('data-consent-category');
  if (explicitCategory) {
    return explicitCategory;
  }

  // 2. Skip if script has data-zest-allow attribute
  if (script.hasAttribute('data-zest-allow')) {
    return null;
  }

  const src = script.src;

  // No src = inline script, only block if explicitly tagged
  if (!src) {
    return null;
  }

  // 3. Check custom blocked domains
  const customCategory = matchesCustomDomains(src);
  if (customCategory) {
    return customCategory;
  }

  // 4. Mode-based blocking
  switch (blockingMode) {
    case 'manual':
      // Only explicit tags, already checked above
      return null;

    case 'safe':
    case 'strict':
      // Check against known tracker lists
      return getCategoryForScript(src, blockingMode);

    case 'doomsday':
      // Block all third-party scripts
      if (isThirdParty(src)) {
        // Try to categorize, default to marketing
        return getCategoryForScript(src, 'strict') || 'marketing';
      }
      return null;

    default:
      return null;
  }
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

  // Store script info for later execution
  const scriptInfo = {
    category,
    src: script.src,
    inline: script.textContent,
    type: script.type,
    async: script.async,
    defer: script.defer,
    timestamp: Date.now()
  };

  // Mark as processed
  script.setAttribute('data-zest-processed', 'blocked');
  script.setAttribute('data-consent-category', category);

  // Disable the script
  script.type = 'text/plain';

  // If it has a src, also remove it to prevent loading
  if (script.src) {
    script.setAttribute('data-blocked-src', script.src);
    script.removeAttribute('src');
  }

  scriptQueue.push(scriptInfo);
  return true;
}

/**
 * Execute a queued script
 */
function executeScript(scriptInfo) {
  const script = document.createElement('script');

  if (scriptInfo.src) {
    script.src = scriptInfo.src;
  } else if (scriptInfo.inline) {
    script.textContent = scriptInfo.inline;
  }

  if (scriptInfo.async) script.async = true;
  if (scriptInfo.defer) script.defer = true;

  script.setAttribute('data-zest-processed', 'executed');
  script.setAttribute('data-consent-executed', 'true');

  document.head.appendChild(script);
}

/**
 * Replay queued scripts for allowed categories
 */
export function replayScripts(allowedCategories) {
  const remaining = [];

  for (const scriptInfo of scriptQueue) {
    if (allowedCategories.includes(scriptInfo.category)) {
      executeScript(scriptInfo);
    } else {
      remaining.push(scriptInfo);
    }
  }

  scriptQueue.length = 0;
  scriptQueue.push(...remaining);

  // Also re-enable any blocked scripts in the DOM
  const blockedScripts = document.querySelectorAll('script[data-zest-processed="blocked"]');
  blockedScripts.forEach(script => {
    const category = script.getAttribute('data-consent-category');
    if (allowedCategories.includes(category)) {
      // Clone and replace to execute
      const newScript = document.createElement('script');

      const blockedSrc = script.getAttribute('data-blocked-src');
      if (blockedSrc) {
        newScript.src = blockedSrc;
      } else {
        newScript.textContent = script.textContent;
      }

      if (script.async) newScript.async = true;
      if (script.defer) newScript.defer = true;

      newScript.setAttribute('data-zest-processed', 'executed');
      newScript.setAttribute('data-consent-executed', 'true');
      script.parentNode?.replaceChild(newScript, script);
    }
  });
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
