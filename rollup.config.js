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

// Generate config for a single language build
function langConfig(lang) {
  return {
    input: 'src/index.js',
    output: {
      file: `dist/zest.${lang}.min.js`,
      format: 'iife',
      name: 'Zest',
      sourcemap: true
    },
    plugins: [
      alias({
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
      }),
      terser(terserOptions)
    ]
  };
}

export default [
  // Full multilang bundle (IIFE)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.min.js',
      format: 'iife',
      name: 'Zest',
      sourcemap: true
    },
    plugins: [terser(terserOptions)]
  },

  // Full multilang bundle (ESM)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/zest.esm.js',
      format: 'es',
      sourcemap: true
    }
  },

  // Single language builds
  ...languages.map(lang => langConfig(lang))
];
