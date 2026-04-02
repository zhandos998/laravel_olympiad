import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALE_KEY, SUPPORTED_LOCALES } from '../constants/locale';
import { translations } from '../constants/translations';

const LocaleContext = createContext(null);

function getInitialLocale() {
    const storedLocale = localStorage.getItem(LOCALE_KEY);

    if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) {
        return storedLocale;
    }

    return DEFAULT_LOCALE;
}

function resolvePath(locale, key) {
    return key.split('.').reduce((value, part) => value?.[part], translations[locale]);
}

export function LocaleProvider({ children }) {
    const [locale, setLocaleState] = useState(getInitialLocale);

    useEffect(() => {
        document.documentElement.lang = locale === 'kaz' ? 'kk' : 'ru';
    }, [locale]);

    const setLocale = (nextLocale) => {
        if (!SUPPORTED_LOCALES.includes(nextLocale)) {
            return;
        }

        localStorage.setItem(LOCALE_KEY, nextLocale);
        setLocaleState(nextLocale);
    };

    const t = (key, replacements = {}) => {
        const template = resolvePath(locale, key) ?? resolvePath(DEFAULT_LOCALE, key) ?? key;

        return Object.entries(replacements).reduce(
            (message, [name, value]) => message.replaceAll(`:${name}`, value),
            template,
        );
    };

    const value = useMemo(
        () => ({
            locale,
            setLocale,
            t,
            locales: SUPPORTED_LOCALES,
        }),
        [locale],
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    const context = useContext(LocaleContext);

    if (!context) {
        throw new Error('useLocale must be used inside LocaleProvider');
    }

    return context;
}
