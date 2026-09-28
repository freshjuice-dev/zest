import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

// Replaces the VERSION placeholder with the package version at build time —
// Zest.version then reports the actual shipped version, no drift.
const zestVersion = {
  name: 'zest-version',
  renderChunk(code) {
    return { code: code.replace(/__ZEST_VERSION__/g, pkg.version), map: null };
  }
};

const terserOptions = {
  compress: {
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true
  }
};

// Languages to build individual bundles for
const languages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'uk', 'ru', 'ja', 'zh'];

// Every bundle gets the version replacement — single list, no drift.
const withVersion = (plugins = []) => [...plugins, zestVersion];

// Alias entries for a single language
function langAlias(lang) {
  return alias({
    entries: [
      {
        find: './i18n/translations.js',
        replacement: resolve(__dirname, `src/i18n/single/lang-${lang}.js`)
      },
      {
        find: '../i18n/translations.js',
        replacement: resolve(__dirname, `src/i18n/single/lang-${lang}.js`)
      }
    ]
  });
}

// Generate configs for a single language build (minified + unminified)
function langConfigs(lang) {
  return [
    // Minified for production (no sourcemap)
    {
      input: 'src/index.js',
      output: {
        file: `dist/zest.${lang}.min.js`,
        format: 'iife',
        name: 'Zest'
      },
      plugins: withVersion([langAlias(lang), terser(terserOptions)])
    },
    // Unminified for development (with sourcemap)
    {
      input: 'src/index.js',
      output: {
        file: `dist/zest.${lang}.js`,
        format: 'iife',
        name: 'Zest',
        sourcemap: true
      },
      plugins: withVersion([langAlias(lang)])
    }
  ];
}

export default [
  // Full multilang bundle (IIFE) - minified for production
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.min.js',
      format: 'iife',
      name: 'Zest'
    },
    plugins: withVersion([terser(terserOptions)])
  },

  // Full multilang bundle (IIFE) - unminified with sourcemaps for development
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.js',
      format: 'iife',
      name: 'Zest',
      sourcemap: true
    },
    plugins: withVersion()
  },

  // Full multilang bundle (ESM) - minified for production
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.esm.min.js',
      format: 'es'
    },
    plugins: withVersion([terser(terserOptions)])
  },

  // Full multilang bundle (ESM) - unminified with sourcemaps for development
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: withVersion()
  },

  // Headless (ESM) - logic only, no UI, no styles. Use when the consumer
  // is bringing their own banner/modal UI and CSS.
  {
    input: 'src/headless.js',
    output: {
      file: 'dist/zest.headless.esm.min.js',
      format: 'es'
    },
    plugins: withVersion([terser(terserOptions)])
  },
  {
    input: 'src/headless.js',
    output: {
      file: 'dist/zest.headless.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: withVersion()
  },

  // Note: no IIFE headless bundle. Headless is intended for ESM/bundler
  // consumers (`import Zest from '@freshjuice/zest/headless'`) where
  // tree-shaking drops the UI. Script-tag users should use the full
  // `dist/zest.min.js` (which auto-mounts UI) — the two styles don't mix.

  // Single language builds (minified + unminified for each)
  ...languages.flatMap(lang => langConfigs(lang))
];
