// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18next from 'i18next';

import ru from './locales/ru.json';

export type Language = 'en' | 'ru';

export const LANGUAGES: Record<Language, string> = {
    en: 'English',
    ru: 'Русский',
};

const STORAGE_KEY = 'cvat-language';
const DEFAULT_LANGUAGE: Language = 'en';

function isSupportedLanguage(value: string | null | undefined): value is Language {
    return !!value && value in LANGUAGES;
}

function detectLanguage(): Language {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isSupportedLanguage(stored)) {
            return stored;
        }
    } catch {
        // local storage may be unavailable, fall back to the browser language
    }

    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const browserLanguage of browserLanguages) {
        const short = (browserLanguage || '').toLowerCase().split('-')[0];
        if (isSupportedLanguage(short)) {
            return short;
        }
    }

    return DEFAULT_LANGUAGE;
}

const language = detectLanguage();

// English strings from the source code are used as translation keys,
// so a key missing in a dictionary is shown as is (in English).
// The language is fixed for the page lifetime, see setLanguage()
i18next.init({
    lng: language,
    fallbackLng: false,
    resources: {
        ru: { translation: ru },
    },
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    initImmediate: false,
});

document.documentElement.lang = language;

export function getLanguage(): Language {
    return language;
}

export function setLanguage(value: Language): void {
    if (value === language) {
        return;
    }

    localStorage.setItem(STORAGE_KEY, value);
    // translated strings are also used outside of React components (shortcuts, reducers, etc.)
    // and are computed once, so the simplest reliable way to apply a new language is to reload the page
    window.location.reload();
}

export function t(key: string, params?: Record<string, unknown>): string {
    return i18next.t(key, params) as string;
}
