import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activateEmbed,
  clearEmbedQueue,
  gateEmbed,
  getEmbedQueue,
  privacyRewriteUrl,
  restoreEmbedBlocking,
  setConsentChecker,
  setEmbedRenderer,
  startEmbedBlocking,
  syncEmbeds
} from '../src/core/embed-blocker.js';
import { emitEmbed, EVENTS } from '../src/storage/events.js';
import { activateEmbed as activateHeadlessEmbed } from '../src/headless.js';

class FakeIFrame {
  constructor(attrs = {}) {
    this.tagName = 'IFRAME';
    this.nodeType = 1;
    this.isConnected = true;
    this.parentNode = { insertBefore() {}, children: [] };
    this.attributes = new Map(Object.entries(attrs));
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

function installEnv() {
  globalThis.window = globalThis;
  globalThis.location = { href: 'https://example.com/page', hostname: 'example.com' };
  const listeners = {};
  globalThis.document = {
    querySelectorAll: () => [],
    documentElement: {},
    addEventListener: (name, cb) => {
      (listeners[name] = listeners[name] || []).push(cb);
    },
    dispatchEvent: (event) => {
      for (const cb of listeners[event.type] || []) cb(event);
      return true;
    }
  };
  globalThis.CustomEvent = class {
    constructor(type, opts = {}) {
      this.type = type;
      this.detail = opts.detail || {};
    }
  };
}

let observerCbs = [];
class FakeMutationObserver {
  constructor(cb) {
    this.cb = cb;
    observerCbs.push(this);
  }
  observe() {}
  disconnect() {}
}

function teardown() {
  delete globalThis.window;
  delete globalThis.location;
  delete globalThis.document;
  delete globalThis.CustomEvent;
  delete globalThis.MutationObserver;
  observerCbs = [];
  restoreEmbedBlocking();
  setConsentChecker(() => false);
  clearEmbedQueue();
}

beforeEach(() => {
  installEnv();
  globalThis.MutationObserver = FakeMutationObserver;
  setConsentChecker(() => false);
});

afterEach(teardown);

describe('embed categorization (gateEmbed)', () => {
  it('gates a static youtube embed in safe mode', () => {
    startEmbedBlocking('safe', [], [], true);
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc123' });
    expect(gateEmbed(f)).toBe(true);
    expect(f.getAttribute('data-zest-embed')).toBe('blocked');
    expect(f.getAttribute('src')).toBe('about:blank');
    expect(getEmbedQueue()[0].category).toBe('marketing');
  });

  it('skips same-origin iframes', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://example.com/own-frame' });
    expect(gateEmbed(f)).toBe(false);
    expect(f.getAttribute('data-zest-embed')).toBe('allowed');
  });

  it('honors data-zest-allow opt-out', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc', 'data-zest-allow': '' });
    expect(gateEmbed(f)).toBe(false);
    expect(f.getAttribute('data-zest-embed')).toBe('allowed');
  });

  it('skips srcdoc iframes (inline content, no URL to gate)', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ srcdoc: '<p>hi</p>' });
    expect(gateEmbed(f)).toBe(false);
  });

  it('manual mode gates only explicitly tagged embeds', () => {
    startEmbedBlocking('manual');
    const tagged = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc', 'data-consent-category': 'marketing' });
    expect(gateEmbed(tagged)).toBe(true);
    clearEmbedQueue();

    const untagged = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    expect(gateEmbed(untagged)).toBe(false);
  });

  it('ignores a third-party self-label as essential', () => {
    startEmbedBlocking('manual');
    const f = new FakeIFrame({ src: 'https://tracker.example/embed', 'data-consent-category': 'essential' });
    expect(gateEmbed(f)).toBe(false);
    expect(f.getAttribute('data-zest-embed')).toBe('allowed');
  });

  it('data-consent-src with no src never had a URL in the DOM', () => {
    startEmbedBlocking('manual');
    const f = new FakeIFrame({
      'data-consent-src': 'https://www.youtube.com/embed/abc',
      'data-consent-category': 'marketing'
    });
    expect(gateEmbed(f)).toBe(true);
    expect(f.getAttribute('src')).toBeNull();
  });

  it('data-consent-src defaults to marketing when the category is unresolvable', () => {
    startEmbedBlocking('manual');
    const f = new FakeIFrame({ 'data-consent-src': 'https://unknown.example/embed' });
    expect(gateEmbed(f)).toBe(true);
    expect(getEmbedQueue()[0].category).toBe('marketing');
  });

  it('doomsday gates any third-party iframe', () => {
    startEmbedBlocking('doomsday');
    const f = new FakeIFrame({ src: 'https://any-third.party/embed' });
    expect(gateEmbed(f)).toBe(true);
    expect(getEmbedQueue()[0].category).toBe('marketing');
  });

  it('does not gate allowed domains', () => {
    startEmbedBlocking('doomsday', [], ['trusted-cdn.example']);
    const f = new FakeIFrame({ src: 'https://cdn.trusted-cdn.example/embed' });
    expect(gateEmbed(f)).toBe(false);
  });

  it('does not double-gate an already-processed iframe', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    expect(gateEmbed(f)).toBe(false);
    expect(getEmbedQueue().length).toBe(1);
  });

  it('blockedDomains gates arbitrary unlisted domains, any mode', () => {
    startEmbedBlocking('manual', [{ domain: 'maps.example.com', category: 'functional' }, 'booking.widgets.example']);
    const a = new FakeIFrame({ src: 'https://maps.example.com/embed?x=1' });
    expect(gateEmbed(a)).toBe(true);
    expect(getEmbedQueue()[0].category).toBe('functional');

    const b = new FakeIFrame({ src: 'https://cdn.booking.widgets.example/cal' });
    expect(gateEmbed(b)).toBe(true);
    expect(getEmbedQueue()[1].category).toBe('marketing');

    const c = new FakeIFrame({ src: 'https://not-listed.example.org/x' });
    expect(gateEmbed(c)).toBe(false);
  });

  it('gates the default provider set (twitch, spotify, soundcloud, facebook, twitter)', () => {
    startEmbedBlocking('safe');
    const gated = [
      'https://player.twitch.tv/?channel=x&parent=localhost',
      'https://open.spotify.com/embed/track/abc',
      'https://w.soundcloud.com/player/?url=x',
      'https://www.facebook.com/plugins/video.php?href=x',
      'https://platform.twitter.com/embed/Tweet.html?id=x'
    ];
    for (const src of gated) {
      expect(gateEmbed(new FakeIFrame({ src }))).toBe(true);
    }
    // google maps is NOT in the provider list — stays free in safe mode
    expect(gateEmbed(new FakeIFrame({ src: 'https://www.google.com/maps/embed?pb=x' }))).toBe(false);
  });
});

describe('activation + privacy rewrite', () => {
  it('activates with youtube-nocookie.com rewrite', () => {
    startEmbedBlocking('safe', [], [], true);
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc123?start=30' });
    gateEmbed(f);
    syncEmbeds({ essential: true, functional: false, analytics: false, marketing: true });

    expect(f.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123?start=30');
    expect(f.getAttribute('data-zest-embed')).toBe('active');
  });

  it('respects privacyRewrite: false', () => {
    startEmbedBlocking('safe', [], [], false);
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc123' });
    gateEmbed(f);
    syncEmbeds({ essential: true, marketing: true });
    expect(f.getAttribute('src')).toBe('https://www.youtube.com/embed/abc123');
  });

  it('adds dnt=1 to vimeo embeds, preserves existing query', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://player.vimeo.com/video/76979871?title=0' });
    gateEmbed(f);
    syncEmbeds({ essential: true, marketing: true });
    expect(f.getAttribute('src')).toContain('dnt=1');
    expect(f.getAttribute('src')).toContain('title=0');
  });

  it('does not add dnt when already present', () => {
    expect(privacyRewriteUrl('https://player.vimeo.com/video/1?dnt=1'))
      .toBe('https://player.vimeo.com/video/1?dnt=1');
  });

  it('normalizes vimeo share URLs to the player host', () => {
    expect(privacyRewriteUrl('https://vimeo.com/981664125?fl=pl&fe=cm'))
      .toBe('https://player.vimeo.com/video/981664125?fl=pl&fe=cm&dnt=1');
  });

  it('leaves non-video vimeo paths alone', () => {
    expect(privacyRewriteUrl('https://vimeo.com/about'))
      .toBe('https://vimeo.com/about');
  });

  it('does not touch non-youtube/vimeo hosts', () => {
    expect(privacyRewriteUrl('https://maps.example.com/embed?x=1'))
      .toBe('https://maps.example.com/embed?x=1');
  });

  it('youtube.com watch pages are not rewritten (embed paths only)', () => {
    expect(privacyRewriteUrl('https://www.youtube.com/watch?v=abc'))
      .toBe('https://www.youtube.com/watch?v=abc');
  });

  it('activateEmbed loads one embed without consent mutation', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    const before = getEmbedQueue().length;
    expect(activateEmbed(f)).toBe(true);
    expect(f.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc');
    expect(getEmbedQueue().length).toBe(before);
  });

  it('headless named export activates by queue index', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    expect(activateHeadlessEmbed(0)).toBe(true);
    expect(f.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc');
  });

  it('activateEmbed returns false for non-gated iframes', () => {
    startEmbedBlocking('safe');
    expect(activateEmbed(new FakeIFrame())).toBe(false);
  });
});

describe('consent sync', () => {
  it('revocation re-blocks a previously activated embed', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    syncEmbeds({ essential: true, marketing: true });
    expect(f.getAttribute('data-zest-embed')).toBe('active');

    syncEmbeds({ essential: true, marketing: false });
    expect(f.getAttribute('src')).toBe('about:blank');
    expect(f.getAttribute('data-zest-embed')).toBe('blocked');
  });

  it('drops entries whose element is detached', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    f.isConnected = false;
    syncEmbeds({ essential: true, marketing: true });
    expect(getEmbedQueue().length).toBe(0);
  });

  it('a Load-once click does not persist across a later reject', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    activateEmbed(f);
    expect(f.getAttribute('data-zest-embed')).toBe('active');

    syncEmbeds({ essential: true, marketing: false });
    expect(f.getAttribute('src')).toBe('about:blank');
  });
});

describe('overlay renderer + events', () => {
  it('renders via the registered renderer and hides on activation', () => {
    const hide = vi.fn();
    const render = vi.fn(() => hide);
    setEmbedRenderer(render);

    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    expect(render).toHaveBeenCalledTimes(1);

    syncEmbeds({ essential: true, marketing: true });
    expect(hide).toHaveBeenCalled();
  });

  it('emits zest:embed events on block and activate', () => {
    const events = [];
    document.addEventListener(EVENTS.EMBED, (e) => events.push(e.detail));

    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    syncEmbeds({ essential: true, marketing: true });

    expect(events.map((d) => d.phase)).toEqual(['blocked', 'activated']);
    expect(events[0]).toMatchObject({ category: 'marketing', url: 'https://www.youtube.com/embed/abc' });
  });

  it('renderer throwing is non-fatal', () => {
    setEmbedRenderer(() => {
      throw new Error('boom');
    });
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    expect(gateEmbed(f)).toBe(true);
    expect(f.getAttribute('data-zest-embed')).toBe('blocked');
    setEmbedRenderer(null);
  });

  it('syncEmbeds backfills overlays registered after the initial scan', () => {
    startEmbedBlocking('safe'); // no renderer yet — embed blocked bare
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);

    const render = vi.fn(() => () => {});
    setEmbedRenderer(render);
    syncEmbeds({ essential: true, marketing: false });
    expect(render).toHaveBeenCalledTimes(1);

    // Second sync must not duplicate the overlay.
    syncEmbeds({ essential: true, marketing: false });
    expect(render).toHaveBeenCalledTimes(1);
  });
});

describe('queue bounds', () => {
  it('stops queueing past MAX_QUEUE_SIZE', () => {
    startEmbedBlocking('safe');
    for (let i = 0; i < 520; i++) {
      gateEmbed(new FakeIFrame({ src: 'https://www.youtube.com/embed/v' + i }));
    }
    expect(getEmbedQueue().length).toBeLessThanOrEqual(500);
  });
});

describe('scan + MutationObserver', () => {
  it('scanEmbeds gates existing iframes', () => {
    const iframes = [new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' })];
    document.querySelectorAll = () => iframes;
    startEmbedBlocking('safe');
    expect(getEmbedQueue().length).toBe(1);
    expect(iframes[0].getAttribute('data-zest-embed')).toBe('blocked');
  });

  it('observer gates late-injected iframes', () => {
    startEmbedBlocking('safe');
    const observer = observerCbs[0];
    const late = new FakeIFrame({ src: 'https://www.youtube.com/embed/late' });
    observer.cb([{ addedNodes: [late] }]);

    expect(getEmbedQueue().length).toBe(1);
    expect(late.getAttribute('data-zest-embed')).toBe('blocked');
  });

  it('a second start call rescans without duplicating', () => {
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    document.querySelectorAll = () => [f];
    startEmbedBlocking('safe');
    startEmbedBlocking('safe');
    expect(getEmbedQueue().length).toBe(1);
  });
});

describe('mergeConfig integration', () => {
  it('defaults privacyRewrite true, intercept.embeds true', async () => {
    const { mergeConfig } = await import('../src/config/defaults.js');
    const cfg = mergeConfig({ lang: 'en' });
    expect(cfg.privacyRewrite).toBe(true);
    expect(cfg.intercept.embeds).toBe(true);
    expect(cfg.labels.embed.load).toBe('Load content');
  });

  it('embed labels localize via lang', async () => {
    const { mergeConfig } = await import('../src/config/defaults.js');
    const cfg = mergeConfig({ lang: 'de' });
    expect(cfg.labels.embed.title).toBe('Externer Inhalt ist blockiert');
    expect(cfg.labels.embed.load).toBe('Inhalt laden');
  });
});

describe('headless parity', () => {
  it('EMBED event and emitEmbed are on the shared events surface', () => {
    expect(EVENTS.EMBED).toBe('zest:embed');
    expect(typeof emitEmbed).toBe('function');
  });
});

describe('attribute observer', () => {
  it('re-blanks and updates a blocked iframe when src changes', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/a' });
    gateEmbed(f);
    f.setAttribute('src', 'https://www.youtube.com/embed/b');
    observerCbs[0].cb([{ type: 'attributes', attributeName: 'src', target: f }]);
    expect(f.getAttribute('src')).toBe('about:blank');
    expect(getEmbedQueue()[0].url).toBe('https://www.youtube.com/embed/b');
    activateEmbed(f);
    expect(f.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/b');
  });

  it('updates a blocked embed when data-consent-src changes', () => {
    startEmbedBlocking('manual');
    const f = new FakeIFrame({ 'data-consent-src': 'https://example.net/a' });
    gateEmbed(f);
    f.setAttribute('data-consent-src', 'https://example.net/b');
    observerCbs[0].cb([{ type: 'attributes', attributeName: 'data-consent-src', target: f }]);
    expect(getEmbedQueue()[0].url).toBe('https://example.net/b');
    activateEmbed(f);
    expect(f.getAttribute('src')).toBe('https://example.net/b');
  });

  it('gates a src injected after insertion (attributes mutation)', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame();
    gateEmbed(f);
    expect(f.hasAttribute('data-zest-embed')).toBe(false);

    const observer = observerCbs[0];
    f.setAttribute('src', 'https://www.youtube.com/embed/late-src');
    observer.cb([{ type: 'attributes', target: f }]);

    expect(getEmbedQueue().length).toBe(1);
    expect(f.getAttribute('data-zest-embed')).toBe('blocked');
    expect(f.getAttribute('src')).toBe('about:blank');
  });

  it('gates a data-consent-src arriving after insertion', () => {
    startEmbedBlocking('manual');
    const f = new FakeIFrame();
    gateEmbed(f);

    const observer = observerCbs[0];
    f.setAttribute('data-consent-src', 'https://www.youtube.com/embed/abc');
    f.setAttribute('data-consent-category', 'marketing');
    observer.cb([{ type: 'attributes', target: f }]);

    expect(getEmbedQueue().length).toBe(1);
    expect(f.getAttribute('src')).toBeNull();
  });

  it('writes src immediately when consent already granted (data-consent-src)', () => {
    setConsentChecker(() => true);
    startEmbedBlocking('safe', [], [], true);
    const f = new FakeIFrame({
      'data-consent-src': 'https://www.youtube.com/embed/abc',
      'data-consent-category': 'marketing'
    });
    gateEmbed(f);
    expect(f.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc');
    expect(f.getAttribute('data-zest-embed')).toBe('active');
  });

  it('re-gates an allowed-stamped iframe when its src swaps to a provider', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://example.com/placeholder' });
    gateEmbed(f);
    expect(f.getAttribute('data-zest-embed')).toBe('allowed');

    const observer = observerCbs[0];
    f.setAttribute('src', 'https://www.youtube.com/embed/swapped');
    observer.cb([{ type: 'attributes', target: f }]);

    expect(f.getAttribute('src')).toBe('about:blank');
    expect(f.getAttribute('data-zest-embed')).toBe('blocked');
  });

  it('stamps active without rewriting a pre-consented lazy src (already fetched)', () => {
    setConsentChecker(() => true);
    startEmbedBlocking('safe', [], [], true);
    const f = new FakeIFrame();
    gateEmbed(f);

    const observer = observerCbs[0];
    f.setAttribute('src', 'https://www.youtube.com/embed/lazy');
    observer.cb([{ type: 'attributes', target: f }]);

    // No rewrite: the browser already fetched the URL — rewriting would
    // only cause a reload flash without any privacy gain.
    expect(f.getAttribute('src')).toBe('https://www.youtube.com/embed/lazy');
    expect(f.getAttribute('data-zest-embed')).toBe('active');
  });
});

describe('reset re-gating', () => {
  it('syncEmbeds with a fresh consent state re-blocks activated embeds', () => {
    startEmbedBlocking('safe');
    const f = new FakeIFrame({ src: 'https://www.youtube.com/embed/abc' });
    gateEmbed(f);
    syncEmbeds({ essential: true, marketing: true });
    expect(f.getAttribute('data-zest-embed')).toBe('active');

    // What coreReset() feeds syncEmbeds: the default consent after a full reset.
    syncEmbeds({ essential: true, functional: false, analytics: false, marketing: false });
    expect(f.getAttribute('src')).toBe('about:blank');
    expect(f.getAttribute('data-zest-embed')).toBe('blocked');
  });
});