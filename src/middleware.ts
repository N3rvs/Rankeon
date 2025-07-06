import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, pathnames } from './i18n';

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
