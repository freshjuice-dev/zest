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
  /**
   * True when geo gating is configured and resolution is still in flight (no
   * decision recorded yet). The UI is held until the verdict lands. When
   * `false`, geo is either off, already resolved, or moot (a decision exists).
   */
  geoPending: boolean;
}

/**
 * The experience a geo decision resolves to:
 * - `'consent'` — opt-in: stay blocked, show the full banner (GDPR/EEA/UK).
 * - `'notice'`  — opt-out: allow tracking, show a "Do Not Sell" link (US).
 * - `'allow'`   — no applicable law: release the queues, show nothing.
 * - `'block'`   — keep everything blocked, show nothing (fail-closed).
 */
export type GeoAction = 'consent' | 'notice' | 'allow' | 'block';

/**
 * Sanitized jurisdiction verdict — the shape every geo source MUST return
 * (the `/privacy` response of the zest-geo gateway). Untrusted input is
 * coerced to this before any decision is made.
 */
export interface GeoVerdict {
  isEU: boolean;
  isEEA: boolean;
  isGDPR: boolean;
  isCCPA: boolean;
  isUSPrivacy: boolean;
  /** Every regime that applies, e.g. `['GDPR']`, `['CCPA', 'CPRA']`. */
  regulations: string[];
  /** ISO 3166-1 alpha-2, when the source provides it. */
  country?: string;
  /** Region/state code (e.g. `'CA'`), when provided. */
  regionCode?: string;
  /** Continent code (e.g. `'EU'`), when provided. */
  continent?: string;
}

/**
 * Opt-in geo / jurisdiction gating. Supply a source (hosted gateway, a
 * self-hosted `endpoint`, or your own `resolver`) and optionally a `decide`
 * mapper. Omit the whole block to show the banner to everyone (the default).
 */
export interface GeoConfig {
  /** Use the hosted gateway at `https://geo.cookiezest.com/privacy`. */
  provider?: 'gateway';
  /** A self-hosted zest-geo `/privacy` URL (http/https only). */
  endpoint?: string;
  /**
   * Supply the verdict yourself (sync or async) — e.g. from a CDN geo header
   * your edge already sets. Must return the {@link GeoVerdict} shape.
   * Takes precedence over `provider` / `endpoint`.
   */
  resolver?: () => GeoVerdict | Promise<GeoVerdict>;
  /**
   * Map a verdict to an action. Defaults to: GDPR → `'consent'`,
   * US-privacy → `'notice'`, otherwise `'allow'`.
   */
  decide?: (verdict: GeoVerdict) => GeoAction;
  /** Milliseconds before resolution gives up. Default `1500` (100–10000). */
  timeout?: number;
  /** Action to apply if resolution fails/times out. Default `'consent'`. */
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

/** Banner position on the page. */
export type BannerPosition = 'bottom' | 'bottom-left' | 'bottom-right' | 'top' | 'top-left' | 'top-right' | 'center';

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
  /**
   * Fired once geo resolution completes with the chosen action and the
   * sanitized verdict (`null` when resolution failed and the fallback was
   * applied). Only fires when `geo` is configured.
   */
  onGeo?: (action: GeoAction, verdict: GeoVerdict | null) => void;
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
  /**
   * fetch / XMLHttpRequest / navigator.sendBeacon interception. Catches
   * trackers that ship via CMS first-party proxies (HubSpot, Cloudflare
   * Zaraz, server-side GTM) where the <script> tag is same-origin but
   * the runtime beacon is third-party.
   */
  network?: boolean;
}

/** Per-category configuration overrides. */
export interface CategoryConfig {
  /** Display label (defaults to the built-in label for this category). */
  label?: string;
  /** Description shown under the label in the settings modal. */
  description?: string;
  /** Whether the category is required (always on, toggle disabled). */
  required?: boolean;
  /** Default consent state when no decision exists yet. */
  default?: boolean;
  /**
   * Hide this category from the settings modal. Hidden categories are
   * forced to false (rejected) in the consent state. Essential cannot
   * be hidden — the flag is ignored for it.
   */
  hidden?: boolean;
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
  /**
   * Show the "Powered by Zest" attribution link (links to
   * https://cookiezest.com). Default `true` (shown on both the banner and
   * the settings modal). Use `'modal'` or `'banner'` to restrict it to a
   * single surface, or `false` to remove it everywhere.
   */
  branding?: boolean | 'modal' | 'banner';
  /**
   * Style of the Accept / Reject buttons. `'fill'` (default) renders solid
   * buttons of equal prominence; `'outline'` renders accent-bordered
   * transparent buttons for a lighter visual weight. Unknown values fall
   * back to `'fill'`. Also accepted via `data-button-style`.
   */
  buttonStyle?: 'fill' | 'outline';
  /**
   * Blur the page content behind the settings modal overlay using CSS
   * `backdrop-filter`. Default `false` — it is a cosmetic preference
   * and `backdrop-filter` can be expensive on low-end devices. Also
   * accepted via `data-backdrop-blur`.
   */
  backdropBlur?: boolean;
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
   * Per-category overrides. Set `hidden: true` to remove a category from
   * the settings modal. Hidden categories are forced to false (rejected)
   * in the consent state — a visitor can never accept a toggle they cannot
   * see. Essential cannot be hidden.
   */
  categories?: Partial<Record<ConsentCategory, CategoryConfig>>;
  /**
   * Opt-in geo / jurisdiction gating. Omit to show the banner to everyone
   * (the default). Pass `true` as shorthand for the hosted gateway
   * (`{ provider: 'gateway' }`), or a {@link GeoConfig} for full control.
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

/** Event names emitted on `document.documentElement`. */
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
