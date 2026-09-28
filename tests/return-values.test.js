import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fakeStore = {};
const fakeDescriptor = {
  get: () => fakeStore.value || '',
  set: (v) => { fakeStore.value = v; }
};
vi.mock('../src/core/cookie-interceptor.js', () => ({
  interceptCookies: vi.fn(),
  setConsentChecker: vi.fn(),
  replayCookies: vi.fn(),
  getOriginalCookieDescriptor: () => fakeDescriptor
}));

import Zest from '../src/index.js';

function installEnv() {
  globalThis.window = globalThis;
  globalThis.location = { href: 'https://example.com/', hostname: 'example.com' };
  const listeners = {};
  globalThis.document = {
    body: undefined,
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
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
}

function teardown() {
  delete globalThis.window;
  delete globalThis.location;
  delete globalThis.document;
  delete globalThis.CustomEvent;
  delete globalThis.MutationObserver;
  fakeStore.value = '';
}

beforeEach(installEnv);
afterEach(teardown);

// The module loads without window at import time, so auto-init never
// fires and the first call exercises the real uninitialized guard.
describe('consent write return values', () => {
  it('write methods return null before init', () => {
    expect(Zest.acceptAll()).toBeNull();
    expect(Zest.rejectAll()).toBeNull();
    expect(Zest.updateConsent({ marketing: true })).toBeNull();
  });

  it('write methods return { current, previous } after init', () => {
    Zest.init({ autoInit: false, showWidget: false });

    const accepted = Zest.acceptAll();
    expect(accepted).toMatchObject({
      current: { essential: true, marketing: true },
      previous: { essential: true }
    });

    const rejected = Zest.rejectAll();
    expect(rejected.current.marketing).toBe(false);
    expect(rejected.previous.marketing).toBe(true);

    const updated = Zest.updateConsent({ marketing: true });
    expect(updated.current.marketing).toBe(true);
    expect(updated.previous.marketing).toBe(false);
  });
});
