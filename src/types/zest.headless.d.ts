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
}

/** Configuration accepted by `init()`. */
export interface InitOptions {
  /** Respect Do Not Track / Global Privacy Control. Default `true`. */
  respectDNT?: boolean;
  /** What to do when DNT/GPC is on. Default `'reject'`. */
  dntBehavior?: DNTBehavior;
  /** Cookie expiration in days. Default `365`. */
  expiration?: number;
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
