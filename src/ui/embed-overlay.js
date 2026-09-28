/**
 * Embed Overlay - consent overlay rendered on top of a blocked iframe.
 *
 * Each blocked embed is wrapped in a <zest-embed> custom element with its
 * own Shadow DOM: the iframe stays in the light DOM (host CSS keeps sizing
 * it normally) and the overlay is immune to host page styles. The wrapper
 * is removed on activation, leaving the DOM exactly as the author wrote it.
 */

import { escapeHTML, safeColor, sanitizeCustomStyles } from '../core/security.js';
import { contrastColor } from './styles.js';

/** Wrappers we created, keyed by the wrapped iframe. */
const wrappers = new Map();

/** Overlay labels + accent + custom styles, set from config at install time. */
let overlayLabels = null;
let overlayAccent = null;
let overlayCustomStyles = '';
let categoryLabels = null;

export function setEmbedOverlayConfig(labels, accentColor, customStyles, categories) {
  overlayLabels = labels && typeof labels === 'object' ? labels : null;
  overlayAccent = safeColor(accentColor) || null;
  overlayCustomStyles = typeof customStyles === 'string' ? sanitizeCustomStyles(customStyles) : '';
  categoryLabels = categories && typeof categories === 'object' ? categories : null;
}

export function overlayStyles(accent) {
  const color = accent || '#0071e3';
  return `
    :host {
      display: block;
      position: relative;
      --zest-accent-text: ${contrastColor(color)};
    }
    @supports (color: contrast-color(red)) {
      :host { --zest-accent-text: contrast-color(${color}); }
    }
    .zest-embed-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px;
      text-align: center;
      background: var(--zest-embed-bg, #f5f5f7);
      color: var(--zest-embed-text, #1d1d1f);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }
    :host([data-theme="dark"]) .zest-embed-overlay {
      background: var(--zest-embed-bg, #1d1d1f);
      color: var(--zest-embed-text, #f5f5f7);
    }
    .zest-embed-overlay__title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
    .zest-embed-overlay__text {
      margin: 0;
      max-width: 40ch;
      opacity: 0.75;
    }
    .zest-embed-overlay__btn {
      appearance: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      padding: 8px 16px;
      font: inherit;
      font-weight: 600;
      color: var(--zest-accent-text);
      background: ${color};
    }
    .zest-embed-overlay__btn:hover { opacity: 0.9; }
    .zest-embed-overlay__btn:focus-visible {
      outline: 2px solid ${color};
      outline-offset: 2px;
    }
  `;
}

function overlayHTML(labels, category, categoryLabel) {
  const title = labels?.title || 'External content is blocked';
  const text = (labels?.text || 'Content in the %category% category does not load until you consent.')
    .replace('%category%', categoryLabel || category);
  const load = labels?.load || 'Load content';
  return `
    <div class="zest-embed-overlay" role="region" aria-label="${escapeHTML(title)}">
      <p class="zest-embed-overlay__title">${escapeHTML(title)}</p>
      <p class="zest-embed-overlay__text">${escapeHTML(text)}</p>
      <button type="button" class="zest-embed-overlay__btn" data-action="load">${escapeHTML(load)}</button>
    </div>
  `;
}

function currentTheme() {
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch (e) {
    /* no-op */
  }
  return 'light';
}

/**
 * Wrap a blocked iframe with a consent overlay. Returns a hide() callback
 * that unwraps the iframe and removes the overlay.
 */
export function createEmbedOverlay(entry, onLoad) {
  const iframe = entry.element;
  const parent = iframe.parentNode;
  if (!parent) return null;

  const wrapper = document.createElement('zest-embed');
  wrapper.setAttribute('data-theme', currentTheme());

  const shadow = wrapper.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = overlayStyles(overlayAccent) + overlayCustomStyles;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.innerHTML = overlayHTML(
    overlayLabels,
    entry.category,
    categoryLabels?.[entry.category]?.label
  );

  // Slot first — the slotted iframe gives the wrapper its size; the
  // absolutely-positioned overlay paints over it.
  const slot = document.createElement('slot');
  shadow.appendChild(slot);
  shadow.appendChild(container.firstElementChild);

  shadow.querySelector('.zest-embed-overlay__btn')
    ?.addEventListener('click', () => onLoad?.());

  parent.insertBefore(wrapper, iframe);
  wrapper.appendChild(iframe);
  wrappers.set(iframe, wrapper);

  return () => {
    if (!wrapper.parentNode) return;
    wrapper.parentNode.insertBefore(iframe, wrapper);
    wrapper.remove();
    wrappers.delete(iframe);
  };
}

export function getEmbedOverlays() {
  return [...wrappers.values()];
}

/** Unwrap every iframe and drop all overlays (teardown / reset). */
export function removeEmbedOverlays() {
  for (const [iframe, wrapper] of [...wrappers]) {
    if (wrapper.parentNode) {
      wrapper.parentNode.insertBefore(iframe, wrapper);
    }
    wrapper.remove();
    wrappers.delete(iframe);
  }
}