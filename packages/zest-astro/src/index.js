/**
 * @freshjuice/zest-astro — Astro integration for the Zest cookie
 * consent toolkit.
 *
 * Why head-inline?
 * Zest installs `document.cookie` / storage / script interceptors on
 * script eval. To gate any later `defer` / `async` tracker that fires
 * before DOMContentLoaded, the bundle MUST execute synchronously in
 * `<head>` — before any other script tag in the document. Astro's
 * `injectScript('head-inline', code)` does exactly that.
 *
 * We bundle the chosen Zest IIFE (full multilang or per-language) at
 * build time, prefix it with a serialised `window.ZestConfig`, and hand
 * the combined string to Astro. No extra HTTP request, no waterfall.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const SUPPORTED_LANGUAGES = new Set([
  'all', 'en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'uk', 'ru', 'ja', 'zh'
]);

/**
 * JSON.stringify variant safe to embed inside `<script>...</script>`.
 *
 * - `</script>` escape: `<` → `<` prevents an attacker-controlled
 *   string value from terminating the inline script tag early.
 * - ` ` / ` ` are line terminators in JS string literals (but
 *   valid inside JSON strings) — they break the parse when embedded raw.
 */
export function safeStringify(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Read the Zest IIFE bundle that matches `language` from the resolved
 * `@freshjuice/zest` package on disk. Throws if Zest isn't installed
 * (peer dep missing) or the language file isn't present.
 */
export function loadZestBundle(language = 'all', { resolveFrom } = {}) {
  if (!SUPPORTED_LANGUAGES.has(language)) {
    throw new Error(
      `[zest-astro] Unsupported language "${language}". Use one of: ${[...SUPPORTED_LANGUAGES].join(', ')}.`
    );
  }

  const require = createRequire(resolveFrom || import.meta.url);
  const bundleSubpath = language === 'all'
    ? '@freshjuice/zest/dist/zest.min.js'
    : `@freshjuice/zest/dist/zest.${language}.min.js`;

  let bundlePath;
  try {
    bundlePath = require.resolve(bundleSubpath);
  } catch (err) {
    throw new Error(
      `[zest-astro] Could not resolve ${bundleSubpath}. Is @freshjuice/zest installed?`
    );
  }

  return readFileSync(bundlePath, 'utf8');
}

/**
 * Build the inline script body: optional config assignment + Zest IIFE.
 * Exported so tests can assert on the exact output.
 */
export function buildInlineScript({ config, bundle }) {
  const lines = [];
  if (config && typeof config === 'object') {
    lines.push(`window.ZestConfig=${safeStringify(config)};`);
  }
  lines.push(bundle);
  return lines.join('\n');
}

/**
 * Astro integration factory.
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]
 * @param {boolean} [options.devMode=true] - Inject during `astro dev`.
 * @param {'all'|'en'|'de'|'es'|'fr'|'it'|'pt'|'nl'|'pl'|'uk'|'ru'|'ja'|'zh'} [options.language='all']
 * @param {object} [options.config] - Zest runtime config (window.ZestConfig).
 */
export default function zestAstro(options = {}) {
  const {
    enabled = true,
    devMode = true,
    language = 'all',
    config
  } = options;

  return {
    name: '@freshjuice/zest-astro',
    hooks: {
      'astro:config:setup': ({ injectScript, command, logger }) => {
        if (!enabled) return;
        if (command === 'dev' && !devMode) return;

        try {
          const bundle = loadZestBundle(language);
          const code = buildInlineScript({ config, bundle });
          injectScript('head-inline', code);
          if (logger?.info) {
            logger.info(
              `injected Zest bundle (${language === 'all' ? 'multilang' : language})`
            );
          }
        } catch (err) {
          if (logger?.error) logger.error(err.message);
          else console.error(err.message);
          throw err;
        }
      }
    }
  };
}
