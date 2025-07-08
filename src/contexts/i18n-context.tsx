
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import Cookies from 'js-cookie';

// Import all message files
import enMessages from '../messages/en.json';
import esMessages from '../messages/es.json';
import deMessages from '../messages/de.json';
import frMessages from '../messages/fr.json';
import itMessages from '../messages/it.json';
import ptMessages from '../messages/pt.json';
import { i18nConfig } from '@/i18n-config';

export type Locale = 'en' | 'es' | 'de' | 'fr' | 'it' | 'pt';

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
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  
  // Ensure client-side state is in sync with the server-provided initial locale
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365 });
    setLocaleState(newLocale);
  };

  const t = (key: string, values?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    let result: any = messages[locale];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to default locale if key not found
        let fallbackResult: any = messages[i18nConfig.defaultLocale];
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        result = fallbackResult || key; // Fallback to the key itself if not found in default either
        break;
      }
    }

    let str = String(result || key);

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
