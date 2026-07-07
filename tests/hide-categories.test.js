import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub document for the node test environment — consent-store calls
// descriptor.set.call(document, value) and document doesn't exist here.
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { cookie: '' };
}

// Mock cookie-interceptor before importing consent-store, so setRawCookie
// uses our fake descriptor instead of falling back to document.cookie
// (which doesn't exist in the node test environment).
const fakeStore = {};
const fakeDescriptor = {
  get: () => fakeStore.value || '',
  set: (v) => { fakeStore.value = v; }
};
vi.mock('../src/core/cookie-interceptor.js', () => ({
  getOriginalCookieDescriptor: () => fakeDescriptor
}));

import {
  DEFAULT_CATEGORIES,
  getDefaultConsent,
  getHiddenCategoryIds
} from '../src/core/categories.js';
import { mergeConfig } from '../src/config/defaults.js';
import {
  setHiddenCategoryIds,
  updateConsent,
  acceptAll
} from '../src/storage/consent-store.js';

const base = { lang: 'en' };

describe('DEFAULT_CATEGORIES hidden flag', () => {
  it('every category has hidden: false by default', () => {
    for (const key of Object.keys(DEFAULT_CATEGORIES)) {
      expect(DEFAULT_CATEGORIES[key].hidden).toBe(false);
    }
  });
});

describe('getHiddenCategoryIds', () => {
  it('returns empty array when nothing is hidden', () => {
    expect(getHiddenCategoryIds()).toEqual([]);
  });

  it('returns hidden non-essential category IDs', () => {
    const cats = {
      ...DEFAULT_CATEGORIES,
      analytics: { ...DEFAULT_CATEGORIES.analytics, hidden: true }
    };
    expect(getHiddenCategoryIds(cats)).toEqual(['analytics']);
  });

  it('never includes essential even if hidden is true', () => {
    const cats = {
      ...DEFAULT_CATEGORIES,
      essential: { ...DEFAULT_CATEGORIES.essential, hidden: true }
    };
    expect(getHiddenCategoryIds(cats)).toEqual([]);
  });

  it('handles multiple hidden categories', () => {
    const cats = {
      ...DEFAULT_CATEGORIES,
      functional: { ...DEFAULT_CATEGORIES.functional, hidden: true },
      analytics: { ...DEFAULT_CATEGORIES.analytics, hidden: true }
    };
    expect(getHiddenCategoryIds(cats).sort()).toEqual(['analytics', 'functional']);
  });
});

describe('getDefaultConsent with hidden categories', () => {
  it('returns all-false for non-essential by default', () => {
    const consent = getDefaultConsent();
    expect(consent).toEqual({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    });
  });

  it('forces hidden categories to false even if default was true', () => {
    const cats = {
      ...DEFAULT_CATEGORIES,
      analytics: { ...DEFAULT_CATEGORIES.analytics, hidden: true, default: true }
    };
    const consent = getDefaultConsent(cats);
    expect(consent.analytics).toBe(false);
  });

  it('essential stays true even if somehow hidden', () => {
    const cats = {
      ...DEFAULT_CATEGORIES,
      essential: { ...DEFAULT_CATEGORIES.essential, hidden: true }
    };
    const consent = getDefaultConsent(cats);
    expect(consent.essential).toBe(true);
  });
});

describe('mergeConfig propagates hidden flag', () => {
  it('mergeConfig preserves hidden from user config', () => {
    const cfg = mergeConfig({
      ...base,
      categories: { analytics: { hidden: true } }
    });
    expect(cfg.categories.analytics.hidden).toBe(true);
  });

  it('mergeConfig leaves non-hidden categories at false', () => {
    const cfg = mergeConfig({
      ...base,
      categories: { analytics: { hidden: true } }
    });
    expect(cfg.categories.functional.hidden).toBe(false);
    expect(cfg.categories.marketing.hidden).toBe(false);
  });
});

describe('data-hide-categories parsing simulation', () => {
  it('produces config.categories with hidden:true for each id', () => {
    // Simulates what parseDataAttributes does when it reads
    // data-hide-categories="analytics,marketing"
    const hideAttr = 'analytics, marketing';
    const ids = hideAttr.split(',').map(s => s.trim()).filter(Boolean);
    const dataConfig = {};
    if (ids.length > 0) {
      dataConfig.categories = {};
      for (const id of ids) {
        dataConfig.categories[id] = { hidden: true };
      }
    }
    const cfg = mergeConfig({ ...base, ...dataConfig });
    expect(cfg.categories.analytics.hidden).toBe(true);
    expect(cfg.categories.marketing.hidden).toBe(true);
    expect(cfg.categories.functional.hidden).toBe(false);
    expect(cfg.categories.essential.hidden).toBe(false);
  });

  it('single category in data-hide-categories', () => {
    const hideAttr = 'analytics';
    const ids = hideAttr.split(',').map(s => s.trim()).filter(Boolean);
    const dataConfig = {};
    if (ids.length > 0) {
      dataConfig.categories = {};
      for (const id of ids) {
        dataConfig.categories[id] = { hidden: true };
      }
    }
    const cfg = mergeConfig({ ...base, ...dataConfig });
    expect(cfg.categories.analytics.hidden).toBe(true);
    expect(cfg.categories.marketing.hidden).toBe(false);
  });

  it('empty string in data-hide-categories produces no categories', () => {
    const hideAttr = '';
    const ids = hideAttr.split(',').map(s => s.trim()).filter(Boolean);
    const dataConfig = {};
    if (ids.length > 0) {
      dataConfig.categories = {};
      for (const id of ids) {
        dataConfig.categories[id] = { hidden: true };
      }
    }
    expect(dataConfig.categories).toBeUndefined();
  });

  it('essential in data-hide-categories gets hidden:true but getHiddenCategoryIds filters it out', () => {
    const hideAttr = 'essential,analytics';
    const ids = hideAttr.split(',').map(s => s.trim()).filter(Boolean);
    const dataConfig = {};
    if (ids.length > 0) {
      dataConfig.categories = {};
      for (const id of ids) {
        dataConfig.categories[id] = { hidden: true };
      }
    }
    const cfg = mergeConfig({ ...base, ...dataConfig });
    // mergeConfig merges essential: { hidden: true } over the default
    expect(cfg.categories.essential.hidden).toBe(true);
    // But getHiddenCategoryIds must never return essential
    expect(getHiddenCategoryIds(cfg.categories)).toEqual(['analytics']);
  });

  it('window.ZestConfig categories + data-hide-categories preserve both', () => {
    // Simulates: window.ZestConfig.categories.analytics = { label: "Stats" }
    //            data-hide-categories="analytics"
    // The label override must survive, and hidden must be applied.
    const windowConfig = { ...base, categories: { analytics: { label: 'Stats' } } };
    const dataConfig = { categories: { analytics: { hidden: true } } };

    // Replicate the deep-merge logic from getConfig()
    const merged = { ...windowConfig, ...dataConfig };
    if (windowConfig.categories && dataConfig.categories) {
      merged.categories = {};
      for (const key of Object.keys(windowConfig.categories)) {
        merged.categories[key] = { ...windowConfig.categories[key] };
      }
      for (const key of Object.keys(dataConfig.categories)) {
        merged.categories[key] = {
          ...merged.categories[key],
          ...dataConfig.categories[key]
        };
      }
    }

    const cfg = mergeConfig(merged);
    expect(cfg.categories.analytics.hidden).toBe(true);
    expect(cfg.categories.analytics.label).toBe('Stats');
  });
});

describe('consent-store hidden category enforcement', () => {
  beforeEach(() => {
    setHiddenCategoryIds([]);
  });

  it('acceptAll forces hidden categories to false', () => {
    setHiddenCategoryIds(['analytics']);
    const result = acceptAll(1);
    expect(result.current.essential).toBe(true);
    expect(result.current.functional).toBe(true);
    expect(result.current.marketing).toBe(true);
    expect(result.current.analytics).toBe(false);
  });

  it('updateConsent forces hidden categories to false even when passed true', () => {
    setHiddenCategoryIds(['analytics']);
    const result = updateConsent({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    }, 1);
    expect(result.current.analytics).toBe(false);
  });

  it('setHiddenCategoryIds ignores essential', () => {
    setHiddenCategoryIds(['essential', 'analytics']);
    const result = acceptAll(1);
    expect(result.current.essential).toBe(true);
    expect(result.current.analytics).toBe(false);
  });

  it('no hidden categories = acceptAll works normally', () => {
    setHiddenCategoryIds([]);
    const result = acceptAll(1);
    expect(result.current).toEqual({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    });
  });

  it('updateConsent with hidden analytics passed as true still forces false', () => {
    setHiddenCategoryIds(['analytics']);
    const result = updateConsent({
      essential: true,
      functional: false,
      analytics: true,
      marketing: false
    }, 1);
    expect(result.current.analytics).toBe(false);
    expect(result.current.functional).toBe(false);
  });

  it('multiple hidden categories all forced false on acceptAll', () => {
    setHiddenCategoryIds(['functional', 'analytics', 'marketing']);
    const result = acceptAll(1);
    expect(result.current.essential).toBe(true);
    expect(result.current.functional).toBe(false);
    expect(result.current.analytics).toBe(false);
    expect(result.current.marketing).toBe(false);
  });
});