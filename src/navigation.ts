import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

export const locales = ['en', 'es', 'fr', 'de', 'it', 'pt'] as const;
export const defaultLocale = 'es';
export const localePrefix = 'as-needed';

// The `pathnames` object holds pairs of internal names and translated paths.
export const pathnames = {
  '/': '/',
  '/profile': '/profile',
  '/dashboard': '/dashboard',
  '/login': '/login',
  '/register': '/register',
  '/teams': '/teams',
  '/rooms': '/rooms',
  '/tournaments': '/tournaments',
  '/messages': {
    en: '/messages',
    es: '/mensajes',
    fr: '/messages',
    de: '/nachrichten',
    it: '/messaggi',
    pt: '/mensagens'
  },
};

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({locales, localePrefix, pathnames});