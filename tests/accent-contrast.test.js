import { describe, it, expect } from 'vitest';
import { generateStyles } from '../src/ui/styles.js';

describe('--zest-accent-text hybrid (JS fallback + @supports)', () => {
  function getAccentTextLine(css) {
    const m = css.match(/--zest-accent-text:\s*([^;]+);/);
    return m ? m[1].trim() : null;
  }

  it('exposes --zest-accent-text custom property', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toContain('--zest-accent-text:');
  });

  it('JS fallback computes white for dark accent (blue #0071e3)', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(getAccentTextLine(css)).toBe('#ffffff');
  });

  it('JS fallback computes dark text for light accent (yellow #FFD60A)', () => {
    const css = generateStyles({ accentColor: '#FFD60A' });
    expect(getAccentTextLine(css)).toBe('#1f2937');
  });

  it('JS fallback computes dark text for white (#ffffff)', () => {
    const css = generateStyles({ accentColor: '#ffffff' });
    expect(getAccentTextLine(css)).toBe('#1f2937');
  });

  it('JS fallback computes white for black (#000000)', () => {
    const css = generateStyles({ accentColor: '#000000' });
    expect(getAccentTextLine(css)).toBe('#ffffff');
  });

  it('JS fallback computes white for purple (#7c3aed)', () => {
    const css = generateStyles({ accentColor: '#7c3aed' });
    expect(getAccentTextLine(css)).toBe('#ffffff');
  });

  it('JS fallback computes dark text for light gray (#cccccc)', () => {
    const css = generateStyles({ accentColor: '#cccccc' });
    expect(getAccentTextLine(css)).toBe('#1f2937');
  });

  it('invalid color falls back to white', () => {
    const css = generateStyles({ accentColor: 'not-a-color' });
    expect(getAccentTextLine(css)).toBe('#ffffff');
  });

  it('3-digit hex expands correctly (#f80 -> orange -> dark text)', () => {
    const css = generateStyles({ accentColor: '#f80' });
    expect(getAccentTextLine(css)).toBe('#1f2937');
  });

  it('8-digit hex strips alpha and computes contrast', () => {
    const css = generateStyles({ accentColor: '#0071e3ff' });
    expect(getAccentTextLine(css)).toBe('#ffffff');
  });

  it('@supports block overrides with native contrast-color()', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toContain('@supports (color: contrast-color(red))');
    expect(css).toMatch(/@supports[^}]*--zest-accent-text:\s*contrast-color\(var\(--zest-accent\)\)/s);
  });

  it('fill buttons use var(--zest-accent-text), not hardcoded #ffffff', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toContain('color: var(--zest-accent-text)');
    expect(css).not.toMatch(/color: #ffffff;\s*\n\s*border: 1px solid var\(--zest-accent\)/);
  });

  it('default (no buttonStyle) also uses --zest-accent-text', () => {
    const css = generateStyles({});
    expect(css).toContain('color: var(--zest-accent-text)');
  });

  it('outline buttons keep --zest-accent (not accent-text)', () => {
    const css = generateStyles({ accentColor: '#0071e3', buttonStyle: 'outline' });
    expect(css).toContain('color: var(--zest-accent);\n  border: 2px solid');
  });
});