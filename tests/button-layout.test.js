import { describe, it, expect } from 'vitest';
import { generateStyles } from '../src/ui/styles.js';
import { mergeConfig, normalizeButtonLayout } from '../src/config/defaults.js';

const base = { lang: 'en' };

describe('normalizeButtonLayout', () => {
  it('passes row/split through', () => {
    expect(normalizeButtonLayout('row')).toBe('row');
    expect(normalizeButtonLayout('split')).toBe('split');
  });

  it('case-insensitive', () => {
    expect(normalizeButtonLayout('SPLIT')).toBe('split');
    expect(normalizeButtonLayout('Row')).toBe('row');
  });

  it('trims whitespace', () => {
    expect(normalizeButtonLayout('  split  ')).toBe('split');
  });

  it('falls back to row for unknown values', () => {
    expect(normalizeButtonLayout('nonsense')).toBe('row');
    expect(normalizeButtonLayout(42)).toBe('row');
    expect(normalizeButtonLayout(null)).toBe('row');
  });
});

describe('buttonLayout config', () => {
  it('defaults to row', () => {
    expect(mergeConfig(base).buttonLayout).toBe('row');
  });

  it('preserves split from user config', () => {
    expect(mergeConfig({ ...base, buttonLayout: 'split' }).buttonLayout).toBe('split');
  });

  it('normalizes unknown values to row', () => {
    expect(mergeConfig({ ...base, buttonLayout: 'garbage' }).buttonLayout).toBe('row');
  });
});

describe('buttonLayout styles', () => {
  it('split layout classes present in CSS', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toContain('.zest-banner__buttons--split');
    expect(css).toContain('.zest-modal__footer--split');
    expect(css).toContain('.zest-banner__buttons-group');
    expect(css).toContain('.zest-modal__buttons-group');
  });

  it('split uses justify-content: space-between', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toMatch(/\.zest-banner__buttons--split[^}]*justify-content:\s*space-between/);
  });

  it('button groups use flex with gap', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    expect(css).toMatch(/\.zest-banner__buttons-group[^}]*display:\s*flex/);
    expect(css).toMatch(/\.zest-banner__buttons-group[^}]*gap:\s*8px/);
  });

  it('mobile breakpoint stacks split layout vertically', () => {
    const css = generateStyles({ accentColor: '#0071e3' });
    // On mobile, split layout should switch to column direction
    expect(css).toMatch(/\.zest-banner__buttons--split[^}]*flex-direction:\s*column/);
    expect(css).toMatch(/\.zest-modal__footer--split[^}]*flex-direction:\s*column/);
  });
});