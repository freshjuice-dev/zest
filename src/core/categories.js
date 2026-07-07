/**
 * Default consent categories
 */
export const DEFAULT_CATEGORIES = {
  essential: {
    id: 'essential',
    label: 'Essential',
    description: 'Required for the website to function properly. Cannot be disabled.',
    required: true,
    default: true,
    hidden: false
  },
  functional: {
    id: 'functional',
    label: 'Functional',
    description: 'Enable personalized features like language preferences and themes.',
    required: false,
    default: false,
    hidden: false
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    description: 'Help us understand how visitors interact with our website.',
    required: false,
    default: false,
    hidden: false
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing',
    description: 'Used to deliver relevant advertisements and track campaign performance.',
    required: false,
    default: false,
    hidden: false
  }
};

/**
 * Default consent state.
 *
 * Hidden categories are forced to false — if a site hides a toggle from
 * visitors, it must not end up "accepted" behind the scenes.
 */
export function getDefaultConsent(categoryConfig = DEFAULT_CATEGORIES) {
  const consent = {
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  };
  for (const key of Object.keys(DEFAULT_CATEGORIES)) {
    const cat = categoryConfig[key];
    if (cat?.hidden && !cat.required) {
      consent[key] = false;
    }
  }
  return consent;
}

/**
 * Get all category IDs
 */
export function getCategoryIds() {
  return Object.keys(DEFAULT_CATEGORIES);
}

/**
 * Get the list of category IDs that are hidden from the settings modal.
 * Essential is never hidden.
 */
export function getHiddenCategoryIds(categoryConfig = DEFAULT_CATEGORIES) {
  return Object.keys(DEFAULT_CATEGORIES).filter((key) =>
    categoryConfig[key]?.hidden === true && !categoryConfig[key]?.required
  );
}
