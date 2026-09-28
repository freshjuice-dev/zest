import { describe, it, expect } from 'vitest';
import { getCategoryForScript } from '../src/core/known-trackers.js';

// Clarity moved from strict-only to the safe-mode blocklist:
// session-replay is as privacy-invasive as GA4, which safe already blocks.

describe('clarity blocking', () => {
  it('clarity.ms blocked in safe mode (analytics)', () => {
    expect(getCategoryForScript('https://www.clarity.ms/tag/xyz', 'safe')).toBe('analytics');
  });

  it('still blocked in strict mode', () => {
    expect(getCategoryForScript('https://www.clarity.ms/tag/xyz', 'strict')).toBe('analytics');
  });

  it('subdomain variants covered (c.clarity.ms)', () => {
    expect(getCategoryForScript('https://c.clarity.ms/tag/xyz', 'safe')).toBe('analytics');
  });
});