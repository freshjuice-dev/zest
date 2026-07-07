/**
 * Banner - Main consent banner component
 */

import { generateStyles } from './styles.js';
import { getCurrentConfig } from '../config/parser.js';
import { shouldShowBranding } from '../config/defaults.js';
import { escapeHTML } from '../core/security.js';

let bannerElement = null;
let shadowRoot = null;

const SAFE_POSITIONS = new Set(['bottom', 'bottom-left', 'bottom-right', 'top', 'top-left', 'top-right', 'center']);

/**
 * Create the banner HTML
 */
function createBannerHTML(config) {
  const labels = config.labels.banner;
  const rawPosition = config.position || 'bottom';
  const position = SAFE_POSITIONS.has(rawPosition) ? rawPosition : 'bottom';

  // Full-viewport overlay behind the banner that blocks page interaction
  // until the visitor accepts or rejects. Only rendered when hardWall is on.
  const wall = config.hardWall
    ? '<div class="zest-banner-wall" aria-hidden="true"></div>'
    : '';

  // "Powered by Zest" attribution. `branding` may be true | false | 'modal'
  // | 'banner' — only render here when the banner surface is opted in.
  const branding = shouldShowBranding(config.branding, 'banner')
    ? `<div class="zest-banner__powered">
          <a href="https://cookiezest.com" class="zest-powered-link" target="_blank" rel="noopener noreferrer">Powered by Zest</a>
        </div>`
    : '';

  const layout = config.buttonLayout === 'split' || config.buttonLayout === 'split-modern'
    ? config.buttonLayout
    : 'row';

  const buttonsHTML = layout === 'split-modern'
    ? `<div class="zest-banner__buttons zest-banner__buttons--split">
        <button type="button" class="zest-btn zest-btn--primary" data-action="settings">
          ${escapeHTML(labels.settings)}
        </button>
        <div class="zest-banner__buttons-group">
          <button type="button" class="zest-btn zest-btn--secondary" data-action="reject-all">
            ${escapeHTML(labels.rejectAll)}
          </button>
          <button type="button" class="zest-btn zest-btn--secondary" data-action="accept-all">
            ${escapeHTML(labels.acceptAll)}
          </button>
        </div>
      </div>`
    : layout === 'split'
    ? `<div class="zest-banner__buttons zest-banner__buttons--split">
        <button type="button" class="zest-btn zest-btn--ghost" data-action="settings">
          ${escapeHTML(labels.settings)}
        </button>
        <div class="zest-banner__buttons-group">
          <button type="button" class="zest-btn zest-btn--primary" data-action="reject-all">
            ${escapeHTML(labels.rejectAll)}
          </button>
          <button type="button" class="zest-btn zest-btn--primary" data-action="accept-all">
            ${escapeHTML(labels.acceptAll)}
          </button>
        </div>
      </div>`
    : `<div class="zest-banner__buttons">
        <button type="button" class="zest-btn zest-btn--primary" data-action="accept-all">
          ${escapeHTML(labels.acceptAll)}
        </button>
        <button type="button" class="zest-btn zest-btn--primary" data-action="reject-all">
          ${escapeHTML(labels.rejectAll)}
        </button>
        <button type="button" class="zest-btn zest-btn--ghost" data-action="settings">
          ${escapeHTML(labels.settings)}
        </button>
      </div>`;

  return `
    ${wall}
    <div class="zest-banner zest-banner--${position}" role="dialog" aria-modal="${config.hardWall ? 'true' : 'false'}" aria-label="${escapeHTML(labels.title)}">
      <h2 class="zest-banner__title">${escapeHTML(labels.title)}</h2>
      <p class="zest-banner__description">${escapeHTML(labels.description)}</p>
      ${buttonsHTML}
      ${branding}
    </div>
  `;
}

/**
 * Create and mount the banner
 */
export function createBanner(callbacks = {}) {
  if (bannerElement) {
    return bannerElement;
  }

  const config = getCurrentConfig();

  // Create host element
  bannerElement = document.createElement('zest-banner');
  bannerElement.setAttribute('data-theme', config.theme || 'light');

  // Create shadow root
  shadowRoot = bannerElement.attachShadow({ mode: 'open' });

  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = generateStyles(config);
  shadowRoot.appendChild(styleEl);

  // Add banner HTML
  const container = document.createElement('div');
  container.innerHTML = createBannerHTML(config);
  // Append all children (wall + banner), not just the first
  while (container.firstChild) {
    shadowRoot.appendChild(container.firstChild);
  }

  // Add event listeners
  const banner = shadowRoot.querySelector('.zest-banner');

  banner.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    switch (action) {
      case 'accept-all':
        callbacks.onAcceptAll?.();
        break;
      case 'reject-all':
        callbacks.onRejectAll?.();
        break;
      case 'settings':
        callbacks.onSettings?.();
        break;
    }
  });

  // Keyboard handling
  banner.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      callbacks.onSettings?.();
    }
  });

  // Mount to document
  document.body.appendChild(bannerElement);

  // Focus first button for accessibility
  requestAnimationFrame(() => {
    const firstButton = shadowRoot.querySelector('button');
    firstButton?.focus();
  });

  return bannerElement;
}

/**
 * Show the banner
 */
export function showBanner(callbacks = {}) {
  if (!bannerElement) {
    createBanner(callbacks);
  } else {
    bannerElement.classList.remove('zest-hidden');
  }
}

/**
 * Hide the banner
 */
export function hideBanner() {
  if (bannerElement) {
    bannerElement.remove();
    bannerElement = null;
    shadowRoot = null;
  }
}

/**
 * Check if banner is visible
 */
export function isBannerVisible() {
  return bannerElement !== null && document.body.contains(bannerElement);
}
