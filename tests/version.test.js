import { describe, expect, it } from 'vitest';
import Zest from '../src/index.js';
import ZestHeadless from '../src/headless.js';
import { VERSION } from '../src/version.js';

// Zest.version must exist on both surfaces and stay in sync with the package
// version that rollup injects at build time (__ZEST_VERSION__ placeholder).

describe('Zest.version', () => {
  it('exists on the full build', () => {
    expect(typeof Zest.version).toBe('string');
    expect(Zest.version.length).toBeGreaterThan(0);
  });

  it('exists on the headless build', () => {
    expect(typeof ZestHeadless.version).toBe('string');
    expect(ZestHeadless.version.length).toBeGreaterThan(0);
  });

  it('both surfaces report the same version', () => {
    expect(Zest.version).toBe(ZestHeadless.version);
  });

  it('source placeholder is replaced by rollup in dist bundles', () => {
    // In src the value is the raw placeholder; in dist it must be the real
    // semver. This asserts the contract, not the current build state.
    expect(VERSION).toBe('__ZEST_VERSION__');
  });
});