/**
 * Public API - Exposes Zest methods to consumers
 */

import { showBanner, hideBanner, isBannerVisible } from '../ui/banner.js';
import { showModal, hideModal, isModalVisible } from '../ui/modal.js';
import { showWidget, hideWidget, removeWidget } from '../ui/widget.js';
import {
  getConsent,
  hasConsent,
  acceptAll,
  rejectAll,
  updateConsent,
  resetConsent,
  hasConsentDecision,
  getConsentProof
} from '../storage/consent-store.js';
import { getCurrentConfig } from '../config/parser.js';
import { emitShow, emitHide } from '../storage/events.js';

/**
 * Show the consent banner
 */
export function show() {
  if (isModalVisible()) {
    hideModal();
  }
  emitShow('banner');
  // Return internal showBanner but don't expose callbacks
  return true;
}

/**
 * Hide the consent banner
 */
export function hide() {
  hideBanner();
  emitHide('banner');
  return true;
}

/**
 * Show the settings modal
 */
export function showSettings() {
  if (isBannerVisible()) {
    hideBanner();
  }
  emitShow('modal');
  return true;
}

/**
 * Hide the settings modal
 */
export function hideSettings() {
  hideModal();
  emitHide('modal');
  return true;
}

/**
 * Reset consent and show banner again
 */
export function reset() {
  resetConsent();
  hideModal();
  removeWidget();
  return true;
}

/**
 * Get complete consent state
 */
export { getConsent };

/**
 * Check if a specific category has consent
 */
export { hasConsent };

/**
 * Check if user has made any consent decision
 */
export { hasConsentDecision };

/**
 * Get consent proof for compliance
 */
export { getConsentProof };

/**
 * Get current configuration
 */
export function getConfig() {
  return getCurrentConfig();
}
