import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es', 'fr', 'de', 'it', 'pt'],
 
  // Used when no locale matches
  defaultLocale: 'es'
});
 
export const config = {
  // Match all pathnames except for
  // - API routes
  // - Next.js internals
  // - Files with an extension (e.g. favicon.ico)
  matcher: [
    // Match all pathnames except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
