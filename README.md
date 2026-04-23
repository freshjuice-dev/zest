# Zest 🍋

[![npm](https://img.shields.io/npm/v/@freshjuice/zest)](https://www.npmjs.com/package/@freshjuice/zest)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/freshjuice-dev/zest)](https://github.com/freshjuice-dev/zest/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/freshjuice-dev/zest)](https://github.com/freshjuice-dev/zest/network/members)

A lightweight cookie consent toolkit for GDPR/CCPA compliance.

- **Lightweight** — ~9KB gzipped (single language) / ~16KB (all 12 languages) / ~11KB (headless)
- **Zero dependencies** — Vanilla JavaScript
- **Shadow DOM** — Styles isolated from your site
- **Headless mode** — Bring your own UI & CSS, use only the consent engine
- **Privacy-first** — Respects Do Not Track / Global Privacy Control
- **Security-hardened** — XSS-safe templating, URL/color/regex validation, locked interceptors

## Quick Start

```html
<!-- unpkg -->
<script src="https://unpkg.com/@freshjuice/zest"></script>

<!-- jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@freshjuice/zest"></script>
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
<script src="https://unpkg.com/@freshjuice/zest"></script>
```

As an npm dependency:

```js
import Zest from '@freshjuice/zest';

Zest.init({ mode: 'safe', policyUrl: '/privacy' });
```

## Two build flavors

| Entry | What you get | Min / Gzip |
|---|---|---|
| `@freshjuice/zest` | Consent engine **+ Shadow DOM UI** (banner, modal, widget) | ~50 KB / **~16 KB** |
| `@freshjuice/zest/headless` | Consent engine only, **no UI / no CSS** — you build the UI | ~31 KB / **~11 KB** |

Use **headless** when you want full control over markup and styling.

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

  // Consent expiration in days
  expiration: 365,

  // Callbacks — wrapped in try/catch internally, safe to throw
  callbacks: {
    onAccept: (consent) => {},
    onReject: () => {},
    onChange: (consent) => {},
    onReady: (consent) => {}
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
></script>
```

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

// Events — subscribe helpers (also work with addEventListener)
Zest.on('zest:change', (e) => {})
Zest.once('zest:ready', (e) => {})
Zest.EVENTS                    // { READY, CONSENT, REJECT, CHANGE, SHOW, HIDE }
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
| `zest.min.js` | ~16 KB | All 12 languages, auto-detects |
| `zest.{lang}.min.js` | ~9 KB | Single language (e.g. `zest.de.min.js`) |
| `zest.headless.esm.min.js` | ~11 KB | Logic only, no UI / no translations (ESM import) |

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
