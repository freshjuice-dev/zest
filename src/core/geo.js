/**
 * Geo / jurisdiction resolution.
 *
 * Optional, opt-in layer that decides — based on the visitor's location —
 * WHICH consent experience to present:
 *
 *   • GDPR / EEA / UK   -> 'consent'  (opt-in: stay blocked, show full banner)
 *   • US privacy states -> 'notice'   (opt-out: allow tracking, show a small
 *                                       "Do Not Sell My Data" link)
 *   • everywhere else   -> 'allow'    (no banner, release the queues)
 *
 * The jurisdiction verdict comes from one of two sources, both of which MUST
 * return the same shape (the `/privacy` response of the zest-geo gateway):
 *
 *   { isEU, isEEA, isGDPR, isCCPA, isUSPrivacy, regulations: string[] }
 *
 *   1. The hosted gateway (https://geo.cookiezest.com/privacy) or a
 *      self-hosted zest-geo deployment via `geo.endpoint`.
 *   2. A consumer-supplied `geo.resolver()` (sync or async) — e.g. reading a
 *      CDN header their edge already sets (CF-IPCountry, x-vercel-ip-country).
 *
 * SECURITY: the verdict is untrusted (it crosses the network or comes from
 * consumer code), so every field is coerced through `sanitizeVerdict()` before
 * any decision is made. `decide()` output is constrained to a fixed action
 * vocabulary via `normalizeAction()`.
 */

import { safeInvoke } from './security.js';

/** Default hosted gateway. `/privacy` carries no IP / city / coordinates. */
export const GEO_GATEWAY_URL = 'https://geo.cookiezest.com/privacy';

/** The only actions a geo decision may resolve to. */
export const GEO_ACTIONS = Object.freeze(['consent', 'notice', 'allow', 'block']);

/**
 * Coerce an untrusted verdict (network JSON or consumer-returned object) into
 * a known-shape object with only the fields we trust. Every key is hard-coded,
 * so there is no path for prototype pollution or unexpected props to survive.
 *
 * @param {*} raw
 * @returns {{
 *   isEU: boolean, isEEA: boolean, isGDPR: boolean,
 *   isCCPA: boolean, isUSPrivacy: boolean, regulations: string[],
 *   country?: string, regionCode?: string, continent?: string
 * } | null}
 */
export function sanitizeVerdict(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const verdict = {
    isEU: raw.isEU === true,
    isEEA: raw.isEEA === true,
    isGDPR: raw.isGDPR === true,
    isCCPA: raw.isCCPA === true,
    isUSPrivacy: raw.isUSPrivacy === true,
    regulations: []
  };

  if (Array.isArray(raw.regulations)) {
    for (const reg of raw.regulations) {
      if (typeof reg === 'string' && reg.length > 0 && reg.length <= 40) {
        verdict.regulations.push(reg);
      }
      if (verdict.regulations.length >= 20) break;
    }
  }

  // Optional short context fields, handy for custom decide()/copy. Keys are a
  // fixed allowlist; values capped so a hostile endpoint can't bloat memory.
  for (const key of ['country', 'regionCode', 'continent']) {
    const val = raw[key];
    if (typeof val === 'string' && val.length > 0 && val.length <= 8) {
      verdict[key] = val;
    }
  }

  return verdict;
}

/**
 * Constrain a decide() return value to the action vocabulary.
 * Anything unrecognised falls back to the configured fallback (default
 * 'consent' — the safe, fail-closed choice).
 */
export function normalizeAction(value, fallback = 'consent') {
  return GEO_ACTIONS.includes(value)
    ? value
    : (GEO_ACTIONS.includes(fallback) ? fallback : 'consent');
}

/**
 * Default verdict -> action mapping. Mirrors the legal model:
 *   GDPR/EEA/UK -> opt-IN banner, US comprehensive-privacy -> opt-OUT notice,
 *   everywhere else -> allow. Consumers override via `geo.decide`.
 */
export function defaultDecide(verdict) {
  if (verdict.isGDPR) return 'consent';
  if (verdict.isUSPrivacy) return 'notice';
  return 'allow';
}

/**
 * Fetch a jurisdiction verdict from the configured source. Resolves to a
 * sanitized verdict, or null when the source is unavailable / malformed.
 * Never throws — callers apply the fallback action on a null result.
 *
 * @param {object} geo  validated geo config block
 */
export async function fetchVerdict(geo) {
  // Consumer-supplied resolver wins over any endpoint.
  if (typeof geo.resolver === 'function') {
    try {
      const raw = await geo.resolver();
      return sanitizeVerdict(raw);
    } catch (_) {
      return null;
    }
  }

  const url = geo.endpoint || (geo.provider === 'gateway' ? GEO_GATEWAY_URL : null);
  if (!url || typeof fetch !== 'function') return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), geo.timeout || 1500)
    : null;

  try {
    const res = await fetch(url, {
      method: 'GET',
      // Pre-consent request: send nothing identifying we don't have to.
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
      signal: controller ? controller.signal : undefined
    });
    if (!res || !res.ok) return null;
    const raw = await res.json();
    return sanitizeVerdict(raw);
  } catch (_) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Resolve the geo verdict and compute the action to take.
 * Always resolves (never rejects) to `{ action, verdict }`; on any failure or
 * timeout the action is the configured fallback and verdict is null.
 *
 * Pure orchestration — applies no consent side-effects and touches no UI.
 * The caller (core-lifecycle) is responsible for acting on the result.
 *
 * @param {object} geo  validated geo config block
 */
export async function resolveGeoAction(geo) {
  const fallback = normalizeAction(geo.fallback, 'consent');
  const timeoutMs = geo.timeout || 1500;

  let verdict = null;
  try {
    // Backstop timeout: fetchVerdict aborts its own request at `timeoutMs`,
    // but a hung consumer resolver() needs an outer guard too.
    verdict = await Promise.race([
      fetchVerdict(geo),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs + 50))
    ]);
  } catch (_) {
    verdict = null;
  }

  if (!verdict) {
    return { action: fallback, verdict: null };
  }

  const decided = typeof geo.decide === 'function'
    ? safeInvoke(geo.decide, verdict)
    : defaultDecide(verdict);

  return { action: normalizeAction(decided, fallback), verdict };
}