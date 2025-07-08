'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Import all message files
import enMessages from '../messages/en.json';
import esMessages from '../messages/es.json';
import deMessages from '../messages/de.json';
import frMessages from '../messages/fr.json';
import itMessages from '../messages/it.json';
import ptMessages from '../messages/pt.json';

export type Locale = 'en' | 'es' | 'de' | 'fr' | 'it' | 'pt';

export const i18nConfig = {
    defaultLocale: 'es' as Locale,
    locales: ['en', 'es', 'de', 'fr', 'it', 'pt'] as Locale[]
};

const messages: Record<Locale, any> = {
  en: enMessages,
  es: esMessages,
  de: deMessages,
  fr: frMessages,
  it: itMessages,
  pt: ptMessages,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: { [key: string]: string | number }) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, locale: initialLocale }: { children: ReactNode, locale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = (key: string, values?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    let result: any = messages[locale];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found in current locale
        let fallbackResult: any = messages['en'];
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        result = fallbackResult || key;
        break;
      }
    }

    let str = result || key;

    if (values) {
      Object.keys(values).forEach(valueKey => {
        str = str.replace(`{${valueKey}}`, String(values[valueKey]));
      });
    }

    return str;
  };

  const value = {
    locale,
    setLocale,
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
