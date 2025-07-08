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
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
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
};
 
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || i18nConfig.defaultLocale) as Locale;
  
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
