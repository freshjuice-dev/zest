/**
 * Styles - Shadow DOM encapsulated CSS with theming
 */

import { safeColor, sanitizeCustomStyles } from '../core/security.js';

const DEFAULT_ACCENT = '#4F46E5';

/**
 * Generate CSS with custom properties
 */
export function generateStyles(config) {
  // Only accept colors that pass strict validation — an unvalidated
  // value is a CSS-injection vector (e.g. `red; } * { display:none; /*`).
  const accentColor = safeColor(config.accentColor) || DEFAULT_ACCENT;
  const customCss = sanitizeCustomStyles(config.customStyles);

  return `
:host {
  --zest-accent: ${accentColor};
  --zest-accent-hover: ${adjustColor(accentColor, -15)};
  --zest-accent-text: ${contrastColor(accentColor)};
  --zest-bg: #ffffff;
  --zest-bg-secondary: #f3f4f6;
  --zest-text: #1f2937;
  --zest-text-secondary: #6b7280;
  --zest-border: #e5e7eb;
  --zest-overlay: rgba(0, 0, 0, 0.5);
  --zest-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --zest-radius: 12px;
  --zest-radius-sm: 8px;
  --zest-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  font-family: var(--zest-font);
  font-size: 14px;
  line-height: 1.5;
  color: var(--zest-text);
  box-sizing: border-box;
}

:host([data-theme="dark"]) {
  --zest-bg: #1f2937;
  --zest-bg-secondary: #374151;
  --zest-text: #f9fafb;
  --zest-text-secondary: #9ca3af;
  --zest-border: #4b5563;
  --zest-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  :host([data-theme="auto"]) {
    --zest-bg: #1f2937;
    --zest-bg-secondary: #374151;
    --zest-text: #f9fafb;
    --zest-text-secondary: #9ca3af;
    --zest-border: #4b5563;
    --zest-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  }
}

/* Native contrast-color() when supported (Baseline April 2026) — more
   accurate than our JS fallback, handles all CSS color spaces. */
@supports (color: contrast-color(red)) {
  :host {
    --zest-accent-text: contrast-color(var(--zest-accent));
  }
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* Hard consent wall — blocks page interaction until visitor decides */
.zest-banner-wall {
  position: fixed;
  inset: 0;
  z-index: 999998;
  background: var(--zest-overlay);
  ${config.backdropBlur ? `-webkit-backdrop-filter: blur(${config.backdropBlur}px);
  backdrop-filter: blur(${config.backdropBlur}px);` : ''}
  animation: zest-fade-in 0.2s ease-out;
}

/* Banner */
.zest-banner {
  position: fixed;
  z-index: 999999;
  max-width: 480px;
  padding: 20px;
  background: var(--zest-bg);
  border-radius: var(--zest-radius);
  box-shadow: var(--zest-shadow);
  animation: zest-slide-in 0.3s ease-out;
}

.zest-banner--bottom {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.zest-banner--bottom-left {
  bottom: 20px;
  left: 20px;
}

.zest-banner--bottom-right {
  bottom: 20px;
  right: 20px;
}

.zest-banner--top {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.zest-banner--top-left {
  top: 20px;
  left: 20px;
}

.zest-banner--top-right {
  top: 20px;
  right: 20px;
}

.zest-banner--center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@keyframes zest-slide-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes zest-slide-in-top {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes zest-slide-in-top-left {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes zest-slide-in-top-right {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes zest-fade-in-center {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.zest-banner--bottom-left {
  animation-name: zest-slide-in-left;
}

@keyframes zest-slide-in-left {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.zest-banner--bottom-right {
  animation-name: zest-slide-in-right;
}

@keyframes zest-slide-in-right {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.zest-banner--top {
  animation-name: zest-slide-in-top;
}

.zest-banner--top-left {
  animation-name: zest-slide-in-top-left;
}

.zest-banner--top-right {
  animation-name: zest-slide-in-top-right;
}

.zest-banner--center {
  animation-name: zest-fade-in-center;
}

@media (prefers-reduced-motion: reduce) {
  .zest-banner,
  .zest-modal {
    animation: none;
  }
}

.zest-banner__title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--zest-text);
}

.zest-banner__description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--zest-text-secondary);
}

.zest-banner__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.zest-banner__buttons--split,
.zest-modal__footer--split {
  justify-content: space-between;
  align-items: center;
}

.zest-banner__buttons-group,
.zest-modal__buttons-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Buttons */
.zest-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  border: none;
  border-radius: var(--zest-radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.zest-btn:hover {
  transform: translateY(-1px);
}

.zest-btn:active {
  transform: translateY(0);
}

.zest-btn:focus-visible {
  outline: 2px solid var(--zest-accent);
  outline-offset: 2px;
}

${config.buttonStyle === 'outline' ? `
.zest-btn--primary {
  background: transparent;
  color: var(--zest-accent);
  border: 2px solid var(--zest-accent);
}
.zest-btn--primary:hover {
  background: var(--zest-bg-secondary);
}
` : `
.zest-btn--primary {
  background: var(--zest-accent);
  color: var(--zest-accent-text);
  border: 1px solid var(--zest-accent);
}
.zest-btn--primary:hover {
  background: var(--zest-accent-hover);
}
`}

.zest-btn--ghost {
  background: transparent;
  color: var(--zest-text-secondary);
}

.zest-btn--ghost:hover {
  background: var(--zest-bg-secondary);
  color: var(--zest-text);
}

.zest-btn--secondary {
  background: transparent;
  color: var(--zest-accent);
  border: 1px solid var(--zest-accent);
}

.zest-btn--secondary:hover {
  background: var(--zest-bg-secondary);
}

/* Modal */
.zest-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 999998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--zest-overlay);
  ${config.backdropBlur ? `-webkit-backdrop-filter: blur(${config.backdropBlur}px);
  backdrop-filter: blur(${config.backdropBlur}px);` : ''}
  animation: zest-fade-in 0.2s ease-out;
}

@keyframes zest-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.zest-modal {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--zest-bg);
  border-radius: var(--zest-radius);
  box-shadow: var(--zest-shadow);
  animation: zest-modal-in 0.3s ease-out;
}

@keyframes zest-modal-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.zest-modal__header {
  padding: 20px 20px 0;
}

.zest-modal__title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--zest-text);
}

.zest-modal__description {
  margin: 0;
  font-size: 14px;
  color: var(--zest-text-secondary);
}

.zest-modal__body {
  padding: 20px;
}

.zest-modal__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 20px 20px;
}

/* Categories */
.zest-category {
  padding: 16px;
  margin-bottom: 12px;
  background: var(--zest-bg-secondary);
  border-radius: var(--zest-radius-sm);
}

.zest-category:last-child {
  margin-bottom: 0;
}

.zest-category__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.zest-category__info {
  flex: 1;
}

.zest-category__label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--zest-text);
}

.zest-category__description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--zest-text-secondary);
}

/* Toggle Switch */
.zest-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.zest-toggle__input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  margin: 0;
}

.zest-toggle__input:disabled {
  cursor: not-allowed;
}

.zest-toggle__slider {
  position: absolute;
  inset: 0;
  background: var(--zest-border);
  border-radius: 12px;
  transition: background-color 0.2s ease;
  pointer-events: none;
}

.zest-toggle__slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.zest-toggle__input:checked + .zest-toggle__slider {
  background: var(--zest-accent);
}

.zest-toggle__input:checked + .zest-toggle__slider::before {
  transform: translateX(20px);
}

.zest-toggle__input:focus-visible + .zest-toggle__slider {
  outline: 2px solid var(--zest-accent);
  outline-offset: 2px;
}

.zest-toggle__input:disabled + .zest-toggle__slider {
  opacity: 0.6;
}

/* Widget */
.zest-widget {
  position: fixed;
  z-index: 999997;
  bottom: 20px;
  left: 20px;
}

.zest-widget__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  background: var(--zest-bg);
  border: 1px solid var(--zest-border);
  border-radius: 50%;
  box-shadow: var(--zest-shadow);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.zest-widget__btn:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 28px -5px rgba(0, 0, 0, 0.15);
}

.zest-widget__btn:focus-visible {
  outline: 2px solid var(--zest-accent);
  outline-offset: 2px;
}

.zest-widget__icon {
  width: 24px;
  height: 24px;
  fill: var(--zest-text);
}

/* Link */
.zest-link {
  color: var(--zest-accent);
  text-decoration: none;
}

.zest-link:hover {
  text-decoration: underline;
}

/* "Powered by Zest" attribution (banner + modal) */
.zest-banner__powered {
  margin-top: 12px;
  margin-bottom: -14px;
  text-align: center;
}

.zest-banner__powered .zest-powered-link {
  font-size: 10px;
}

.zest-modal__powered {
  padding: 0 20px 16px;
  text-align: center;
}

.zest-powered-link {
  font-size: 12px;
  color: var(--zest-text-secondary);
  text-decoration: none;
  opacity: 0.85;
}

.zest-powered-link:hover {
  color: var(--zest-accent);
  text-decoration: underline;
  opacity: 1;
}

/* Mobile */
@media (max-width: 480px) {
  .zest-banner {
    left: 10px;
    right: 10px;
    max-width: none;
    transform: none;
  }

  .zest-banner--bottom,
  .zest-banner--bottom-left,
  .zest-banner--bottom-right {
    bottom: 10px;
  }

  .zest-banner--top,
  .zest-banner--top-left,
  .zest-banner--top-right {
    top: 10px;
  }

  /* Center stays centered on mobile, just with responsive width */
  .zest-banner--center {
    top: 50%;
    left: 50%;
    right: auto;
    transform: translate(-50%, -50%);
  }

  @keyframes zest-slide-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes zest-fade-in-center {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .zest-banner__buttons {
    flex-direction: column;
  }

  .zest-banner__buttons--split,
  .zest-modal__footer--split {
    flex-direction: column;
    gap: 12px;
  }

  .zest-banner__buttons-group,
  .zest-modal__buttons-group {
    flex-direction: column;
    width: 100%;
  }

  .zest-btn {
    width: 100%;
  }

  .zest-modal-overlay {
    padding: 10px;
  }

  .zest-widget {
    bottom: 10px;
    left: 10px;
  }
}

/* Hidden utility */
.zest-hidden {
  display: none !important;
}
${customCss}
`;
}

/**
 * JS fallback for --zest-accent-text on browsers without CSS contrast-color()
 * (pre-April 2026 Baseline). Uses WCAG 2.x relative luminance to pick black
 * or white. Browsers that support contrast-color() override this via @supports.
 */
function contrastColor(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(hex.trim())) {
    return '#ffffff';
  }
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 8) clean = clean.slice(0, 6);
  if (clean.length !== 6) return '#ffffff';

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const lin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

  return L > 0.179 ? '#1f2937' : '#ffffff';
}

/**
 * Adjust color brightness. Falls back to the default accent if the input
 * cannot be parsed as a hex color (non-hex inputs pass safeColor but
 * can't be brightness-shifted mathematically).
 */
function adjustColor(hex, percent) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(hex.trim())) {
    hex = DEFAULT_ACCENT;
  }
  let clean = hex.trim().replace('#', '');
  // Expand 3-digit form to 6
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  // Strip alpha if present
  if (clean.length === 8) clean = clean.slice(0, 6);
  if (clean.length !== 6) clean = DEFAULT_ACCENT.slice(1);

  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Cookie icon SVG
 */
export const COOKIE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M164.49,163.51a12,12,0,1,1-17,0A12,12,0,0,1,164.49,163.51Zm-81-8a12,12,0,1,0,17,0A12,12,0,0,0,83.51,155.51Zm9-39a12,12,0,1,0-17,0A12,12,0,0,0,92.49,116.49Zm48-1a12,12,0,1,0,0,17A12,12,0,0,0,140.49,115.51ZM232,128A104,104,0,1,1,128,24a8,8,0,0,1,8,8,40,40,0,0,0,40,40,8,8,0,0,1,8,8,40,40,0,0,0,40,40A8,8,0,0,1,232,128Zm-16.31,7.39A56.13,56.13,0,0,1,168.5,87.5a56.13,56.13,0,0,1-47.89-47.19,88,88,0,1,0,95.08,95.08Z"/></svg>`;
