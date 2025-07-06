import {
  createLocalizedPathnamesNavigation,
  Pathnames
} from 'next-intl/navigation';
 
export const locales = ['en', 'es', 'fr', 'de', 'it', 'pt'] as const;
export const localePrefix = 'always'; // Default
 
// The `pathnames` object holds pairs of internal
// and external paths, separated by locale.
export const pathnames = {
  // If all locales use the same path, use the usual
  // route organisation.
  '/': '/',
  '/dashboard': '/dashboard',
  '/login': '/login',
  '/register': '/register',
  '/profile': '/profile',
  '/teams': '/teams',
  '/admin': '/admin',
  '/moderator': '/moderator',
 
} satisfies Pathnames<typeof locales>;
 
export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation({locales, localePrefix, pathnames});
