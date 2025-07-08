
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { Footer } from './layout/footer';
import { Gamepad2 } from 'lucide-react';

function Header() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  return (
    <header className="h-28 w-full z-20 sticky top-0 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-3xl font-bold font-headline text-primary">
                <Gamepad2 className="h-8 w-8" />
                <span>Scrimly</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
                <Link href="/about" className="text-lg font-medium text-muted-foreground hover:text-foreground">{t('LandingPage.about_us')}</Link>
                <Link href="/games" className="text-lg font-medium text-muted-foreground hover:text-foreground">{t('LandingPage.games')}</Link>
                <Link href="/support" className="text-lg font-medium text-muted-foreground hover:text-foreground">{t('Footer.support_title')}</Link>
            </nav>
            <div className="flex items-center gap-2">
                <LanguageSwitcher />
                {loading ? (
                <div className="flex items-center gap-2">
                    <div className="h-9 w-20 rounded-md bg-muted animate-pulse" />
                    <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
                </div>
                ) : user ? (
                <Button asChild>
                    <Link href="/dashboard">{t('LandingPage.go_to_app')}</Link>
                </Button>
                ) : (
                <>
                    <Button variant="ghost" asChild>
                    <Link href="/login">{t('LandingPage.login')}</Link>
                    </Button>
                    <Button asChild>
                    <Link href="/register">{t('LandingPage.register')}</Link>
                    </Button>
                </>
                )}
            </div>
        </div>
    </header>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
