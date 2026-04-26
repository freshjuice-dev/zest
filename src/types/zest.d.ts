/**
 * Type definitions for `@freshjuice/zest` (full build with UI).
 *
 * The full build ships the consent engine plus a Shadow-DOM banner,
 * settings modal, and floating widget. It auto-initialises on script
 * load when included via `<script>`, or you can drive it manually via
 * `Zest.init()`.
 *
 * For a logic-only build without UI, import from
 * `@freshjuice/zest/headless` instead.
 *
 * @example
 * ```ts
 * import Zest from '@freshjuice/zest';
 *
 * Zest.init({
 *   position: 'bottom-right',
 *   theme: 'auto',
 *   accentColor: '#0071e3',
 *   policyUrl: '/privacy'
 * });
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

/** Banner position on the page. */
export type BannerPosition = 'bottom' | 'bottom-left' | 'bottom-right' | 'top';

/** UI theme. `auto` follows `prefers-color-scheme`. */
export type ZestTheme = 'light' | 'dark' | 'auto';

/** Script-blocking strictness. */
export type ZestMode = 'manual' | 'safe' | 'strict' | 'doomsday';

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

/**
 * Granular toggles for Zest's interceptor layer. Default is `true` on
 * every channel — back-compat with previous versions.
 *
 * Consumers that gate optional scripts and storage themselves can
 * disable interception per channel and use Zest as a pure consent-state
 * engine.
 */
export interface InterceptToggles {
  cookies?: boolean;
  storage?: boolean;
  scripts?: boolean;
}

/** Configuration accepted by `init()` and `window.ZestConfig`. */
export interface InitOptions {
  /** Display language. `'auto'` detects from `<html lang>` / browser. */
  lang?:
    | 'auto'
    | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt'
    | 'nl' | 'pl' | 'uk' | 'ru' | 'ja' | 'zh';
  /** Banner position. Default `'bottom'`. */
  position?: BannerPosition;
  /** UI theme. Default `'auto'`. */
  theme?: ZestTheme;
  /** Hex accent color for buttons (e.g. `'#0071e3'`). */
  accentColor?: string;
  /** Link to the host site's privacy policy. */
  policyUrl?: string;
  /** Show floating "manage cookies" widget after a decision. Default `true`. */
  showWidget?: boolean;
  /** Cookie expiration in days. Default `365`. */
  expiration?: number;
  /** Script-blocking mode. Default `'safe'`. */
  mode?: ZestMode;
  /** Auto-initialise on script load. Default `true` for the UI build. */
  autoInit?: boolean;
  /** Respect Do Not Track / Global Privacy Control. Default `true`. */
  respectDNT?: boolean;
  /** What to do when DNT/GPC is on. Default `'reject'`. */
  dntBehavior?: DNTBehavior;
  /** Disable individual interceptors. Default: all on. */
  intercept?: InterceptToggles;
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

/** Event names emitted on `document.documentElement`. */
export interface ZestEvents {
  READY: 'zest:ready';
  CONSENT: 'zest:consent';
  REJECT: 'zest:reject';
  CHANGE: 'zest:change';
  SHOW: 'zest:show';
  HIDE: 'zest:hide';
}

export type ZestEventName = ZestEvents[keyof ZestEvents];

/** Detail payload of consent events. */
export interface ZestEventDetail {
  consent: ConsentState;
  previous?: ConsentState;
}

declare const Zest: {
  /** Initialise. Auto-called when the script loads unless `autoInit: false`. */
  init(options?: InitOptions): InitSnapshot;

  /** Show the consent banner. */
  show(): void;

  /** Hide the consent banner. */
  hide(): void;

  /** Open the per-category settings modal. */
  showSettings(): void;

  /** Close the settings modal. */
  hideSettings(): void;

  /** Show the persistent "manage cookies" widget. */
  showWidget(): void;

  /** Hide the widget without removing it. */
  hideWidget(): void;

  /** Current consent state (clone, safe to mutate). */
  getConsent(): ConsentState;

  /** Has the user granted consent for `category`? */
  hasConsent(category: ConsentCategory): boolean;

  /** Has the user made any consent decision yet? */
  hasConsentDecision(): boolean;

  /** Tamper-evident snapshot of the last consent decision. */
  getConsentProof(): ConsentProof | null;

  /** Grant consent for every category and run accept callbacks. */
  acceptAll(): void;

  /** Revoke consent for every non-essential category and run reject callbacks. */
  rejectAll(): void;

  /** Wipe all consent state and reshow the banner. */
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

declare global {
  interface Window {
    /** Set before loading `zest.min.js` to configure auto-initialisation. */
    ZestConfig?: InitOptions;
    /** The Zest singleton, attached after auto-init. */
    Zest?: typeof Zest;
  }
}
