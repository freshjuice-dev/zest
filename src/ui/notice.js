/**
 * Notice - minimal "Do Not Sell or Share My Personal Information" link.
 *
 * Shown for the opt-out ('notice') geo action (US state-privacy regimes):
 * tracking is already running (core accepted on the opt-out model), so this is
 * NOT a consent gate — it's a small, dismissible affordance that lets the
 * visitor opt out. Deliberately lightweight: a corner link, no toggles, no
 * modal. Lives in its own Shadow DOM so the host page can't style it open.
 */

import { escapeHTML, safeColor } from '../core/security.js';

let noticeElement = null;
let shadowRoot = null;

function noticeStyles(accent) {
  const color = safeColor(accent) || '#0071e3';
  return `
    :host { all: initial; }
    .zest-notice {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 2147483646;
      max-width: 320px;
      box-sizing: border-box;
      padding: 12px 14px;
      border-radius: 10px;
      background: #ffffff;
      color: #1d1d1f;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    :host([data-theme="dark"]) .zest-notice {
      background: #1d1d1f;
      color: #f5f5f7;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    }
    .zest-notice__body { flex: 1 1 auto; min-width: 0; }
    .zest-notice__title {
      margin: 0 0 2px;
      font-weight: 600;
      font-size: 12px;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .zest-notice__link {
      appearance: none;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      color: ${color};
      font: inherit;
      font-weight: 600;
      text-align: left;
      text-decoration: underline;
    }
    .zest-notice__link:hover { opacity: 0.85; }
    .zest-notice__dismiss {
      appearance: none;
      background: none;
      border: none;
      cursor: pointer;
      color: currentColor;
      opacity: 0.5;
      font-size: 18px;
      line-height: 1;
      padding: 0 2px;
      flex: 0 0 auto;
    }
    .zest-notice__dismiss:hover { opacity: 0.9; }
  `;
}

function createNoticeHTML(config) {
  const labels = config.labels.notice;
  return `
    <div class="zest-notice" role="region" aria-label="${escapeHTML(labels.title)}">
      <div class="zest-notice__body">
        <p class="zest-notice__title">${escapeHTML(labels.title)}</p>
        <button type="button" class="zest-notice__link" data-action="opt-out">${escapeHTML(labels.optOut)}</button>
      </div>
      <button type="button" class="zest-notice__dismiss" data-action="dismiss" aria-label="${escapeHTML(labels.dismiss)}" title="${escapeHTML(labels.dismiss)}">&times;</button>
    </div>
  `;
}

/**
 * Create and mount the notice.
 */
export function showNotice(callbacks = {}) {
  if (noticeElement) {
    noticeElement.style.display = '';
    return noticeElement;
  }

  const config = callbacks.config || {};

  noticeElement = document.createElement('zest-notice');
  noticeElement.setAttribute('data-theme', config.theme || 'light');

  shadowRoot = noticeElement.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = noticeStyles(config.accentColor);
  shadowRoot.appendChild(styleEl);

  const container = document.createElement('div');
  container.innerHTML = createNoticeHTML(config);
  shadowRoot.appendChild(container.firstElementChild);

  shadowRoot.querySelector('[data-action="opt-out"]').addEventListener('click', () => {
    callbacks.onOptOut?.();
  });
  shadowRoot.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
    callbacks.onDismiss?.();
  });

  document.body.appendChild(noticeElement);
  return noticeElement;
}

/**
 * Hide the notice.
 */
export function hideNotice() {
  if (noticeElement) {
    noticeElement.style.display = 'none';
  }
}

/**
 * Remove the notice completely.
 */
export function removeNotice() {
  if (noticeElement) {
    noticeElement.remove();
    noticeElement = null;
    shadowRoot = null;
  }
}
