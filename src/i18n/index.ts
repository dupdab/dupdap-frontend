import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';

/** Shared react-i18next instance. LocaleProvider keeps it in sync with the
 * persisted merchant locale so both translation APIs use the same language. */
export const i18nInstance = i18n.createInstance();

if (!i18nInstance.isInitialized) {
  i18nInstance.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      pt: { translation: pt },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18nInstance;
