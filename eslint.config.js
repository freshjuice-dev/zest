import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        AbortController: 'readonly',
        CSSStyleDeclaration: 'readonly',
        CustomEvent: 'readonly',
        Document: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        HTMLIFrameElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLLinkElement: 'readonly',
        HTMLScriptElement: 'readonly',
        MutationObserver: 'readonly',
        Node: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        XMLHttpRequest: 'readonly',
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        queueMicrotask: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none', argsIgnorePattern: '^_', varsIgnorePattern: '^_$' }]
    }
  },
  { ignores: ['dist/**', 'packages/**', 'examples/**', 'locales/**', 'node_modules/**'] }
];