import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/auth-context';
import { I18nProvider, type Locale } from '@/contexts/i18n-context';
import { Inter, Space_Grotesk as SpaceGrotesk } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { CookieConsentProvider } from '@/contexts/cookie-consent-context';
import { CookieConsentBanner } from '@/components/cookies/cookie-consent-banner';
import { cookies } from 'next/headers';
import { i18nConfig } from '@/i18n-config';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = SpaceGrotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Rankeon',
    default: 'Rankeon - Find your team, conquer the game.',
  },
  description: 'Find your team, conquer the game.',
  manifest: '/manifest.json',
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png", // Recommended to add this file in public
  }
};

export const viewport: Viewport = {
  themeColor: "#1AD1D1",
}

function getLocale(requestHeaders: Headers): Locale {
    // Reading the cookie
    const cookieStore = cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    if (localeCookie && i18nConfig.locales.includes(localeCookie as Locale)) {
        return localeCookie as Locale;
    }
    
    // Fallback to default if no valid cookie
    return i18nConfig.defaultLocale;
}
 
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale(new Headers());
  
  return (
    <html lang={locale} className={cn("dark", inter.variable, spaceGrotesk.variable)}>
      <head />
      <body>
          <I18nProvider locale={locale}>
            <CookieConsentProvider>
              <AuthProvider>
                {children}
                <Toaster />
                <CookieConsentBanner />
              </AuthProvider>
            </CookieConsentProvider>
          </I18nProvider>
      </body>
    </html>
  );
}
