import type {Metadata} from 'next';
import './../globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/auth-context';
import { Inter, Space_Grotesk as SpaceGrotesk } from 'next/font/google';

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
  title: 'SquadUp MVP',
  description: 'Find your squad, conquer the game.',
};
 
export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  return (
    <html lang={locale} className={cn("dark", inter.variable, spaceGrotesk.variable)}>
      <body className={cn("font-body antialiased")}>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
      </body>
    </html>
  );
}
