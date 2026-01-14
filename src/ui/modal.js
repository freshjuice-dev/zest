/**
 * Modal - Settings modal component for category toggles
 */

import { generateStyles } from './styles.js';
import { getCurrentConfig } from '../config/parser.js';
import { DEFAULT_CATEGORIES } from '../core/categories.js';

let modalElement = null;
let shadowRoot = null;
let currentSelections = {};

/**
 * Create category toggle HTML
 */
function createCategoryHTML(category, isChecked, isRequired) {
  const disabled = isRequired ? 'disabled' : '';
  const checked = isChecked ? 'checked' : '';

  return `
    <div class="zest-category">
      <div class="zest-category__header">
        <div class="zest-category__info">
          <span class="zest-category__label">${category.label}</span>
          <p class="zest-category__description">${category.description}</p>
        </div>
        <label class="zest-toggle">
          <input
            type="checkbox"
            class="zest-toggle__input"
            data-category="${category.id}"
            ${checked}
            ${disabled}
            aria-label="${category.label}"
          >
          <span class="zest-toggle__slider"></span>
        </label>
      </div>
    </div>
  `;
}

/**
 * Create the modal HTML
 */
function createModalHTML(config, consent) {
  const labels = config.labels.modal;
  const categories = config.categories || DEFAULT_CATEGORIES;

  const categoriesHTML = Object.values(categories)
    .map(cat => createCategoryHTML(
      cat,
      consent[cat.id] ?? cat.default,
      cat.required
    ))
    .join('');

  const policyLink = config.policyUrl
    ? `<a href="${config.policyUrl}" class="zest-link" target="_blank" rel="noopener">Privacy Policy</a>`
    : '';

  return `
    <div class="zest-modal-overlay" role="dialog" aria-modal="true" aria-label="${labels.title}">
      <div class="zest-modal">
        <div class="zest-modal__header">
          <h2 class="zest-modal__title">${labels.title}</h2>
          <p class="zest-modal__description">${labels.description} ${policyLink}</p>
        </div>
        <div class="zest-modal__body">
          ${categoriesHTML}
        </div>
        <div class="zest-modal__footer">
          <button type="button" class="zest-btn zest-btn--primary" data-action="save">
            ${labels.save}
          </button>
          <button type="button" class="zest-btn zest-btn--secondary" data-action="accept-all">
            ${labels.acceptAll}
          </button>
          <button type="button" class="zest-btn zest-btn--ghost" data-action="reject-all">
            ${labels.rejectAll}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get current selections from toggles
 */
function getSelections() {
  if (!shadowRoot) return currentSelections;

  const toggles = shadowRoot.querySelectorAll('.zest-toggle__input');
  const selections = { essential: true };

  toggles.forEach(toggle => {
    const category = toggle.dataset.category;
    if (category && category !== 'essential') {
      selections[category] = toggle.checked;
    }
  });

  return selections;
}

/**
 * Create and show the modal
 */
export function showModal(consent = {}, callbacks = {}) {
  if (modalElement) {
    return modalElement;
  }

  const config = getCurrentConfig();
  currentSelections = { ...consent };

  // Create host element
  modalElement = document.createElement('zest-modal');
  modalElement.setAttribute('data-theme', config.theme || 'light');

  // Create shadow root
  shadowRoot = modalElement.attachShadow({ mode: 'open' });

  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = generateStyles(config);
  shadowRoot.appendChild(styleEl);

  // Add modal HTML
  const container = document.createElement('div');
  container.innerHTML = createModalHTML(config, consent);
  shadowRoot.appendChild(container.firstElementChild);

  // Add event listeners
  const modal = shadowRoot.querySelector('.zest-modal-overlay');

  // Button clicks
  modal.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) {
      // Click on overlay background to close
      if (e.target === modal) {
        callbacks.onClose?.();
      }
      return;
    }

    switch (action) {
      case 'save':
        callbacks.onSave?.(getSelections());
        break;
      case 'accept-all':
        callbacks.onAcceptAll?.();
        break;
      case 'reject-all':
        callbacks.onRejectAll?.();
        break;
    }
  });

  // Keyboard handling
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      callbacks.onClose?.();
    }
  });

  // Track toggle changes
  shadowRoot.querySelectorAll('.zest-toggle__input').forEach(toggle => {
    toggle.addEventListener('change', () => {
      currentSelections = getSelections();
    });
  });

  // Mount to document
  document.body.appendChild(modalElement);

  // Trap focus
  requestAnimationFrame(() => {
    const firstButton = shadowRoot.querySelector('button');
    firstButton?.focus();
  });

  return modalElement;
}

/**
 * Hide the modal
 */
export function hideModal() {
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
    shadowRoot = null;
  }
}

/**
 * Check if modal is visible
 */
export function isModalVisible() {
  return modalElement !== null && document.body.contains(modalElement);
}

/**
 * Get current modal selections
 */
export function getModalSelections() {
  return getSelections();
}
