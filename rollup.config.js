import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const terserOptions = {
  compress: {
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true
  }
};

// Languages to build individual bundles for
const languages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'uk', 'ru', 'ja', 'zh'];

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
      plugins: [langAlias(lang), terser(terserOptions)]
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
      plugins: [langAlias(lang)]
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
    plugins: [terser(terserOptions)]
  },

  // Full multilang bundle (IIFE) - unminified with sourcemaps for development
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.js',
      format: 'iife',
      name: 'Zest',
      sourcemap: true
    }
  },

  // Full multilang bundle (ESM) - minified for production
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.esm.min.js',
      format: 'es'
    },
    plugins: [terser(terserOptions)]
  },

  // Full multilang bundle (ESM) - unminified with sourcemaps for development
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.esm.js',
      format: 'es',
      sourcemap: true
    }
  },

  // Headless (ESM) - logic only, no UI, no styles. Use when the consumer
  // is bringing their own banner/modal UI and CSS.
  {
    input: 'src/headless.js',
    output: {
      file: 'dist/zest.headless.esm.min.js',
      format: 'es'
    },
    plugins: [terser(terserOptions)]
  },
  {
    input: 'src/headless.js',
    output: {
      file: 'dist/zest.headless.esm.js',
      format: 'es',
      sourcemap: true
    }
  },

  // Note: no IIFE headless bundle. Headless is intended for ESM/bundler
  // consumers (`import Zest from '@freshjuice/zest/headless'`) where
  // tree-shaking drops the UI. Script-tag users should use the full
  // `dist/zest.min.js` (which auto-mounts UI) — the two styles don't mix.

  // Single language builds (minified + unminified for each)
  ...languages.flatMap(lang => langConfigs(lang))
];
