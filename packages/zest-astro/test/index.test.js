import { describe, it, expect } from 'vitest';
import zestAstro, {
  safeStringify,
  loadZestBundle,
  buildInlineScript
} from '../src/index.js';

describe('safeStringify', () => {
  it('escapes </script> so JSON cannot terminate the host script tag', () => {
    const out = safeStringify({ html: '</script><script>alert(1)</script>' });
    expect(out).not.toMatch(/<\/script>/i);
    expect(out).toContain('\\u003C/script\\u003E');
  });

  it('escapes U+2028 / U+2029 line terminators', () => {
    const out = safeStringify({ x: '  ' });
    expect(out).toBe('{"x":"\\u2028\\u2029"}');
    expect(out).not.toMatch(/[\u2028\u2029]/);
  });

  it('escapes ampersand to dodge HTML-entity confusion', () => {
    const out = safeStringify({ q: 'a&b' });
    expect(out).toContain('\\u0026');
  });
});

describe('loadZestBundle', () => {
  it('returns the full multilang bundle by default', () => {
    const bundle = loadZestBundle('all');
    expect(bundle.length).toBeGreaterThan(10000);
    expect(bundle).toMatch(/Zest/);
  });

  it('returns a per-language bundle when requested', () => {
    const en = loadZestBundle('en');
    const de = loadZestBundle('de');
    expect(en.length).toBeGreaterThan(10000);
    expect(de.length).toBeGreaterThan(10000);
    // Per-lang bundles should differ from the full one.
    const full = loadZestBundle('all');
    expect(en).not.toBe(full);
  });

  it('throws on unsupported languages', () => {
    expect(() => loadZestBundle('klingon')).toThrow(/Unsupported language/);
  });
});

describe('buildInlineScript', () => {
  it('prefixes window.ZestConfig assignment when config is provided', () => {
    const out = buildInlineScript({
      config: { theme: 'dark', policyUrl: '/p' },
      bundle: '/*BUNDLE*/'
    });
    expect(out).toMatch(/^window\.ZestConfig=/);
    expect(out).toContain('"theme":"dark"');
    expect(out).toContain('/*BUNDLE*/');
    // Config line precedes the bundle.
    expect(out.indexOf('ZestConfig')).toBeLessThan(out.indexOf('/*BUNDLE*/'));
  });

  it('omits config line when no config is given', () => {
    const out = buildInlineScript({ bundle: '/*BUNDLE*/' });
    expect(out).not.toContain('ZestConfig');
    expect(out.trim()).toBe('/*BUNDLE*/');
  });
});

describe('zestAstro integration factory', () => {
  it('returns an Astro integration with the head-inline hook', () => {
    const integ = zestAstro({ language: 'en' });
    expect(integ.name).toBe('@freshjuice/zest-astro');
    expect(integ.hooks).toHaveProperty('astro:config:setup');
    expect(typeof integ.hooks['astro:config:setup']).toBe('function');
  });

  it('injects head-inline script via the setup hook', () => {
    const injected = [];
    const logger = { info: () => {}, error: () => {} };
    const integ = zestAstro({
      language: 'en',
      config: { theme: 'dark' }
    });
    integ.hooks['astro:config:setup']({
      command: 'build',
      injectScript: (stage, code) => injected.push({ stage, code }),
      logger
    });
    expect(injected).toHaveLength(1);
    expect(injected[0].stage).toBe('head-inline');
    expect(injected[0].code).toMatch(/^window\.ZestConfig=/);
    expect(injected[0].code.length).toBeGreaterThan(10000);
  });

  it('skips injection when enabled=false', () => {
    const injected = [];
    const integ = zestAstro({ enabled: false });
    integ.hooks['astro:config:setup']({
      command: 'build',
      injectScript: (stage, code) => injected.push({ stage, code }),
      logger: { info: () => {} }
    });
    expect(injected).toHaveLength(0);
  });

  it('skips dev injection when devMode=false', () => {
    const injected = [];
    const integ = zestAstro({ devMode: false });
    integ.hooks['astro:config:setup']({
      command: 'dev',
      injectScript: (stage, code) => injected.push({ stage, code }),
      logger: { info: () => {} }
    });
    expect(injected).toHaveLength(0);
  });

  it('still injects in build even when devMode=false', () => {
    const injected = [];
    const integ = zestAstro({ devMode: false, language: 'en' });
    integ.hooks['astro:config:setup']({
      command: 'build',
      injectScript: (stage, code) => injected.push({ stage, code }),
      logger: { info: () => {} }
    });
    expect(injected).toHaveLength(1);
  });
});
