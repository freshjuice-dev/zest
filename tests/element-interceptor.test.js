import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearElementQueue,
  getElementQueue,
  interceptElements,
  replayElements,
  restoreElements,
  setConsentChecker,
  setBlockedEmbedWriteHandler
} from '../src/core/element-interceptor.js';
import { activateEmbed, getEmbedQueue, restoreEmbedBlocking, startEmbedBlocking } from '../src/core/embed-blocker.js';

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.isConnected = true;
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    const normalized = String(value);
    this.attributes.set(name, normalized);
    if (name === 'src') {
      this._src = normalized;
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeImageElement extends FakeElement {
  constructor() {
    super('img');
    this._src = '';
  }

  get src() {
    return this._src;
  }

  set src(value) {
    const normalized = String(value);
    this._src = normalized;
    this.attributes.set('src', normalized);
  }
}

class FakeIFrameElement extends FakeImageElement {
  constructor() {
    super();
    this.tagName = 'IFRAME';
  }
  get src() { return super.src; }
  set src(value) { super.src = value; }
  hasAttribute(name) { return this.attributes.has(name); }
}

function installFakeDom() {
  globalThis.window = globalThis;
  globalThis.location = { href: 'https://example.com/page' };
  globalThis.Element = FakeElement;
  globalThis.HTMLImageElement = FakeImageElement;
  globalThis.HTMLIFrameElement = FakeIFrameElement;
  globalThis.Image = FakeImageElement;
  globalThis.document = {
    querySelectorAll: () => [],
    documentElement: {},
    dispatchEvent: () => true
  };
  globalThis.CustomEvent = class {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  };
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
}

function teardownFakeDom() {
  delete globalThis.document;
  delete globalThis.CustomEvent;
  delete globalThis.MutationObserver;
  delete globalThis.Image;
  delete globalThis.HTMLIFrameElement;
  delete globalThis.HTMLImageElement;
  delete globalThis.Element;
  delete globalThis.location;
  delete globalThis.window;
}

describe('element interceptor image coverage', () => {
  const blockedUrl = 'https://bat.bing.com/action/0?ti=1234&tm=gtm';
  const blockedDomains = [{ domain: 'bat.bing.com', category: 'marketing' }];

  beforeEach(() => {
    installFakeDom();
    setConsentChecker(() => false);
  });

  afterEach(() => {
    restoreEmbedBlocking();
    restoreElements();
    setBlockedEmbedWriteHandler(null);
    clearElementQueue();
    teardownFakeDom();
  });

  it('blocks Image().src writes before consent', () => {
    interceptElements('manual', blockedDomains);

    const img = new Image();
    img.src = blockedUrl;

    expect(img.src).toBe('');
    expect(img.getAttribute('src')).toBe(null);
    expect(getElementQueue()).toHaveLength(1);
    expect(getElementQueue()[0]).toMatchObject({
      category: 'marketing',
      method: 'property',
      value: blockedUrl
    });
  });

  it('blocks img.setAttribute("src", ...) writes before consent', () => {
    interceptElements('manual', blockedDomains);

    const img = new HTMLImageElement();
    img.setAttribute('src', blockedUrl);

    expect(img.src).toBe('');
    expect(img.getAttribute('src')).toBe(null);
    expect(getElementQueue()).toHaveLength(1);
    expect(getElementQueue()[0]).toMatchObject({
      category: 'marketing',
      method: 'attribute',
      value: blockedUrl
    });
  });

  it('honors iframe opt-out for both URL write paths', () => {
    interceptElements('doomsday');
    const frame = new HTMLIFrameElement();
    frame.setAttribute('data-zest-allow', '');
    frame.src = 'https://www.youtube.com/embed/a';
    expect(frame.src).toContain('/a');
    frame.setAttribute('src', 'https://www.youtube.com/embed/b');
    expect(frame.src).toContain('/b');
    expect(getElementQueue()).toHaveLength(0);
  });

  it('swallows blocked iframe URL changes before fetching', () => {
    interceptElements('safe');
    const writes = [];
    setBlockedEmbedWriteHandler((el, url) => { writes.push([el, url]); return true; });
    const frame = new HTMLIFrameElement();
    frame.src = 'https://www.youtube.com/embed/a';
    frame.setAttribute('src', 'https://www.youtube.com/embed/b');
    expect(frame.src).toBe('');
    expect(writes.map(([, url]) => url)).toEqual([
      'https://www.youtube.com/embed/a', 'https://www.youtube.com/embed/b'
    ]);
    expect(getElementQueue()).toHaveLength(0);
    const image = new HTMLImageElement();
    image.src = 'https://example.com/img';
    expect(writes).toHaveLength(2);
    frame.setAttribute('data-zest-allow', '');
    frame.src = 'https://www.youtube.com/embed/c';
    expect(frame.src).toContain('/c');
    expect(writes).toHaveLength(2);
  });

  it('routes dynamic iframe writes through embed gating before fetch', () => {
    interceptElements('safe');
    startEmbedBlocking('safe');
    const frame = new HTMLIFrameElement();
    frame.src = 'https://www.youtube.com/embed/a';
    expect(frame.src).toBe('');
    expect(getEmbedQueue()[0].url).toBe('https://www.youtube.com/embed/a');
    frame.setAttribute('src', 'https://www.youtube.com/embed/b');
    expect(frame.src).toBe('');
    expect(getEmbedQueue()[0].url).toBe('https://www.youtube.com/embed/b');
    expect(getElementQueue()).toHaveLength(0);
    activateEmbed(frame);
    expect(frame.src).toBe('https://www.youtube-nocookie.com/embed/b');
  });

  it('replays blocked image URLs after consent is granted', () => {
    interceptElements('manual', blockedDomains);

    const img = new Image();
    img.src = blockedUrl;

    replayElements(['marketing']);

    expect(img.src).toBe(blockedUrl);
    expect(img.getAttribute('src')).toBe(blockedUrl);
    expect(getElementQueue()).toHaveLength(0);
  });
});
