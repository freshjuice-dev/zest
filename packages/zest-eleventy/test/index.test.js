import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../src/core.cjs');
const {
  register,
  safeStringify,
  loadZestBundle,
  buildScriptTag
} = core;

function makeMockEleventy() {
  const calls = { shortcodes: {}, transforms: {} };
  return {
    calls,
    addShortcode(name, fn) {
      calls.shortcodes[name] = fn;
    },
    addTransform(name, fn) {
      calls.transforms[name] = fn;
    }
  };
}

describe('safeStringify', () => {
  it('escapes </script>, &, U+2028, U+2029', () => {
    expect(safeStringify({ x: '</script>' })).toContain('\\u003C/script\\u003E');
    expect(safeStringify({ x: 'a&b' })).toContain('\\u0026');
    expect(safeStringify({ x: '  ' })).toBe('{"x":"\\u2028\\u2029"}');
  });
});

describe('loadZestBundle', () => {
  it('returns multilang bundle', () => {
    const bundle = loadZestBundle('all');
    expect(bundle.length).toBeGreaterThan(10000);
  });
  it('returns per-language bundle', () => {
    const bundle = loadZestBundle('en');
    expect(bundle.length).toBeGreaterThan(10000);
  });
  it('throws on unsupported language', () => {
    expect(() => loadZestBundle('klingon')).toThrow(/Unsupported language/);
  });
});

describe('buildScriptTag', () => {
  it('wraps body in a <script> with the zest-consent id', () => {
    const out = buildScriptTag({
      config: { theme: 'dark' },
      bundle: '/*BUNDLE*/'
    });
    expect(out.startsWith('<script id="zest-consent">')).toBe(true);
    expect(out.endsWith('</script>')).toBe(true);
    expect(out).toContain('"theme":"dark"');
    expect(out).toContain('/*BUNDLE*/');
  });
});

describe('register', () => {
  it('registers the {% zest %} shortcode and the auto-inject transform', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en' });
    expect(ec.calls.shortcodes).toHaveProperty('zest');
    expect(ec.calls.transforms).toHaveProperty('zest-inject');
  });

  it('honours custom shortcode name', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en', shortcode: 'consent' });
    expect(ec.calls.shortcodes).toHaveProperty('consent');
    expect(ec.calls.shortcodes).not.toHaveProperty('zest');
  });

  it('skips shortcode when shortcode option is false', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en', shortcode: false });
    expect(Object.keys(ec.calls.shortcodes)).toHaveLength(0);
    expect(ec.calls.transforms).toHaveProperty('zest-inject');
  });

  it('skips transform when autoInject is false', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en', autoInject: false });
    expect(ec.calls.shortcodes).toHaveProperty('zest');
    expect(Object.keys(ec.calls.transforms)).toHaveLength(0);
  });

  it('registers nothing when enabled is false', () => {
    const ec = makeMockEleventy();
    register(ec, { enabled: false });
    expect(Object.keys(ec.calls.shortcodes)).toHaveLength(0);
    expect(Object.keys(ec.calls.transforms)).toHaveLength(0);
  });
});

describe('auto-inject transform', () => {
  it('injects the script just before </head> in .html output', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en' });
    const html = '<!doctype html><html><head><title>x</title></head><body>hi</body></html>';
    const out = ec.calls.transforms['zest-inject'].call(
      { outputPath: '/dist/index.html' },
      html,
      '/dist/index.html'
    );
    expect(out).toContain('id="zest-consent"');
    expect(out.indexOf('id="zest-consent"')).toBeLessThan(out.indexOf('</head>'));
  });

  it('passes through non-html files untouched', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en' });
    const xml = '<root/>';
    const out = ec.calls.transforms['zest-inject'].call(
      { outputPath: '/dist/sitemap.xml' },
      xml,
      '/dist/sitemap.xml'
    );
    expect(out).toBe(xml);
  });

  it('does not double-inject when the shortcode already placed it', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en' });
    const html =
      '<!doctype html><html><head><script id="zest-consent">/*manual*/</script></head><body/></html>';
    const out = ec.calls.transforms['zest-inject'].call(
      { outputPath: '/dist/index.html' },
      html,
      '/dist/index.html'
    );
    expect(out).toBe(html);
  });

  it('returns content unchanged if there is no </head>', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en' });
    const html = '<body>no head</body>';
    const out = ec.calls.transforms['zest-inject'].call(
      { outputPath: '/dist/index.html' },
      html,
      '/dist/index.html'
    );
    expect(out).toBe(html);
  });

  it('handles outputPath passed via this when Eleventy omits the arg', () => {
    const ec = makeMockEleventy();
    register(ec, { language: 'en' });
    const html = '<html><head></head></html>';
    const out = ec.calls.transforms['zest-inject'].call(
      { outputPath: '/dist/index.html' },
      html
    );
    expect(out).toContain('id="zest-consent"');
  });
});
