/**
 * Banner - Main consent banner component
 */

import { generateStyles } from './styles.js';
import { getCurrentConfig } from '../config/parser.js';

let bannerElement = null;
let shadowRoot = null;

/**
 * Create the banner HTML
 */
function createBannerHTML(config) {
  const labels = config.labels.banner;
  const position = config.position || 'bottom';

  return `
    <div class="zest-banner zest-banner--${position}" role="dialog" aria-modal="false" aria-label="${labels.title}">
      <h2 class="zest-banner__title">${labels.title}</h2>
      <p class="zest-banner__description">${labels.description}</p>
      <div class="zest-banner__buttons">
        <button type="button" class="zest-btn zest-btn--primary" data-action="accept-all">
          ${labels.acceptAll}
        </button>
        <button type="button" class="zest-btn zest-btn--secondary" data-action="reject-all">
          ${labels.rejectAll}
        </button>
        <button type="button" class="zest-btn zest-btn--ghost" data-action="settings">
          ${labels.settings}
        </button>
      </div>
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
  shadowRoot.appendChild(container.firstElementChild);

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
