import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n-config';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales,
 
  // Used when no locale matches
  defaultLocale,

  // Don't use a locale prefix for the default locale
  localePrefix: 'as-needed'
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
