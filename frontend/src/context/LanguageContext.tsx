import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { locales } from '../i18n/locales';
import { getLanguage, setLanguage as setStoredLanguage } from '../utils/languageUtils';
import type { Language } from '@samverka/shared';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    formatDate: (date: string | Date | number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('sv');

    useEffect(() => {
        setLanguageState(getLanguage());
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        setStoredLanguage(lang);
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        // Explicitly type or cast to avoid implicit any if Language isn't perfectly matching keys in locales
        // In a real app we'd have a robust type for the dictionary. 
        // For now, we know locales has keys 'sv' and 'en'.
        let value: any = locales[language as 'sv' | 'en'];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };

    const formatDate = (date: string | Date | number): string => {
        return new Date(date).toLocaleString(language === 'sv' ? 'sv-SE' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, formatDate }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
