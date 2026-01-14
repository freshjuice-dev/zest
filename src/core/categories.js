/**
 * Default consent categories
 */
export const DEFAULT_CATEGORIES = {
  essential: {
    id: 'essential',
    label: 'Essential',
    description: 'Required for the website to function properly. Cannot be disabled.',
    required: true,
    default: true
  },
  functional: {
    id: 'functional',
    label: 'Functional',
    description: 'Enable personalized features like language preferences and themes.',
    required: false,
    default: false
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    description: 'Help us understand how visitors interact with our website.',
    required: false,
    default: false
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing',
    description: 'Used to deliver relevant advertisements and track campaign performance.',
    required: false,
    default: false
  }
};

/**
 * Default consent state
 */
export function getDefaultConsent() {
  return {
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  };
}

/**
 * Get all category IDs
 */
export function getCategoryIds() {
  return Object.keys(DEFAULT_CATEGORIES);
}
