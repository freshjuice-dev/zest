/**
 * Do Not Track (DNT) Detection
 *
 * Detects browser DNT/GPC signals for privacy compliance
 */

/**
 * Check if Do Not Track is enabled
 * Checks both DNT header and Global Privacy Control (GPC)
 */
export function isDoNotTrackEnabled() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // Check DNT (Do Not Track)
  // Values: "1" = enabled, "0" = disabled, null/undefined = not set
  const dnt = navigator.doNotTrack ||
              window.doNotTrack ||
              navigator.msDoNotTrack;

  if (dnt === '1' || dnt === 'yes' || dnt === true) {
    return true;
  }

  // Check GPC (Global Privacy Control) - newer standard
  // https://globalprivacycontrol.org/
  if (navigator.globalPrivacyControl === true) {
    return true;
  }

  return false;
}

/**
 * Get DNT signal details for logging/debugging
 */
export function getDNTDetails() {
  if (typeof navigator === 'undefined') {
    return { enabled: false, source: null };
  }

  const dnt = navigator.doNotTrack ||
              window.doNotTrack ||
              navigator.msDoNotTrack;

  if (dnt === '1' || dnt === 'yes' || dnt === true) {
    return { enabled: true, source: 'dnt' };
  }

  if (navigator.globalPrivacyControl === true) {
    return { enabled: true, source: 'gpc' };
  }

  return { enabled: false, source: null };
}
