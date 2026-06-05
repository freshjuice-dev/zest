import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearElementQueue,
  getElementQueue,
  interceptElements,
  replayElements,
  restoreElements,
  setConsentChecker
} from '../src/core/element-interceptor.js';

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

function installFakeDom() {
  globalThis.window = globalThis;
  globalThis.location = { href: 'https://example.com/page' };
  globalThis.Element = FakeElement;
  globalThis.HTMLImageElement = FakeImageElement;
  globalThis.Image = FakeImageElement;
}

function teardownFakeDom() {
  delete globalThis.Image;
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
    restoreElements();
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
