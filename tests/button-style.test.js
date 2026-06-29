import { describe, it, expect } from 'vitest';
import { mergeConfig, normalizeButtonStyle } from '../src/config/defaults.js';

// Explicit `lang` keeps detectLanguage() from touching `document` / navigator.
const base = { lang: 'en' };

describe('normalizeButtonStyle', () => {
  it('passes canonical values through (case-insensitive)', () => {
    expect(normalizeButtonStyle('fill')).toBe('fill');
    expect(normalizeButtonStyle('outline')).toBe('outline');
    expect(normalizeButtonStyle('OUTLINE')).toBe('outline');
    expect(normalizeButtonStyle(' Fill ')).toBe('fill');
  });

  it('falls back to fill (default, fail-safe) for unknown values', () => {
    expect(normalizeButtonStyle('bordered')).toBe('fill');
    expect(normalizeButtonStyle('')).toBe('fill');
    expect(normalizeButtonStyle(42)).toBe('fill');
    expect(normalizeButtonStyle(null)).toBe('fill');
    expect(normalizeButtonStyle(undefined)).toBe('fill');
  });
});

describe('mergeConfig buttonStyle normalization', () => {
  it('defaults to fill when omitted', () => {
    expect(mergeConfig(base).buttonStyle).toBe('fill');
  });

  it('normalises string values (case / aliases) coming from window config / data attributes', () => {
    expect(mergeConfig({ ...base, buttonStyle: 'outline' }).buttonStyle).toBe('outline');
    expect(mergeConfig({ ...base, buttonStyle: 'FILL' }).buttonStyle).toBe('fill');
  });

  it('coerces unknown strings to the fail-safe default (fill)', () => {
    // A typo must never silently switch the buttons to the outlined variant.
    expect(mergeConfig({ ...base, buttonStyle: 'ghost' }).buttonStyle).toBe('fill');
    expect(mergeConfig({ ...base, buttonStyle: 'outline ' }).buttonStyle).toBe('outline');
  });
});