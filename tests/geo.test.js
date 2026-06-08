import { describe, it, expect } from 'vitest';
import {
  sanitizeVerdict,
  normalizeAction,
  defaultDecide,
  resolveGeoAction,
  GEO_ACTIONS,
  GEO_GATEWAY_URL
} from '../src/core/geo.js';

describe('sanitizeVerdict', () => {
  it('coerces the gateway /privacy shape to trusted booleans + regulations', () => {
    const v = sanitizeVerdict({
      isEU: true, isEEA: true, isGDPR: true, isCCPA: false,
      isUSPrivacy: false, regulations: ['GDPR']
    });
    expect(v).toEqual({
      isEU: true, isEEA: true, isGDPR: true, isCCPA: false,
      isUSPrivacy: false, regulations: ['GDPR']
    });
  });

  it('treats any non-true value as false (no truthiness leaks)', () => {
    const v = sanitizeVerdict({ isGDPR: 'yes', isUSPrivacy: 1, isEU: {} });
    expect(v.isGDPR).toBe(false);
    expect(v.isUSPrivacy).toBe(false);
    expect(v.isEU).toBe(false);
  });

  it('drops non-string / oversized / excess regulations', () => {
    const v = sanitizeVerdict({
      regulations: ['CCPA', 42, null, 'x'.repeat(41), 'CPRA', ...Array(50).fill('Z')]
    });
    expect(v.regulations).toContain('CCPA');
    expect(v.regulations).toContain('CPRA');
    expect(v.regulations).not.toContain(42);
    expect(v.regulations.length).toBeLessThanOrEqual(20);
    expect(v.regulations.every((r) => typeof r === 'string' && r.length <= 40)).toBe(true);
  });

  it('keeps short context fields, ignores oversized ones', () => {
    const v = sanitizeVerdict({ country: 'US', regionCode: 'CA', continent: 'NA', city: 'should-be-dropped' });
    expect(v.country).toBe('US');
    expect(v.regionCode).toBe('CA');
    expect(v.continent).toBe('NA');
    expect(v.city).toBeUndefined();
  });

  it('rejects non-objects and arrays', () => {
    expect(sanitizeVerdict(null)).toBeNull();
    expect(sanitizeVerdict('US')).toBeNull();
    expect(sanitizeVerdict(['GDPR'])).toBeNull();
  });
});

describe('normalizeAction', () => {
  it('passes through known actions', () => {
    for (const a of GEO_ACTIONS) expect(normalizeAction(a)).toBe(a);
  });

  it('falls back for unknown actions (default consent)', () => {
    expect(normalizeAction('whatever')).toBe('consent');
    expect(normalizeAction(undefined)).toBe('consent');
    expect(normalizeAction('whatever', 'allow')).toBe('allow');
  });

  it('guards against a bogus fallback', () => {
    expect(normalizeAction('nope', 'also-nope')).toBe('consent');
  });
});

describe('defaultDecide', () => {
  it('GDPR -> consent (opt-in banner)', () => {
    expect(defaultDecide({ isGDPR: true, isUSPrivacy: false })).toBe('consent');
  });

  it('US privacy (no GDPR) -> notice (opt-out)', () => {
    expect(defaultDecide({ isGDPR: false, isUSPrivacy: true })).toBe('notice');
  });

  it('everywhere else -> allow', () => {
    expect(defaultDecide({ isGDPR: false, isUSPrivacy: false })).toBe('allow');
  });

  it('GDPR wins when both flags are set', () => {
    expect(defaultDecide({ isGDPR: true, isUSPrivacy: true })).toBe('consent');
  });
});

describe('resolveGeoAction', () => {
  it('uses a consumer resolver and the default decide', async () => {
    const geo = {
      resolver: async () => ({ isGDPR: true, isUSPrivacy: false, regulations: ['GDPR'] }),
      timeout: 1500,
      fallback: 'consent'
    };
    const res = await resolveGeoAction(geo);
    expect(res.action).toBe('consent');
    expect(res.verdict.isGDPR).toBe(true);
  });

  it('honors a custom decide()', async () => {
    const geo = {
      resolver: async () => ({ isGDPR: false, isUSPrivacy: true }),
      decide: (v) => (v.isUSPrivacy ? 'block' : 'allow'),
      timeout: 1500,
      fallback: 'consent'
    };
    const res = await resolveGeoAction(geo);
    expect(res.action).toBe('block');
  });

  it('falls back (closed) when the resolver throws', async () => {
    const geo = {
      resolver: async () => { throw new Error('edge unreachable'); },
      timeout: 1500,
      fallback: 'consent'
    };
    const res = await resolveGeoAction(geo);
    expect(res.action).toBe('consent');
    expect(res.verdict).toBeNull();
  });

  it('clamps an out-of-vocabulary decide() return to the fallback', async () => {
    const geo = {
      resolver: async () => ({ isGDPR: false, isUSPrivacy: false }),
      decide: () => 'launch-the-missiles',
      fallback: 'allow'
    };
    const res = await resolveGeoAction(geo);
    expect(res.action).toBe('allow');
  });
});

describe('module surface', () => {
  it('exposes the hosted gateway /privacy endpoint', () => {
    expect(GEO_GATEWAY_URL).toBe('https://geo.cookiezest.com/privacy');
  });
});
