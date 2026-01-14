/**
 * English only translation
 */
export const translations = {
  en: {
    labels: {
      banner: {
        title: 'We value your privacy',
        description: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
        acceptAll: 'Accept All',
        rejectAll: 'Reject All',
        settings: 'Settings'
      },
      modal: {
        title: 'Privacy Settings',
        description: 'Manage your cookie preferences. You can enable or disable different types of cookies below.',
        save: 'Save Preferences',
        acceptAll: 'Accept All',
        rejectAll: 'Reject All'
      },
      widget: {
        label: 'Cookie Settings'
      }
    },
    categories: {
      essential: {
        label: 'Essential',
        description: 'Required for the website to function properly. Cannot be disabled.'
      },
      functional: {
        label: 'Functional',
        description: 'Enable personalized features like language preferences and themes.'
      },
      analytics: {
        label: 'Analytics',
        description: 'Help us understand how visitors interact with our website.'
      },
      marketing: {
        label: 'Marketing',
        description: 'Used to deliver relevant advertisements and track campaign performance.'
      }
    }
  }
};

export const supportedLanguages = ['en'];

export function detectLanguage() {
  return 'en';
}

export function getTranslation() {
  return translations.en;
}
