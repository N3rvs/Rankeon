import { NextRequest, NextResponse } from 'next/server';
import { i18nConfig } from './i18n-config';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Check if the pathname starts with a supported locale prefix.
    const pathnameHasLocale = i18nConfig.locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // If a locale is in the path, redirect to the same path without it.
    // The actual locale is managed by a cookie, read by the root layout.
    if (pathnameHasLocale) {
        const localeToRemove = pathname.split('/')[1];
        const newPath = pathname.replace(`/${localeToRemove}`, '') || '/';
        return NextResponse.redirect(new URL(newPath, request.url));
    }
    
    return NextResponse.next();
}

export const config = {
    // Skip all paths that should not be internationalized
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
