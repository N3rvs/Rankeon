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
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
