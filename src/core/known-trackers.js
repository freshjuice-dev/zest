/**
 * Known Trackers - Lists of known tracking script domains by category
 */

/**
 * Safe mode - Major, well-known trackers only
 */
export const SAFE_TRACKERS = {
  analytics: [
    'google-analytics.com',
    'www.google-analytics.com',
    'analytics.google.com',
    'googletagmanager.com',
    'www.googletagmanager.com',
    'plausible.io',
    'cloudflareinsights.com',
    'static.cloudflareinsights.com'
  ],
  marketing: [
    'connect.facebook.net',
    'www.facebook.com/tr',
    'ads.google.com',
    'www.googleadservices.com',
    'googleads.g.doubleclick.net',
    'pagead2.googlesyndication.com'
  ]
};

/**
 * Strict mode - Extended list including less common trackers
 */
export const STRICT_TRACKERS = {
  analytics: [
    ...SAFE_TRACKERS.analytics,
    'analytics.tiktok.com',
    'matomo.', // partial match
    'hotjar.com',
    'static.hotjar.com',
    'script.hotjar.com',
    'clarity.ms',
    'www.clarity.ms',
    'heapanalytics.com',
    'cdn.heapanalytics.com',
    'mixpanel.com',
    'cdn.mxpnl.com',
    'segment.com',
    'cdn.segment.com',
    'api.segment.io',
    'fullstory.com',
    'rs.fullstory.com',
    'amplitude.com',
    'cdn.amplitude.com',
    'mouseflow.com',
    'cdn.mouseflow.com',
    'luckyorange.com',
    'cdn.luckyorange.net',
    'crazyegg.com',
    'script.crazyegg.com'
  ],
  marketing: [
    ...SAFE_TRACKERS.marketing,
    'snap.licdn.com',
    'px.ads.linkedin.com',
    'ads.linkedin.com',
    'analytics.twitter.com',
    'static.ads-twitter.com',
    't.co',
    'analytics.tiktok.com',
    'ads.tiktok.com',
    'sc-static.net', // Snapchat
    'tr.snapchat.com',
    'ct.pinterest.com',
    'pintrk.com',
    's.pinimg.com',
    'widgets.pinterest.com',
    'bat.bing.com',
    'ads.yahoo.com',
    'sp.analytics.yahoo.com',
    'amazon-adsystem.com',
    'z-na.amazon-adsystem.com',
    'criteo.com',
    'static.criteo.net',
    'dis.criteo.com',
    'taboola.com',
    'cdn.taboola.com',
    'trc.taboola.com',
    'outbrain.com',
    'widgets.outbrain.com',
    'adroll.com',
    's.adroll.com'
  ],
  functional: [
    'cdn.onesignal.com',
    'onesignal.com',
    'pusher.com',
    'js.pusher.com',
    'intercom.io',
    'widget.intercom.io',
    'js.intercomcdn.com',
    'crisp.chat',
    'client.crisp.chat',
    'cdn.livechatinc.com',
    'livechatinc.com',
    'tawk.to',
    'embed.tawk.to',
    'zendesk.com',
    'static.zdassets.com'
  ]
};

/**
 * Check if a URL matches any tracker in the list.
 *
 * Matching is restricted to hostname (and, when the list entry contains
 * a path, the URL path prefix). A naive `fullUrl.includes(domain)` was
 * previously used, which would false-positive on e.g.
 *   https://mysite.com/page?ref=google-analytics.com
 */
export function matchesTrackerList(url, trackerList) {
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    return false;
  }
  const hostname = urlObj.hostname.toLowerCase();
  const path = urlObj.pathname.toLowerCase();

  for (const rawEntry of trackerList) {
    if (typeof rawEntry !== 'string') continue;
    const entry = rawEntry.toLowerCase();

    // Partial-prefix match on hostname (entry ends with a dot),
    // e.g. "matomo." matches "analytics.matomo.cloud"
    if (entry.endsWith('.')) {
      const needle = entry.slice(0, -1);
      const segments = hostname.split('.');
      if (segments.some(seg => seg === needle) || hostname.startsWith(entry)) {
        return true;
      }
      continue;
    }

    // Entries containing a slash specify hostname + path prefix
    const slashIdx = entry.indexOf('/');
    if (slashIdx !== -1) {
      const entryHost = entry.slice(0, slashIdx);
      const entryPath = entry.slice(slashIdx);
      if ((hostname === entryHost || hostname.endsWith('.' + entryHost)) &&
          path.startsWith(entryPath)) {
        return true;
      }
      continue;
    }

    // Plain hostname: exact or subdomain match only
    if (hostname === entry || hostname.endsWith('.' + entry)) {
      return true;
    }
  }

  return false;
}

/**
 * Get category for a script URL based on tracker lists
 */
export function getCategoryForScript(url, mode = 'safe') {
  const trackers = mode === 'strict' ? STRICT_TRACKERS : SAFE_TRACKERS;

  for (const [category, domains] of Object.entries(trackers)) {
    if (matchesTrackerList(url, domains)) {
      return category;
    }
  }

  return null;
}

/**
 * Check if URL is third-party (different domain)
 */
export function isThirdParty(url) {
  try {
    const scriptHost = new URL(url).hostname;
    const pageHost = window.location.hostname;

    // Remove www. for comparison
    const normalizeHost = (h) => h.replace(/^www\./, '');

    return normalizeHost(scriptHost) !== normalizeHost(pageHost);
  } catch (e) {
    return false;
  }
}
