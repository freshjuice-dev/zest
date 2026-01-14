# Zest 🍋

A lightweight cookie consent toolkit for GDPR/CCPA compliance.

- **Lightweight** - ~9KB gzipped (single language) / ~14KB (all 12 languages)
- **Zero dependencies** - Vanilla JavaScript
- **Shadow DOM** - Styles isolated from your site
- **Modern browsers** - No IE11 polyfills needed
- **Privacy-first** - Respects Do Not Track / Global Privacy Control

## Quick Start

```html
<!-- unpkg -->
<script src="https://unpkg.com/@freshjuice/zest"></script>

<!-- jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@freshjuice/zest"></script>
```

Or with configuration:

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

## Configuration

### Via `window.ZestConfig`

```javascript
window.ZestConfig = {
  // Position: 'bottom' | 'bottom-left' | 'bottom-right' | 'top'
  position: 'bottom',

  // Theme: 'light' | 'dark' | 'auto' (default: 'auto' follows system)
  theme: 'auto',

  // Accent color for buttons
  accentColor: '#0071e3',

  // Link to privacy policy
  policyUrl: '/privacy',

  // Show floating widget after consent
  showWidget: true,

  // Consent expiration in days
  expiration: 365,

  // Callbacks
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
// Show/hide UI
Zest.show()           // Show banner
Zest.hide()           // Hide banner
Zest.showSettings()   // Show settings modal
Zest.reset()          // Clear consent, show banner

// Consent management
Zest.getConsent()     // Get current consent state
Zest.hasConsent('analytics')  // Check specific category
Zest.acceptAll()      // Accept all categories
Zest.rejectAll()      // Reject all (except essential)
```

## Do Not Track (DNT) / Global Privacy Control (GPC)

Zest respects browser privacy signals by default:

```javascript
window.ZestConfig = {
  respectDNT: true,    // Respect DNT/GPC signals (default: true)
  dntBehavior: 'reject' // What to do when DNT is enabled
};
```

| Behavior | Description |
|----------|-------------|
| `reject` | Auto-reject all non-essential cookies, don't show banner (default) |
| `preselect` | Show banner with non-essential options unchecked |
| `ignore` | Ignore DNT/GPC signals completely |

**API methods:**
```javascript
Zest.isDoNotTrackEnabled()  // Returns true if DNT or GPC is enabled
Zest.getDNTDetails()        // Returns { enabled: boolean, source: 'dnt' | 'gpc' | null }
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

Add your own domains to block:

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

For any mode, you can explicitly tag scripts:

```html
<script data-consent-category="analytics" src="https://..."></script>
<script data-consent-category="marketing">
  // Inline scripts also supported
</script>
```

### Allow Specific Scripts

Prevent a script from being blocked (useful in strict/doomsday modes):

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
```

## Localization

Zest has **built-in translations** with auto-detection.

**Supported languages:** `en`, `de`, `es`, `fr`, `it`, `pt`, `nl`, `pl`, `uk`, `ru`, `ja`, `zh`

### Bundle Options

| Bundle | Size (gzip) | Description |
|--------|-------------|-------------|
| `zest.min.js` | ~14KB | All 12 languages, auto-detects |
| `zest.{lang}.min.js` | ~9KB | Single language (e.g., `zest.de.min.js`) |

```html
<!-- Full bundle - auto-detects language -->
<script src="https://unpkg.com/@freshjuice/zest"></script>

<!-- Single language bundle - smaller size -->
<script src="https://unpkg.com/@freshjuice/zest/dist/zest.de.min.js"></script>
```

### Language Detection

```javascript
window.ZestConfig = {
  lang: 'auto' // Auto-detect (default)
};
```

**Detection priority:**
1. `lang` config option (if not 'auto')
2. `<html lang="de">` attribute
3. Browser language (`navigator.language`)
4. Fallback to English

### Force Specific Language

```javascript
window.ZestConfig = {
  lang: 'de' // Force German
};
```

### Override Labels

```javascript
window.ZestConfig = {
  lang: 'de', // Use German as base
  labels: {
    banner: {
      title: 'Custom German Title' // Override just this
    }
  }
};
```

Standalone JSON translation files also available in `/locales/` for external loading.

## Custom Styling

Override default styles by passing custom CSS:

```javascript
window.ZestConfig = {
  customStyles: `
    .zest-banner {
      max-width: 600px;
    }
    .zest-btn--primary {
      border-radius: 20px;
    }
    .zest-modal {
      max-width: 600px;
    }
  `
};
```

Available CSS custom properties (can also be set via parent CSS):

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

## Categories

| Category | ID | Default | Description |
|----------|-----|---------|-------------|
| Essential | `essential` | ON | Required cookies (cannot be disabled) |
| Functional | `functional` | OFF | Personalization features |
| Analytics | `analytics` | OFF | Usage tracking |
| Marketing | `marketing` | OFF | Advertising cookies |

## Config Schema

JSON Schema available for IDE autocompletion: `zest.config.schema.json`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Credits

Built by [Alex Zappa](https://alex.zappa.dev) at [FreshJuice](https://freshjuice.dev)

## License

[MIT](LICENSE)
