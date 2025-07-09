import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/auth-context';
import { I18nProvider, type Locale } from '@/contexts/i18n-context';
import { Inter, Space_Grotesk as SpaceGrotesk } from 'next/font/google';
import type { Metadata } from 'next';
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
  title: 'Rankeon',
  description: 'Find your team, conquer the game.',
  icons: {
    icon: "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' rx='20' fill='hsl(180, 80%25, 50%25)'%3e%3c/rect%3e%3ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='70' font-weight='bold' fill='hsl(180, 100%25, 10%25)' font-family='sans-serif'%3eR%3c/text%3e%3c/svg%3e",
  }
};

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
