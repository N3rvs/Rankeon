import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/auth-context';
import { I18nProvider, type Locale } from '@/contexts/i18n-context';
import { Inter, Space_Grotesk as SpaceGrotesk } from 'next/font/google';
import type { Metadata } from 'next';
import { CookieConsentProvider } from '@/contexts/cookie-consent-context';
import { CookieConsentBanner } from '@/components/cookies/cookie-consent-banner';

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
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
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
