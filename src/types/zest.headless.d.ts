/**
 * Type definitions for `@freshjuice/zest/headless`.
 *
 * The headless build ships the consent engine without any UI: no Shadow
 * DOM, no styles, no DOM mounting. You bring your own banner / modal /
 * settings markup and call into Zest for the consent state.
 *
 * @example
 * ```ts
 * import Zest from '@freshjuice/zest/headless';
 *
 * Zest.init({ respectDNT: true, expiration: 365 });
 *
 * if (!Zest.hasConsentDecision()) myBanner.show();
 *
 * acceptBtn.addEventListener('click', () => Zest.acceptAll());
 * rejectBtn.addEventListener('click', () => Zest.rejectAll());
 * ```
 */

/** Built-in consent categories. */
export type ConsentCategory =
  | 'essential'
  | 'functional'
  | 'analytics'
  | 'marketing';

/**
 * Per-category boolean consent state. `essential` is always `true` —
 * consent for it cannot be revoked because it covers strictly-necessary
 * processing.
 */
export type ConsentState =
  & Partial<Record<ConsentCategory, boolean>>
  & { essential: true };

/** Snapshot returned by `init()`. */
export interface InitSnapshot {
  consent: ConsentState;
  hasDecision: boolean;
  dntApplied: boolean;
  /**
   * True when geo gating is configured and resolution is still in flight.
   * When `true`, wait for the `zest:geo` event / `onGeo` callback (or await
   * {@link resolveGeo}) before deciding whether to show your banner — don't
   * read `hasConsentDecision()` immediately, it's still `false`.
   */
  geoPending: boolean;
}

/**
 * The experience a geo decision resolves to:
 * - `'consent'` — opt-in: nothing accepted, present your full banner (GDPR).
 * - `'notice'`  — opt-out: Zest accepted all; present a "Do Not Sell" link.
 * - `'allow'`   — no applicable law: Zest accepted all; present nothing.
 * - `'block'`   — keep everything blocked; present nothing (fail-closed).
 *
 * For `'notice'` / `'allow'`, Zest has already recorded acceptance and replayed
 * the held queues before this fires.
 */
export type GeoAction = 'consent' | 'notice' | 'allow' | 'block';

/**
 * Sanitized jurisdiction verdict — the shape every geo source MUST return
 * (the `/privacy` response of the zest-geo gateway).
 */
export interface GeoVerdict {
  isEU: boolean;
  isEEA: boolean;
  isGDPR: boolean;
  isCCPA: boolean;
  isUSPrivacy: boolean;
  regulations: string[];
  country?: string;
  regionCode?: string;
  continent?: string;
}

/** Opt-in geo / jurisdiction gating. See the full build's docs for details. */
export interface GeoConfig {
  provider?: 'gateway';
  endpoint?: string;
  resolver?: () => GeoVerdict | Promise<GeoVerdict>;
  decide?: (verdict: GeoVerdict) => GeoAction;
  timeout?: number;
  fallback?: GeoAction;
}

/** Tamper-evident proof of the user's last consent decision. */
export interface ConsentProof {
  version: string;
  timestamp: number;
  categories: ConsentState;
}

/** Output of `getDNTDetails()`. */
export interface DNTDetails {
  dnt: boolean;
  gpc: boolean;
  doNotTrack: string | null;
  globalPrivacyControl: boolean;
}

/** Behaviour when DNT / GPC is detected at init time. */
export type DNTBehavior = 'reject' | 'preselect' | 'ignore';

/**
 * Optional consumer callbacks. Each is wrapped in a try/catch internally
 * so a thrown error never breaks the consent pipeline.
 */
export interface ZestCallbacks {
  onAccept?: (consent: ConsentState) => void;
  onReject?: (consent: ConsentState) => void;
  onChange?: (consent: ConsentState) => void;
  onReady?: (consent: ConsentState) => void;
  /**
   * Fired once geo resolution completes with the chosen action and the
   * sanitized verdict (`null` when resolution failed). The primary hook for
   * headless geo gating — branch your UI on `action`.
   */
  onGeo?: (action: GeoAction, verdict: GeoVerdict | null) => void;
}

/**
 * Granular toggles for Zest's interceptor layer. Default is `true` on
 * every channel — back-compat with previous versions.
 *
 * Consumers that gate optional scripts and storage themselves (typical
 * for headless integrations) can disable interception per channel and
 * use Zest as a pure consent-state engine.
 */
export interface InterceptToggles {
  cookies?: boolean;
  storage?: boolean;
  scripts?: boolean;
  /**
   * fetch / XMLHttpRequest / navigator.sendBeacon interception. Catches
   * trackers that ship via CMS first-party proxies (HubSpot, Cloudflare
   * Zaraz, server-side GTM) where the <script> tag is same-origin but
   * the runtime beacon is third-party.
   */
  network?: boolean;
}

/** Configuration accepted by `init()`. */
export interface InitOptions {
  /** Respect Do Not Track / Global Privacy Control. Default `true`. */
  respectDNT?: boolean;
  /** What to do when DNT/GPC is on. Default `'reject'`. */
  dntBehavior?: DNTBehavior;
  /** Cookie expiration in days. Default `365`. */
  expiration?: number;
  /** Disable individual interceptors. Default: all on. */
  intercept?: InterceptToggles;
  /**
   * Opt-in geo / jurisdiction gating. Headless renders no UI, so the result
   * is delivered via the `onGeo` callback / `zest:geo` event. Pass `true` as
   * shorthand for the hosted gateway, or a {@link GeoConfig} for full control.
   */
  geo?: GeoConfig | true;
  /**
   * Exact storage / cookie names to treat as strictly-necessary. Each
   * is appended to the essential category as a fully-anchored regex,
   * so the built-in essential patterns (zest_*, csrf*, …) stay intact.
   */
  essentialKeys?: string[];
  /**
   * Regex source strings to treat as strictly-necessary. Validated via
   * safeRegExp, appended (not replaced) to the essential category.
   */
  essentialPatterns?: string[];
  /**
   * Override patterns per category. Note: this REPLACES the category's
   * built-in patterns. Prefer `essentialKeys` / `essentialPatterns` if
   * you only want to add to the essential category.
   */
  patterns?: Partial<Record<ConsentCategory, string[]>>;
  /** Consumer callbacks. */
  callbacks?: ZestCallbacks;
  /** Anything else — Zest tolerates unknown keys at runtime. */
  [key: string]: unknown;
}

/** Event names emitted on the `window` `document.documentElement`. */
export interface ZestEvents {
  READY: 'zest:ready';
  CONSENT: 'zest:consent';
  REJECT: 'zest:reject';
  CHANGE: 'zest:change';
  SHOW: 'zest:show';
  HIDE: 'zest:hide';
  GEO: 'zest:geo';
}

export type ZestEventName = ZestEvents[keyof ZestEvents];

/** Detail payload of the consent-change event. */
export interface ZestEventDetail {
  consent: ConsentState;
  previous?: ConsentState;
}

declare const Zest: {
  /** Initialise the consent engine. Must be called before any other API. */
  init(options?: InitOptions): InitSnapshot;

  /** Current consent state (clone, safe to mutate). */
  getConsent(): ConsentState;

  /** Has the user granted consent for `category`? */
  hasConsent(category: ConsentCategory): boolean;

  /** Has the user made any consent decision yet (accept, reject, or
   * partial)? */
  hasConsentDecision(): boolean;

  /** Tamper-evident snapshot of the last consent decision. */
  getConsentProof(): ConsentProof | null;

  /** Grant consent for every category. */
  acceptAll(): ConsentState | null;

  /** Revoke consent for every non-essential category. */
  rejectAll(): ConsentState | null;

  /** Set per-category consent. Missing keys are left untouched. */
  updateConsent(
    selections: Partial<Record<ConsentCategory, boolean>>
  ): ConsentState | null;

  /** Wipe all consent state. Useful for "I changed my mind" flows. */
  reset(): void;

  /**
   * Manually resolve the visitor's jurisdiction. `init()` triggers this
   * automatically when `geo` is configured; call it to await the result
   * directly. Resolves `null` when geo is off or a decision already exists.
   */
  resolveGeo(): Promise<{ action: GeoAction; verdict: GeoVerdict | null } | null>;

  /** True if the browser is sending DNT or GPC. */
  isDoNotTrackEnabled(): boolean;

  /** Why `isDoNotTrackEnabled()` returned what it did. */
  getDNTDetails(): DNTDetails;

  /** Subscribe to a consent event. Returns an unsubscribe function. */
  on(
    eventName: ZestEventName,
    handler: (event: CustomEvent<ZestEventDetail>) => void
  ): () => void;

  /** Subscribe once; auto-unsubscribes after the first call. */
  once(
    eventName: ZestEventName,
    handler: (event: CustomEvent<ZestEventDetail>) => void
  ): () => void;

  /** Constants for `on()` / `once()`. */
  EVENTS: ZestEvents;

  /** Active configuration after `init()`. */
  getConfig(): InitOptions | null;
};

export default Zest;

// Named tree-shake-friendly exports.
export const init: typeof Zest.init;
export const acceptAll: typeof Zest.acceptAll;
export const rejectAll: typeof Zest.rejectAll;
export const updateConsent: typeof Zest.updateConsent;
export const reset: typeof Zest.reset;
export const resolveGeo: typeof Zest.resolveGeo;
export const getConsent: typeof Zest.getConsent;
export const hasConsent: typeof Zest.hasConsent;
export const hasConsentDecision: typeof Zest.hasConsentDecision;
export const getConsentProof: typeof Zest.getConsentProof;
export const isDoNotTrackEnabled: typeof Zest.isDoNotTrackEnabled;
export const getDNTDetails: typeof Zest.getDNTDetails;
export const on: typeof Zest.on;
export const once: typeof Zest.once;
export const EVENTS: ZestEvents;
export const getConfig: typeof Zest.getConfig;
