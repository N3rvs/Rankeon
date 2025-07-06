import createMiddleware from 'next-intl/middleware';
 
export const locales = ['en', 'es', 'fr', 'de', 'it', 'pt'];
export const defaultLocale = 'es';

export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,
 
  // Used when no locale matches
  defaultLocale: defaultLocale
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(de|en|es|fr|it|pt)/:path*']
};