import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es', 'fr', 'de', 'it', 'pt'],
 
  // Used when no locale matches
  defaultLocale: 'es'
});
 
export const config = {
  // Match all pathnames except for
  // - The API routes
  // - The Next.js meta files
  // - The static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
