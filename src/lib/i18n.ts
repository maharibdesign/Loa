import en from '../../public/locales/en.json';
import am from '../../public/locales/am.json';

const languages = { en, am };

export function useTranslations(lang: keyof typeof languages) {
  return function t(key: string): string {
    // Navigate through nested keys e.g., "header.title"
    const keys = key.split('.');
    let result = languages[lang];
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Return key if not found for easier debugging
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  };
}