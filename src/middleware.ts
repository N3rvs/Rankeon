import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { pathnames } from './navigation';

export default createMiddleware({
  defaultLocale,
  locales,
  pathnames,
  localePrefix: 'as-needed'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(de|en|es|fr|it|pt)/:path*']
};
