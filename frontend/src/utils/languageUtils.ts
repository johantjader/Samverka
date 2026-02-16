import type { Language } from '@samverka/shared';

const STORAGE_KEY = 'samverka_language';

export const getLanguage = (): Language => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'sv' || stored === 'en') {
        return stored as Language;
    }
    // Default to browser language or 'sv'
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'en') ? 'en' : 'sv';
};

export const setLanguage = (lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
};
