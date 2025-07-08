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
    const pathname = request.nextUrl.pathname;
    const pathnameIsMissingLocale = i18nConfig.locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // Redirect if there is no locale
    if (pathnameIsMissingLocale) {
        const locale = getLocale(request);
        return NextResponse.redirect(
            new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
        );
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
