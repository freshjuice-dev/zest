# Zest 🍋

[![npm](https://img.shields.io/npm/v/@freshjuice/zest)](https://www.npmjs.com/package/@freshjuice/zest)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/freshjuice-dev/zest)](https://github.com/freshjuice-dev/zest/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/freshjuice-dev/zest)](https://github.com/freshjuice-dev/zest/network/members)

A lightweight cookie consent toolkit for GDPR/CCPA compliance.

- **Lightweight** — ~14KB gzipped (single language) / ~19KB (all 12 languages) / ~14KB (headless)
- **Zero dependencies** — Vanilla JavaScript
- **Shadow DOM** — Styles isolated from your site
- **Headless mode** — Bring your own UI & CSS, use only the consent engine
- **Privacy-first** — Respects Do Not Track / Global Privacy Control
- **Geo-aware** — Optional jurisdiction gating: full GDPR banner in the EU, a "Do Not Sell" link in the US, nothing elsewhere — via the built-in [zest-geo](https://geo.cookiezest.com/) gateway or your own resolver
- **Security-hardened** — XSS-safe templating, URL/color/regex validation, locked interceptors

## Quick Start

```html
<!-- jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@freshjuice/zest"></script>

<!-- unpkg -->
<script src="https://unpkg.com/@freshjuice/zest"></script>
```

With configuration:

```html
<script>
  window.ZestConfig = {
    position: 'bottom-right',
    theme: 'auto',
    accentColor: '#0071e3',
    policyUrl: '/privacy-policy'
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@freshjuice/zest"></script>
```

As an npm dependency:

```js
import Zest from '@freshjuice/zest';

Zest.init({ mode: 'safe', policyUrl: '/privacy' });
```

## Two build flavors

| Entry | What you get | Min / Gzip |
|---|---|---|
| `@freshjuice/zest` | Consent engine **+ Shadow DOM UI** (banner, modal, widget) | ~62 KB / **~19 KB** |
| `@freshjuice/zest/headless` | Consent engine only, **no UI / no CSS** — you build the UI | ~40 KB / **~14 KB** |

Use **headless** when you want full control over markup and styling.

## Framework integrations

Official plugins inject the Zest IIFE **inline** into `<head>` at build time, so
interceptors install before any other script — with no extra HTTP request. Pass
runtime config (including `geo: true`) straight through.

| Package | Framework | Docs |
|---|---|---|
| [`@freshjuice/zest-astro`](packages/zest-astro) | Astro 3 / 4 / 5 / 6 | [README](packages/zest-astro/README.md) |
| [`@freshjuice/zest-eleventy`](packages/zest-eleventy) | Eleventy (11ty) 2+ | [README](packages/zest-eleventy/README.md) |

```js
// astro.config.mjs
import zest from '@freshjuice/zest-astro';

export default defineConfig({
  integrations: [
    zest({ language: 'en', config: { theme: 'auto', geo: true, policyUrl: '/privacy' } })
  ]
});
```

> Config is serialised into an inline `window.ZestConfig`, so serialisable geo
> forms (`geo: true`, `provider`, `endpoint`, `timeout`, `fallback`) work. The
> function forms (`resolver` / `decide`) can't be serialised — use those in
> client-side JS instead.

## Configuration

### Via `window.ZestConfig`

```javascript
window.ZestConfig = {
  // Position: 'bottom' | 'bottom-left' | 'bottom-right' | 'top'
  position: 'bottom',

  // Theme: 'light' | 'dark' | 'auto' (default: 'auto' follows system)
  theme: 'auto',

  // Accent color — must be a valid CSS color (hex, named, rgb/rgba, hsl/hsla)
  accentColor: '#0071e3',

  // Link to privacy policy — only http:/https:/mailto:/tel:/relative allowed
  policyUrl: '/privacy',

  // Show floating widget after consent
  showWidget: true,

  // Show the "Powered by Zest" link (default: true, both surfaces).
  // Use 'modal' or 'banner' to show it on one surface only, or false to hide.
  branding: true,

  // Button style: 'fill' (solid, default) or 'outline' (bordered, transparent)
  buttonStyle: 'fill',

  // Consent expiration in days
  expiration: 365,

  // Geo gating — off by default. `true` uses the hosted gateway; pass an
  // object for a custom endpoint / resolver / decide(). See the
  // "Geolocation / jurisdiction gating" section.
  geo: false,

  // Callbacks — wrapped in try/catch internally, safe to throw
  callbacks: {
    onAccept: (consent) => {},
    onReject: () => {},
    onChange: (consent) => {},
    onReady: (consent) => {},
    onGeo: (action, verdict) => {}   // fires when `geo` is configured
  },

  // Hide consent categories from the settings modal. Hidden categories
  // are forced to false (rejected) — a visitor can never accept a toggle
  // they cannot see. Essential cannot be hidden.
  categories: {
    analytics: { hidden: true },
    functional: { hidden: true }
  }
};
```

### Via data attributes

```html
<script
  src="zest.min.js"
  data-position="bottom-left"
  data-theme="dark"
  data-accent="#0071e3"
  data-policy-url="/privacy"
  data-geo="on"
  data-branding="false"
  data-hide-categories="analytics,functional"
></script>
```

> `data-geo="on"` enables the hosted gateway. The `resolver` / `decide`
> callbacks are JavaScript-only — use `window.ZestConfig.geo` for those.

> `data-hide-categories` accepts a comma-separated list of category IDs
> to hide from the settings modal (`analytics`, `functional`, `marketing`).
> Hidden categories are forced to false (rejected). Essential cannot be hidden.

## API

```javascript
// Show/hide UI (full build only)
Zest.show()            // Show banner
Zest.hide()            // Hide banner
Zest.showSettings()    // Show settings modal
Zest.hideSettings()    // Close settings modal
Zest.reset()           // Clear consent + reshow banner

// Consent state
Zest.getConsent()              // { essential, functional, analytics, marketing }
Zest.hasConsent('analytics')   // boolean
Zest.hasConsentDecision()      // boolean — has the user made a choice yet?
Zest.getConsentProof()         // full consent cookie payload (compliance audit)

// Programmatic actions
Zest.acceptAll()
Zest.rejectAll()
Zest.updateConsent({ analytics: true, marketing: false })  // headless only

// DNT / GPC
Zest.isDoNotTrackEnabled()
Zest.getDNTDetails()           // { enabled, source: 'dnt'|'gpc'|null }

// Geo / jurisdiction (when `geo` is configured — see below)
Zest.resolveGeo()              // headless: await { action, verdict }

// Events — subscribe helpers (also work with addEventListener)
Zest.on('zest:change', (e) => {})
Zest.once('zest:ready', (e) => {})
Zest.EVENTS                    // { READY, CONSENT, REJECT, CHANGE, SHOW, HIDE, GEO }
```

## Headless mode — bring your own UI

Full control over markup and styling, no Shadow DOM, no inline CSS.

```js
import Zest from '@freshjuice/zest/headless';

Zest.init({
  mode: 'safe',
  respectDNT: true,
  consentModeGoogle: true
});

// Decide when to show YOUR banner
if (!Zest.hasConsentDecision()) {
  document.querySelector('#my-banner').classList.add('open');
}

// Wire your buttons
document.querySelector('#accept').onclick = () => Zest.acceptAll();
document.querySelector('#reject').onclick = () => Zest.rejectAll();

document.querySelector('#save').onclick = () => {
  Zest.updateConsent({
    analytics: analyticsCheckbox.checked,
    marketing: marketingCheckbox.checked,
    functional: functionalCheckbox.checked
  });
};

// Listen for changes
Zest.on(Zest.EVENTS.CHANGE, (e) => {
  console.log('consent changed', e.detail.consent);
});
```

What headless gives you:
- All interceptors (cookies, storage, scripts) still work — just skip the built-in UI
- Same config surface (`mode`, `respectDNT`, `consentModeGoogle`, `blockedDomains`, `patterns`, etc.)
- **Does NOT auto-init** — you call `Zest.init()` when ready
- **Does NOT set `window.Zest`** — you import and use the module directly

See `examples/headless.html` for a complete working example.

## Do Not Track (DNT) / Global Privacy Control (GPC)

Zest respects browser privacy signals by default:

```javascript
window.ZestConfig = {
  respectDNT: true,     // Respect DNT/GPC signals (default: true)
  dntBehavior: 'reject' // What to do when DNT is enabled
};
```

| Behavior | Description |
|----------|-------------|
| `reject` | Auto-reject all non-essential cookies, don't show banner (default) |
| `preselect` | Show banner with non-essential options unchecked |
| `ignore` | Ignore DNT/GPC signals completely |

```javascript
Zest.isDoNotTrackEnabled()  // true if DNT or GPC is enabled
Zest.getDNTDetails()        // { enabled: boolean, source: 'dnt' | 'gpc' | null }
```

## Geolocation / jurisdiction gating

By default Zest shows the banner to **everyone**. Opt into geo gating and it
resolves the visitor's location and decides *which* experience to present:

```javascript
window.ZestConfig = { geo: true };   // that's it
```

Default behaviour once enabled, matching the legal model:

| Jurisdiction | Action | What the visitor sees |
|---|---|---|
| GDPR / EEA / UK | `consent` | Opt-in — full banner, tracking blocked until they choose |
| US state-privacy (CCPA, CPRA, VCDPA…) | `notice` | Opt-out — tracking runs, a small **"Do Not Sell or Share My Personal Information"** link |
| Everywhere else | `allow` | Nothing — tracking allowed, no UI |

`geo: true` is shorthand for `{ provider: 'gateway' }`, which uses the hosted
**[zest-geo](https://geo.cookiezest.com/)** gateway — a Cloudflare Worker that
reads the edge geo of the request and returns the applicable privacy regimes.
It stores nothing, logs nothing, and the `/privacy` endpoint carries no IP /
city / coordinates. Zero infrastructure on your side.

### Choosing the verdict source

```javascript
window.ZestConfig = {
  geo: {
    // Pick ONE source:
    provider: 'gateway',                          // hosted zest-geo (default)
    // endpoint: 'https://geo.example.com/privacy', // your self-hosted zest-geo
    // resolver: async () => ({ isGDPR, isUSPrivacy, isCCPA, isEU, isEEA, regulations }),

    // Optional — map the verdict to an action (this is the default):
    decide: (geo) =>
      geo.isGDPR ? 'consent' : geo.isUSPrivacy ? 'notice' : 'allow',

    timeout: 1500,        // ms before giving up
    fallback: 'consent'   // action if resolution fails/times out (fail-closed)
  }
};
```

The **`resolver`** option is the recommended path if your CDN already knows the
country — read its geo header (`CF-IPCountry`, `x-vercel-ip-country`, etc.) and
return the verdict yourself, no extra request. Whatever the source, it must
return the gateway's shape:

```ts
{ isEU, isEEA, isGDPR, isCCPA, isUSPrivacy: boolean, regulations: string[] }
```

**`decide()` must return one of four actions:**

| Action | Interceptors | UI |
|---|---|---|
| `'consent'` | stay blocked until decision | full banner / modal |
| `'notice'` | allow + replay queue (opt-out) | "Do Not Sell" link |
| `'allow'` | allow + replay queue | nothing |
| `'block'` | stay blocked | nothing (fail-closed) |

Anything outside this set is clamped to `fallback`.

### How it works (and the one caveat)

Interceptors install **synchronously** on script eval, so trackers stay blocked
no matter what. Geo resolves **asynchronously** — Zest holds the UI until the
verdict lands, then mounts the right experience. On timeout or error it fails
**closed** to `fallback` (default `'consent'`).

Trade-off: in `allow` / `notice` regions, trackers are held for the brief
gateway round-trip (~tens of ms) before being released. That's correct
fail-closed behaviour — nothing leaks while the verdict is in flight.

### Headless

Headless renders no UI, so the result reaches you via the `onGeo` callback, the
`zest:geo` event, or `await Zest.resolveGeo()`. Tracking is already accepted for
`notice` / `allow` by the time it fires:

```js
import Zest from '@freshjuice/zest/headless';

Zest.init({
  geo: true,
  callbacks: {
    onGeo: (action, verdict) => {
      if (action === 'consent') myBanner.show();        // GDPR — opt-in
      if (action === 'notice')  myDoNotSellLink.show(); // US — opt-out
      // 'allow' / 'block' — render nothing
    }
  }
});

// …or await it directly:
const { action, verdict } = await Zest.resolveGeo();
```

> When `geo` is set, the `init()` snapshot returns `geoPending: true` until the
> verdict resolves. Branch on that rather than reading `hasConsentDecision()`
> immediately — it's still `false` while resolution is in flight.

## Blocking Modes

Control how aggressively scripts are blocked:

```javascript
window.ZestConfig = {
  mode: 'safe' // 'manual' | 'safe' | 'strict' | 'doomsday'
};
```

| Mode | Description |
|------|-------------|
| `manual` | Only blocks scripts with `data-consent-category` attribute |
| `safe` | Manual + known major trackers (Google Analytics, Facebook, etc.) |
| `strict` | Safe + extended tracker list (Hotjar, Mixpanel, Segment, etc.) |
| `doomsday` | Block ALL third-party scripts |

### Custom Blocked Domains

```javascript
window.ZestConfig = {
  mode: 'safe',
  blockedDomains: [
    'custom-tracker.com',
    { domain: 'another-tracker.com', category: 'analytics' }
  ]
};
```

### Manual Script Tagging

```html
<script data-consent-category="analytics" src="https://..."></script>
<script data-consent-category="marketing">
  // Inline scripts also supported
</script>
```

> **Note:** `data-consent-category="essential"` on third-party scripts is
> ignored — self-labeling as essential is a known bypass. Only
> `functional`, `analytics`, and `marketing` self-labels are honored.

### Allow Specific Scripts

```html
<script data-zest-allow src="https://cdn.example.com/library.js"></script>
```

## Events

```javascript
document.addEventListener('zest:consent', (e) => {
  console.log('User accepted:', e.detail.consent);
});

document.addEventListener('zest:reject', (e) => {
  console.log('User rejected');
});

document.addEventListener('zest:change', (e) => {
  console.log('Consent changed:', e.detail);
});

document.addEventListener('zest:ready', (e) => {
  console.log('Zest initialized:', e.detail.consent);
});

// Fires only when `geo` is configured — see "Geolocation / jurisdiction gating"
document.addEventListener('zest:geo', (e) => {
  console.log('jurisdiction resolved:', e.detail.action, e.detail.verdict);
});

// Or via the helpers
Zest.on(Zest.EVENTS.CHANGE, (e) => { /* ... */ });
Zest.once(Zest.EVENTS.READY, (e) => { /* ... */ });
```

## Google Consent Mode v2 / Microsoft UET Consent Mode

Optional — push consent state to Google and Microsoft advertising APIs.

### Enable via JavaScript

```javascript
window.ZestConfig = {
  consentModeGoogle: true,
  consentModeMicrosoft: true
};
```

### Enable via data attributes

```html
<script
  src="zest.min.js"
  data-consent-mode-google="true"
  data-consent-mode-microsoft="true"
></script>
```

When enabled, Zest automatically:

1. Pushes a `'default'` denied state on page load (before any tracking scripts fire)
2. Pushes an `'update'` whenever the user makes a choice

### Category mapping

| Zest Category | Google Consent Mode v2 Signals | Microsoft UET Signal |
|---|---|---|
| `essential` | `functionality_storage: 'granted'` (always) | — |
| `functional` | `personalization_storage` | — |
| `analytics` | `analytics_storage` | — |
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization` | `ad_storage` |

## Localization

Built-in translations with auto-detection.

**Supported languages:** `en`, `de`, `es`, `fr`, `it`, `pt`, `nl`, `pl`, `uk`, `ru`, `ja`, `zh`

### Bundle Options

| Bundle | Size (gzip) | Description |
|--------|-------------|-------------|
| `zest.min.js` | ~19 KB | All 12 languages, auto-detects |
| `zest.{lang}.min.js` | ~14 KB | Single language (e.g. `zest.de.min.js`) |
| `zest.headless.esm.min.js` | ~14 KB | Logic only, no UI / no translations (ESM import) |

```html
<!-- Full bundle - auto-detects language -->
<script src="https://unpkg.com/@freshjuice/zest"></script>

<!-- Single language bundle - smaller size -->
<script src="https://unpkg.com/@freshjuice/zest/dist/zest.de.min.js"></script>
```

### Language Detection

```javascript
window.ZestConfig = { lang: 'auto' };  // default
```

Priority: `lang` config → `<html lang="...">` → `navigator.language` → English.

### Force Specific Language

```javascript
window.ZestConfig = { lang: 'de' };
```

### Override Labels

```javascript
window.ZestConfig = {
  lang: 'de',
  labels: {
    banner: {
      title: 'Custom German Title'
    },
    modal: {
      // Anchor text for the privacy-policy link shown next to the modal
      // description when `policyUrl` is set. Defaults to the per-language
      // translation of "Privacy Policy".
      policyText: 'Unsere Datenschutzerklärung'
    }
  }
};
```

Standalone JSON translation files are in `/locales/`.

## Styling the UI (full build)

The UI is rendered inside a Shadow DOM with `mode: 'open'`, so your global
CSS can't reach inside the component. You have three options:

### 1. CSS custom properties (inheritable through Shadow DOM)

The following custom properties are exposed on the host elements:

```css
zest-banner, zest-modal, zest-widget {
  --zest-accent: #0071e3;
  --zest-bg: #ffffff;
  --zest-bg-secondary: #f3f4f6;
  --zest-text: #1f2937;
  --zest-text-secondary: #6b7280;
  --zest-border: #e5e7eb;
  --zest-radius: 12px;
  --zest-radius-sm: 8px;
}
```

### 2. `customStyles` config option

```javascript
window.ZestConfig = {
  customStyles: `
    .zest-banner { max-width: 600px; }
    .zest-btn--primary { border-radius: 20px; }
    .zest-modal { max-width: 600px; }
  `
};
```

> **Security note:** `customStyles` is sanitized — `@import`, `expression()`,
> external `url()` values, and selectors targeting the accept/reject
> buttons are stripped. This prevents clickjacking via invisible-button
> CSS attacks. Payloads over 20 KB are dropped entirely.

### 3. Style the host elements directly

The custom elements `zest-banner`, `zest-modal`, `zest-widget` live in the
light DOM — you can position, hide, or z-index them from your global CSS.

### Want full CSS control?

Use the **headless** entry and style your own markup however you like.

## Branding

By default a small **"Powered by Zest"** link (→ [cookiezest.com](https://cookiezest.com))
appears on the banner and the settings modal. `branding` accepts four values:

| Value | Banner | Modal |
|-------|--------|-------|
| `true` (default) | ✅ | ✅ |
| `'modal'` | — | ✅ |
| `'banner'` | ✅ | — |
| `false` | — | — |

```javascript
// Show the attribution only on the settings modal, not the banner
window.ZestConfig = { branding: 'modal' };
```

```html
<script src="zest.min.js" data-branding="modal"></script>
```

Turn it off entirely with `branding: false` / `data-branding="false"`. Headless
builds render no UI, so this option doesn't apply there.

## Categories

| Category | ID | Default | Description |
|----------|-----|---------|-------------|
| Essential | `essential` | ON | Required cookies (cannot be disabled) |
| Functional | `functional` | OFF | Personalization features |
| Analytics | `analytics` | OFF | Usage tracking |
| Marketing | `marketing` | OFF | Advertising cookies |

Unknown cookies default to `marketing` (strictest).

## Security

Zest takes a defense-in-depth approach to security.

Highlights:

- All config-driven HTML is escaped via an internal `escapeHTML` pass
- `policyUrl` is validated against an allowlist (`http:`, `https:`,
  `mailto:`, `tel:`, relative)
- `accentColor` must pass a strict color validator
- `customStyles` is sanitized (see above)
- Consent cookie JSON is schema-validated on read (prototype pollution safe)
- On HTTPS, the consent cookie is written with the `Secure` flag
- `window.Zest` is frozen and non-configurable once installed
- User callbacks are wrapped in try/catch so a throwing handler can't
  break the consent flow
- Cookie / storage / script queues are size-capped (DoS prevention)

To report a vulnerability, open a private security advisory on GitHub.

## Config Schema

JSON Schema for IDE autocompletion: [`zest.config.schema.json`](zest.config.schema.json)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Credits

Built by [Alex Zappa](https://alex.zappa.dev) at [FreshJuice](https://freshjuice.dev)

## License

[MIT](LICENSE)
