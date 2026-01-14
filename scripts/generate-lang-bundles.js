/**
 * Generate single-language entry files for building separate bundles
 */

import { translations } from '../src/i18n/translations.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const outputDir = './src/i18n/single';

// Ensure directory exists
mkdirSync(outputDir, { recursive: true });

// Generate a file for each language
for (const [lang, translation] of Object.entries(translations)) {
  const content = `/**
 * ${lang.toUpperCase()} only translation - auto-generated
 */
export const translations = {
  ${lang}: ${JSON.stringify(translation, null, 2).replace(/\n/g, '\n  ')}
};

export const supportedLanguages = ['${lang}'];

export function detectLanguage() {
  return '${lang}';
}

export function getTranslation() {
  return translations.${lang};
}
`;

  writeFileSync(`${outputDir}/lang-${lang}.js`, content);
  console.log(`Generated: lang-${lang}.js`);
}

console.log('Done!');
