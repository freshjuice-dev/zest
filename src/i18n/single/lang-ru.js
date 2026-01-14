/**
 * RU only translation - auto-generated
 * Do not edit manually, run: npm run build
 */
export const translations = {
  ru: {
      "labels": {
          "banner": {
              "title": "Мы ценим вашу конфиденциальность",
              "description": "Мы используем файлы cookie для улучшения вашего опыта просмотра, предоставления персонализированного контента и анализа нашего трафика. Нажимая «Принять все», вы соглашаетесь на использование файлов cookie.",
              "acceptAll": "Принять все",
              "rejectAll": "Отклонить все",
              "settings": "Настройки"
          },
          "modal": {
              "title": "Настройки конфиденциальности",
              "description": "Управляйте своими настройками файлов cookie. Вы можете включить или отключить различные типы файлов cookie ниже.",
              "save": "Сохранить настройки",
              "acceptAll": "Принять все",
              "rejectAll": "Отклонить все"
          },
          "widget": {
              "label": "Настройки cookie"
          }
      },
      "categories": {
          "essential": {
              "label": "Необходимые",
              "description": "Требуются для правильной работы сайта. Не могут быть отключены."
          },
          "functional": {
              "label": "Функциональные",
              "description": "Позволяют использовать персонализированные функции, такие как языковые настройки и темы."
          },
          "analytics": {
              "label": "Аналитические",
              "description": "Помогают нам понять, как посетители взаимодействуют с нашим сайтом."
          },
          "marketing": {
              "label": "Маркетинговые",
              "description": "Используются для показа релевантной рекламы и измерения эффективности кампаний."
          }
      }
  }
};

export const supportedLanguages = ['ru'];

export function detectLanguage() {
  return 'ru';
}

export function getTranslation() {
  return translations.ru;
}
