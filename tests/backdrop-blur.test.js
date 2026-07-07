import { describe, it, expect } from 'vitest';
import { generateStyles } from '../src/ui/styles.js';
import { mergeConfig } from '../src/config/defaults.js';

const base = { lang: 'en' };

describe('backdropBlur config', () => {
  it('defaults to false', () => {
    expect(mergeConfig(base).backdropBlur).toBe(false);
  });

  it('preserves true from user config', () => {
    expect(mergeConfig({ ...base, backdropBlur: true }).backdropBlur).toBe(true);
  });

  it('preserves false from user config', () => {
    expect(mergeConfig({ ...base, backdropBlur: false }).backdropBlur).toBe(false);
  });
});

describe('backdropBlur styles', () => {
  it('no backdrop-filter when backdropBlur is false (default)', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).not.toContain('backdrop-filter');
    expect(css).not.toContain('-webkit-backdrop-filter');
  });

  it('adds backdrop-filter when backdropBlur is true', () => {
    const css = generateStyles({ accentColor: '#0071e3', backdropBlur: true });
    expect(css).toContain('backdrop-filter: blur(8px)');
    expect(css).toContain('-webkit-backdrop-filter: blur(8px)');
  });

  it('reduces overlay opacity when blur is on', () => {
    const cssBlur = generateStyles({ accentColor: '#0071e3', backdropBlur: true });
    const cssNoBlur = generateStyles({ accentColor: '#0071e3' });
    // With blur the overlay background is lighter (0.3 vs 0.5)
    expect(cssBlur).toContain('rgba(0, 0, 0, 0.3)');
    expect(cssNoBlur).toContain('rgba(0, 0, 0, 0.5)');
  });

  it('blur block appears for both modal overlay and banner wall', () => {
    const css = generateStyles({ accentColor: '#0071e3', backdropBlur: true });
    const matches = css.match(/backdrop-filter:\s*blur\(8px\)/g);
    // 2 for modal overlay (-webkit + standard) + 2 for banner wall = 4
    expect(matches).toHaveLength(4);
  });
});