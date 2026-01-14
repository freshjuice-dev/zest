/**
 * Styles - Shadow DOM encapsulated CSS with theming
 */

/**
 * Generate CSS with custom properties
 */
export function generateStyles(config) {
  const accentColor = config.accentColor || '#4F46E5';

  return `
:host {
  --zest-accent: ${accentColor};
  --zest-accent-hover: ${adjustColor(accentColor, -15)};
  --zest-bg: #ffffff;
  --zest-bg-secondary: #f3f4f6;
  --zest-text: #1f2937;
  --zest-text-secondary: #6b7280;
  --zest-border: #e5e7eb;
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

*, *::before, *::after {
  box-sizing: border-box;
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

.zest-btn--primary {
  background: var(--zest-accent);
  color: #ffffff;
}

.zest-btn--primary:hover {
  background: var(--zest-accent-hover);
}

.zest-btn--secondary {
  background: var(--zest-bg-secondary);
  color: var(--zest-text);
}

.zest-btn--secondary:hover {
  background: var(--zest-border);
}

.zest-btn--ghost {
  background: transparent;
  color: var(--zest-text-secondary);
}

.zest-btn--ghost:hover {
  background: var(--zest-bg-secondary);
  color: var(--zest-text);
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
  background: rgba(0, 0, 0, 0.5);
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

  .zest-banner--top {
    top: 10px;
    transform: none;
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

  .zest-banner__buttons {
    flex-direction: column;
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
${config.customStyles || ''}
`;
}

/**
 * Adjust color brightness
 */
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Cookie icon SVG
 */
export const COOKIE_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10c0-.728-.078-1.437-.225-2.12a1 1 0 0 0-1.482-.63 3 3 0 0 1-4.086-3.72 1 1 0 0 0-.793-1.263A10.05 10.05 0 0 0 12 2zm0 2c.178 0 .354.006.528.017a5 5 0 0 0 5.955 5.955c.011.174.017.35.017.528 0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8zm-4 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`;
