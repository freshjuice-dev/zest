import { describe, it, expect } from 'vitest';
import { generateStyles } from '../src/ui/styles.js';
import { mergeConfig } from '../src/config/defaults.js';

const base = { lang: 'en' };

describe('backdropBlur config', () => {
  it('defaults to 0 (disabled)', () => {
    expect(mergeConfig(base).backdropBlur).toBe(0);
  });

  it('preserves a number from user config', () => {
    expect(mergeConfig({ ...base, backdropBlur: 8 }).backdropBlur).toBe(8);
  });

  it('0 disables blur', () => {
    expect(mergeConfig({ ...base, backdropBlur: 0 }).backdropBlur).toBe(0);
  });
});

describe('backdropBlur styles', () => {
  it('no backdrop-filter when backdropBlur is 0 (default)', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).not.toContain('backdrop-filter');
    expect(css).not.toContain('-webkit-backdrop-filter');
  });

  it('adds backdrop-filter with pixel value when set', () => {
    const css = generateStyles({ accentColor: '#0071e3', backdropBlur: 8 });
    expect(css).toContain('backdrop-filter: blur(8px)');
    expect(css).toContain('-webkit-backdrop-filter: blur(8px)');
  });

  it('different pixel value produces different blur', () => {
    const css = generateStyles({ accentColor: '#0071e3', backdropBlur: 12 });
    expect(css).toContain('backdrop-filter: blur(12px)');
  });

  it('overlay uses --zest-overlay variable (same color for all cases)', () => {
    const css = generateStyles({ accentColor: '#0071e3', backdropBlur: 8 });
    expect(css).toContain('background: var(--zest-overlay)');
    // No hardcoded rgba for overlay backgrounds
    expect(css).not.toMatch(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.[35]\)/);
  });

  it('blur applies to both modal overlay and banner wall', () => {
    const css = generateStyles({ accentColor: '#0071e3', backdropBlur: 8, hardWall: true });
    const matches = css.match(/backdrop-filter:\s*blur\(8px\)/g);
    // 2 for modal overlay (-webkit + standard) + 2 for banner wall = 4
    expect(matches).toHaveLength(4);
  });
});