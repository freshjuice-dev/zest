/**
 * Widget - Minimal floating button to reopen settings
 */

import { generateStyles, COOKIE_ICON } from './styles.js';
import { getCurrentConfig } from '../config/parser.js';
import { escapeHTML } from '../core/security.js';

let widgetElement = null;
let shadowRoot = null;

/**
 * Create the widget HTML
 */
function createWidgetHTML(config) {
  const labels = config.labels.widget;
  const safeLabel = escapeHTML(labels.label);

  return `
    <div class="zest-widget">
      <button type="button" class="zest-widget__btn" aria-label="${safeLabel}" title="${safeLabel}">
        <span class="zest-widget__icon">${COOKIE_ICON}</span>
      </button>
    </div>
  `;
}

/**
 * Create and mount the widget
 */
export function createWidget(callbacks = {}) {
  if (widgetElement) {
    return widgetElement;
  }

  const config = getCurrentConfig();

  // Create host element
  widgetElement = document.createElement('zest-widget');
  widgetElement.setAttribute('data-theme', config.theme || 'light');

  // Create shadow root
  shadowRoot = widgetElement.attachShadow({ mode: 'open' });

  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = generateStyles(config);
  shadowRoot.appendChild(styleEl);

  // Add widget HTML
  const container = document.createElement('div');
  container.innerHTML = createWidgetHTML(config);
  shadowRoot.appendChild(container.firstElementChild);

  // Add event listener
  const button = shadowRoot.querySelector('.zest-widget__btn');
  button.addEventListener('click', () => {
    callbacks.onClick?.();
  });

  // Mount to document
  document.body.appendChild(widgetElement);

  return widgetElement;
}

/**
 * Show the widget
 */
export function showWidget(callbacks = {}) {
  if (!widgetElement) {
    createWidget(callbacks);
  } else {
    widgetElement.style.display = '';
  }
}

/**
 * Hide the widget
 */
export function hideWidget() {
  if (widgetElement) {
    widgetElement.style.display = 'none';
  }
}

/**
 * Remove the widget completely
 */
export function removeWidget() {
  if (widgetElement) {
    widgetElement.remove();
    widgetElement = null;
    shadowRoot = null;
  }
}

/**
 * Check if widget is visible
 */
export function isWidgetVisible() {
  return widgetElement !== null &&
    document.body.contains(widgetElement) &&
    widgetElement.style.display !== 'none';
}
