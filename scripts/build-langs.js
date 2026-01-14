/**
 * Generate single-language translation files and JSON locales
 * Run with: node scripts/build-langs.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { translations } from '../src/i18n/translations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const singleDir = join(__dirname, '../src/i18n/single');
const localesDir = join(__dirname, '../locales');

// Ensure directories exist
mkdirSync(singleDir, { recursive: true });
mkdirSync(localesDir, { recursive: true });

// Generate files for each language
for (const [lang, translation] of Object.entries(translations)) {
  // 1. Generate single-language JS module
  const jsContent = `/**
 * ${lang.toUpperCase()} only translation - auto-generated
 * Do not edit manually, run: npm run build
 */
export const translations = {
  ${lang}: ${JSON.stringify(translation, null, 4).split('\n').join('\n  ')}
};

export const supportedLanguages = ['${lang}'];

export function detectLanguage() {
  return '${lang}';
}

export function getTranslation() {
  return translations.${lang};
}
`;

  writeFileSync(`${singleDir}/lang-${lang}.js`, jsContent);
  console.log(`Generated: src/i18n/single/lang-${lang}.js`);

  // 2. Generate JSON locale file
  const jsonContent = {
    "$schema": "../zest.config.schema.json",
    ...translation
  };

  writeFileSync(
    `${localesDir}/${lang}.json`,
    JSON.stringify(jsonContent, null, 2)
  );
  console.log(`Generated: locales/${lang}.json`);
}

console.log(`\nGenerated ${Object.keys(translations).length} languages (JS modules + JSON locales)`);
