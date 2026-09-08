import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../src/config/defaults.js';

// Documented since v2.4: data-mode on the script tag must set the blocking mode.
// The parser reads attributes off document.currentScript; mergeConfig normalizes.

// parseDataAttributes reads the zest script tag; verify the merged outcome the
// way a consumer sees it — through mergeConfig, the single funnel for mode.

describe('mode normalization (mergeConfig)', () => {
  it.each(['manual', 'safe', 'strict', 'doomsday'])('accepts %s', (mode) => {
    expect(mergeConfig({ lang: 'en', mode }).mode).toBe(mode);
  });

  it('case-insensitive and trims whitespace', () => {
    expect(mergeConfig({ lang: 'en', mode: ' Doomsday ' }).mode).toBe('doomsday');
  });

  it('unknown values fall back to safe', () => {
    expect(mergeConfig({ lang: 'en', mode: 'aggressive' }).mode).toBe('safe');
    expect(mergeConfig({ lang: 'en', mode: 42 }).mode).toBe('safe');
  });

  it('defaults to safe when omitted', () => {
    expect(mergeConfig({ lang: 'en' }).mode).toBe('safe');
  });
});