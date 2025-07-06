import createMiddleware from 'next-intl/middleware';
import {pathnames, locales, localePrefix} from './navigation';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales,
 
  // Used when no locale matches
  defaultLocale: 'es',

  // Use the pathnames defined in `navigation.ts`
  pathnames,
  localePrefix
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // However, match all pathnames within `/` (e.g. `/?foo=bar`)
    '/'
  ]
};
