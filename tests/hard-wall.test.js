import { describe, it, expect } from 'vitest';
import { generateStyles } from '../src/ui/styles.js';
import { mergeConfig } from '../src/config/defaults.js';

const base = { lang: 'en' };

describe('hardWall config', () => {
  it('defaults to false', () => {
    expect(mergeConfig(base).hardWall).toBe(false);
  });

  it('preserves true from user config', () => {
    expect(mergeConfig({ ...base, hardWall: true }).hardWall).toBe(true);
  });
});

describe('hardWall styles', () => {
  it('wall CSS class is always present (harmless without the element)', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toContain('.zest-banner-wall');
  });

  it('wall styles present when hardWall is true', () => {
    const css = generateStyles({ accentColor: '#0071e3', hardWall: true });
    expect(css).toContain('.zest-banner-wall');
    expect(css).toMatch(/\.zest-banner-wall\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.zest-banner-wall\s*\{[^}]*inset:\s*0/);
    expect(css).toMatch(/\.zest-banner-wall\s*\{[^}]*z-index:\s*999998/);
  });

  it('wall z-index is below banner z-index', () => {
    const css = generateStyles({ accentColor: '#0071e3', hardWall: true });
    const wallMatch = css.match(/\.zest-banner-wall\s*\{[^}]*z-index:\s*(\d+)/);
    const bannerMatch = css.match(/\.zest-banner\s*\{[^}]*z-index:\s*(\d+)/);
    expect(wallMatch).toBeTruthy();
    expect(bannerMatch).toBeTruthy();
    expect(parseInt(wallMatch[1])).toBeLessThan(parseInt(bannerMatch[1]));
  });

  it('wall uses --zest-overlay variable for background', () => {
    const css = generateStyles({ accentColor: '#0071e3', hardWall: true });
    expect(css).toMatch(/\.zest-banner-wall\s*\{[^}]*background:\s*var\(--zest-overlay\)/);
  });

  it('wall has fade-in animation', () => {
    const css = generateStyles({ accentColor: '#0071e3', hardWall: true });
    expect(css).toMatch(/\.zest-banner-wall\s*\{[^}]*animation:\s*zest-fade-in/);
  });

  it('backdropBlur applies blur to wall when both are on', () => {
    const css = generateStyles({ accentColor: '#0071e3', hardWall: true, backdropBlur: 8 });
    expect(css).toMatch(/\.zest-banner-wall\s*\{[^}]*backdrop-filter:\s*blur\(8px\)/);
  });
});