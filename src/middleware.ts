import { NextRequest, NextResponse } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const i18nConfig = {
    defaultLocale: 'es',
    locales: ['en', 'es', 'de', 'fr', 'it', 'pt']
};

function getLocale(request: NextRequest): string {
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
    
    const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
    const locales = i18nConfig.locales;
    
    try {
        return matchLocale(languages, locales, i18nConfig.defaultLocale);
    } catch (e) {
        // Fallback to default if matching fails
        return i18nConfig.defaultLocale;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Step 1: Check if the pathname already has a supported locale prefix
    const pathnameHasLocale = i18nConfig.locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // If it does, redirect to the same path without the locale prefix
    if (pathnameHasLocale) {
        const localeToRemove = pathname.split('/')[1];
        const newPath = pathname.replace(`/${localeToRemove}`, '') || '/';
        return NextResponse.redirect(new URL(newPath, request.url));
    }
    
    // Step 2: If no locale prefix, proceed with normal handling
    // The locale will be determined by the root layout from the cookie or browser headers.
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
