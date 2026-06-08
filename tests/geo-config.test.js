import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../src/config/defaults.js';

// Explicit `lang` keeps detectLanguage() from touching `document` / navigator,
// so mergeConfig runs cleanly in the node test environment.
const base = { lang: 'en' };

describe('geo config normalization', () => {
  it('geo: true -> hosted gateway shorthand', () => {
    const cfg = mergeConfig({ ...base, geo: true });
    expect(cfg.geo).toEqual({ provider: 'gateway', timeout: 1500, fallback: 'consent' });
  });

  it('empty geo: {} also defaults to the gateway', () => {
    const cfg = mergeConfig({ ...base, geo: {} });
    expect(cfg.geo.provider).toBe('gateway');
  });

  it('omitting geo leaves it off (null)', () => {
    const cfg = mergeConfig({ ...base });
    expect(cfg.geo).toBeNull();
  });

  it('falsy / invalid geo values disable it', () => {
    expect(mergeConfig({ ...base, geo: false }).geo).toBeNull();
    expect(mergeConfig({ ...base, geo: 'on' }).geo).toBeNull();
    expect(mergeConfig({ ...base, geo: [] }).geo).toBeNull();
  });

  it('validates endpoint via safeUrl (rejects non-http(s))', () => {
    expect(mergeConfig({ ...base, geo: { endpoint: 'javascript:alert(1)' } }).geo.endpoint).toBeUndefined();
    expect(mergeConfig({ ...base, geo: { endpoint: 'https://geo.example.com/privacy' } }).geo.endpoint)
      .toBe('https://geo.example.com/privacy');
  });

  it('clamps timeout and validates fallback', () => {
    const tooLow = mergeConfig({ ...base, geo: { provider: 'gateway', timeout: 5, fallback: 'nope' } }).geo;
    expect(tooLow.timeout).toBe(1500);
    expect(tooLow.fallback).toBe('consent');

    const ok = mergeConfig({ ...base, geo: { provider: 'gateway', timeout: 800, fallback: 'allow' } }).geo;
    expect(ok.timeout).toBe(800);
    expect(ok.fallback).toBe('allow');
  });

  it('keeps resolver / decide functions', () => {
    const resolver = async () => ({ isGDPR: true });
    const decide = () => 'consent';
    const cfg = mergeConfig({ ...base, geo: { resolver, decide } });
    expect(cfg.geo.resolver).toBe(resolver);
    expect(cfg.geo.decide).toBe(decide);
  });
});
