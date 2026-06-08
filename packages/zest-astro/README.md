# @freshjuice/zest-astro

Astro integration for [Zest](https://github.com/freshjuice-dev/zest) — a lightweight, GDPR/CCPA-compliant cookie consent toolkit.

Inlines the Zest IIFE bundle into `<head>` so cookie / storage / script interceptors install **before** any other script on the page. No extra HTTP request, no waterfall.

## Install

```sh
npm install @freshjuice/zest @freshjuice/zest-astro
```

> `@freshjuice/zest` is a peer dependency — install both.

## Usage

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import zest from '@freshjuice/zest-astro';

export default defineConfig({
  integrations: [
    zest({
      language: 'en',
      config: {
        theme: 'auto',
        position: 'bottom-right',
        accentColor: '#0071e3',
        policyUrl: '/privacy',
        consentModeGoogle: true
      }
    })
  ]
});
```

That's it. Zest renders the banner on first visit and the floating widget afterwards.

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Set `false` to disable entirely. |
| `devMode` | `boolean` | `true` | Inject during `astro dev`. |
| `language` | `'all' \| 'en' \| 'de' \| 'es' \| 'fr' \| 'it' \| 'pt' \| 'nl' \| 'pl' \| 'uk' \| 'ru' \| 'ja' \| 'zh'` | `'all'` | `'all'` ships the multilingual bundle (~16 KB gzip); a language code ships only that language (~9 KB gzip). |
| `config` | `InitOptions` | `undefined` | Runtime Zest config — serialised to `window.ZestConfig`. See [Zest config](https://github.com/freshjuice-dev/zest#configuration). |

## Why head-inline?

Zest installs `document.cookie` / storage / script interceptors **on script eval**. If the bundle ships as a deferred module, any `defer` / `async` tracker script that fires before `DOMContentLoaded` would beat the interceptors and write tracking cookies. Inlining the IIFE into `<head>` guarantees Zest is in place before anything else runs.

## License

MIT
