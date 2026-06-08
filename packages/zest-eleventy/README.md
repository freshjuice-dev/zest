# @freshjuice/zest-eleventy

Eleventy (11ty) plugin for [Zest](https://github.com/freshjuice-dev/zest) — a lightweight, GDPR/CCPA-compliant cookie consent toolkit.

Auto-injects the Zest IIFE bundle into the `<head>` of every rendered `.html` page so cookie / storage / script interceptors install **before** any other script. No extra HTTP request.

## Install

```sh
npm install @freshjuice/zest @freshjuice/zest-eleventy
```

> `@freshjuice/zest` is a peer dependency — install both.

## Usage

### ESM (Eleventy 3+)

```js
// .eleventy.js / eleventy.config.js
import zest from '@freshjuice/zest-eleventy';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(zest, {
    language: 'en',
    config: {
      theme: 'auto',
      position: 'bottom-right',
      accentColor: '#0071e3',
      policyUrl: '/privacy'
    }
  });
}
```

### CommonJS

```js
const zest = require('@freshjuice/zest-eleventy');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(zest, { language: 'en' });
};
```

That's it. The plugin injects `<script id="zest-consent">…</script>` just before `</head>` on every `.html` output.

## Manual placement

If you'd rather decide where the script goes, disable the auto-transform and use the shortcode:

```js
eleventyConfig.addPlugin(zest, {
  autoInject: false,
  config: { /* … */ }
});
```

```njk
{# in your base layout #}
<head>
  <meta charset="utf-8">
  {% zest %}
  {# ...other head tags... #}
</head>
```

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Set `false` to disable entirely. |
| `autoInject` | `boolean` | `true` | Auto-inject before `</head>` in every `.html` output. |
| `shortcode` | `string \| false` | `'zest'` | Name of the shortcode for manual placement. `false` to skip. |
| `language` | `'all' \| 'en' \| 'de' \| 'es' \| 'fr' \| 'it' \| 'pt' \| 'nl' \| 'pl' \| 'uk' \| 'ru' \| 'ja' \| 'zh'` | `'all'` | `'all'` ships the multilingual bundle (~16 KB gzip); a language code ships only that language (~9 KB gzip). |
| `config` | `InitOptions` | `undefined` | Runtime Zest config — serialised to `window.ZestConfig`. See [Zest config](https://github.com/freshjuice-dev/zest#configuration). |

## Notes

- Auto-inject skips any output whose path doesn't end in `.html`.
- Auto-inject is a no-op if `<script id="zest-consent">` is already present (so you can mix manual `{% zest %}` placement with the auto transform without duplicating the bundle).
- Auto-inject is a no-op if the document has no `</head>` tag.

## Why head-inline?

Zest installs `document.cookie` / storage / script interceptors **on script eval**. Loading the bundle from an external URL means the browser fetches it before running it — any `defer` / `async` tracker script that fires first would beat the interceptors and write tracking cookies. Inlining the IIFE into `<head>` guarantees Zest is in place before anything else runs.

## License

MIT
