import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';

const resources = {
  en: { translation: en },
  'zh-TW': { translation: zhTW },
};

// Detect device language
const deviceLocales = getLocales();
const deviceLang = deviceLocales[0]?.languageTag ?? 'en';

// Map device language to supported locale
function resolveLocale(tag: string): string {
  if (tag.startsWith('zh')) return 'zh-TW';
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLocale(deviceLang),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
