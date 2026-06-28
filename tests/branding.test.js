import { describe, it, expect } from 'vitest';
import {
  mergeConfig,
  normalizeBranding,
  shouldShowBranding
} from '../src/config/defaults.js';
import { translations, supportedLanguages } from '../src/i18n/translations.js';

// Explicit `lang` keeps detectLanguage() from touching `document` / navigator.
const base = { lang: 'en' };

describe('normalizeBranding', () => {
  it('passes booleans through', () => {
    expect(normalizeBranding(true)).toBe(true);
    expect(normalizeBranding(false)).toBe(false);
  });

  it('maps modal/banner (case-insensitive) to the canonical string', () => {
    expect(normalizeBranding('modal')).toBe('modal');
    expect(normalizeBranding('banner')).toBe('banner');
    expect(normalizeBranding('MODAL')).toBe('modal');
    expect(normalizeBranding(' Banner ')).toBe('banner');
  });

  it('maps on/off aliases to booleans', () => {
    expect(normalizeBranding('true')).toBe(true);
    expect(normalizeBranding('on')).toBe(true);
    expect(normalizeBranding('yes')).toBe(true);
    expect(normalizeBranding('1')).toBe(true);
    expect(normalizeBranding('')).toBe(true); // presence of data-branding attr
    expect(normalizeBranding('false')).toBe(false);
    expect(normalizeBranding('off')).toBe(false);
    expect(normalizeBranding('no')).toBe(false);
    expect(normalizeBranding('0')).toBe(false);
  });

  it('falls back to true (default, fail-safe) for unknown values', () => {
    expect(normalizeBranding('sidepanel')).toBe(true);
    expect(normalizeBranding(42)).toBe(true);
    expect(normalizeBranding(null)).toBe(true);
  });
});

describe('shouldShowBranding', () => {
  it('true shows on both surfaces', () => {
    expect(shouldShowBranding(true, 'banner')).toBe(true);
    expect(shouldShowBranding(true, 'modal')).toBe(true);
  });

  it('false hides on both surfaces', () => {
    expect(shouldShowBranding(false, 'banner')).toBe(false);
    expect(shouldShowBranding(false, 'modal')).toBe(false);
  });

  it("'modal' shows only on the modal", () => {
    expect(shouldShowBranding('modal', 'modal')).toBe(true);
    expect(shouldShowBranding('modal', 'banner')).toBe(false);
  });

  it("'banner' shows only on the banner", () => {
    expect(shouldShowBranding('banner', 'banner')).toBe(true);
    expect(shouldShowBranding('banner', 'modal')).toBe(false);
  });
});

describe('mergeConfig branding normalization', () => {
  it('defaults to true when omitted', () => {
    expect(mergeConfig(base).branding).toBe(true);
  });

  it('normalizes string values coming from data attributes / window config', () => {
    expect(mergeConfig({ ...base, branding: 'modal' }).branding).toBe('modal');
    expect(mergeConfig({ ...base, branding: 'banner' }).branding).toBe('banner');
    expect(mergeConfig({ ...base, branding: 'false' }).branding).toBe(false);
    expect(mergeConfig({ ...base, branding: 'true' }).branding).toBe(true);
  });

  it('preserves boolean values', () => {
    expect(mergeConfig({ ...base, branding: false }).branding).toBe(false);
    expect(mergeConfig({ ...base, branding: true }).branding).toBe(true);
  });

  it('coerces unknown strings to the fail-safe default (true)', () => {
    expect(mergeConfig({ ...base, branding: 'nonsense' }).branding).toBe(true);
  });
});

describe('privacy-policy link text (labels.modal.policyText)', () => {
  it('defaults to "Privacy Policy" in English', () => {
    expect(mergeConfig(base).labels.modal.policyText).toBe('Privacy Policy');
  });

  it('is translated for every built-in language', () => {
    // Every shipped language must provide a policyText translation — the
    // modal template reads this label directly, so a missing key would
    // render the English fallback for non-English users.
    for (const lang of supportedLanguages) {
      const policyText = translations[lang].labels.modal.policyText;
      expect(typeof policyText, `lang=${lang}`).toBe('string');
      expect(policyText.length, `lang=${lang}`).toBeGreaterThan(0);
    }
  });

  it('follows the active language translation', () => {
    expect(mergeConfig({ lang: 'de' }).labels.modal.policyText).toBe('Datenschutzerklärung');
    expect(mergeConfig({ lang: 'fr' }).labels.modal.policyText).toBe('Politique de confidentialité');
    expect(mergeConfig({ lang: 'ja' }).labels.modal.policyText).toBe('プライバシーポリシー');
  });

  it('lets consumers override the text per-language', () => {
    const cfg = mergeConfig({
      lang: 'de',
      labels: { modal: { policyText: 'Unsere Datenschutzerklärung' } }
    });
    expect(cfg.labels.modal.policyText).toBe('Unsere Datenschutzerklärung');
  });

  it('user override wins over the built-in translation', () => {
    const cfg = mergeConfig({
      lang: 'es',
      labels: { modal: { policyText: 'Política de Privacidad Personalizada' } }
    });
    expect(cfg.labels.modal.policyText).toBe('Política de Privacidad Personalizada');
  });
});