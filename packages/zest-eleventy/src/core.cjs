/**
 * @freshjuice/zest-eleventy — shared CJS implementation.
 *
 * Why head-inline?
 * Zest installs `document.cookie` / storage / script interceptors on
 * script eval. To gate any later `defer` / `async` tracker that fires
 * before DOMContentLoaded, the bundle must execute synchronously in
 * `<head>` — before any other script tag. We inline the IIFE so there
 * is no extra HTTP request and no risk of the bundle loading late.
 */

const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');

const SUPPORTED_LANGUAGES = new Set([
  'all', 'en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'uk', 'ru', 'ja', 'zh'
]);

/**
 * JSON.stringify variant safe to embed inside `<script>...</script>`.
 * Closes the `</script>` escape and the U+2028 / U+2029 line-terminator
 * holes that break the JS parser even though they are valid JSON.
 */
function safeStringify(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function loadZestBundle(language) {
  if (!SUPPORTED_LANGUAGES.has(language)) {
    throw new Error(
      `[zest-eleventy] Unsupported language "${language}". Use one of: ${[...SUPPORTED_LANGUAGES].join(', ')}.`
    );
  }

  const requireFn = createRequire(__filename);
  const sub = language === 'all'
    ? '@freshjuice/zest/dist/zest.min.js'
    : `@freshjuice/zest/dist/zest.${language}.min.js`;

  let bundlePath;
  try {
    bundlePath = requireFn.resolve(sub);
  } catch (err) {
    throw new Error(
      `[zest-eleventy] Could not resolve ${sub}. Is @freshjuice/zest installed?`
    );
  }
  return readFileSync(bundlePath, 'utf8');
}

function buildScriptTag({ config, bundle }) {
  const body = [];
  if (config && typeof config === 'object') {
    body.push(`window.ZestConfig=${safeStringify(config)};`);
  }
  body.push(bundle);
  return `<script id="zest-consent">${body.join('\n')}</script>`;
}

const DEFAULT_OPTIONS = {
  enabled: true,
  autoInject: true,
  language: 'all',
  shortcode: 'zest',
  config: undefined
};

function register(eleventyConfig, userOptions) {
  const options = { ...DEFAULT_OPTIONS, ...(userOptions || {}) };

  if (!options.enabled) return;

  // Lazy-load the bundle once. If Zest isn't installed, fail with a
  // clear error at plugin registration time rather than during build.
  let cached = null;
  const getScriptTag = () => {
    if (cached === null) {
      const bundle = loadZestBundle(options.language);
      cached = buildScriptTag({ config: options.config, bundle });
    }
    return cached;
  };

  if (options.shortcode) {
    eleventyConfig.addShortcode(options.shortcode, getScriptTag);
  }

  if (options.autoInject) {
    eleventyConfig.addTransform('zest-inject', function (content, outputPath) {
      // Some 11ty versions pass outputPath via `this` instead of arg2.
      const path = outputPath || (this && this.outputPath);
      if (!path || !path.endsWith('.html')) return content;
      if (typeof content !== 'string') return content;
      // Don't double-inject if user also placed the shortcode manually.
      if (content.includes('id="zest-consent"')) return content;
      // Inject just before </head>. Case-insensitive, first match only.
      const headClose = content.search(/<\/head\s*>/i);
      if (headClose === -1) return content;
      return content.slice(0, headClose) + getScriptTag() + content.slice(headClose);
    });
  }
}

module.exports = register;
module.exports.register = register;
module.exports.safeStringify = safeStringify;
module.exports.loadZestBundle = loadZestBundle;
module.exports.buildScriptTag = buildScriptTag;
