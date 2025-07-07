
'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import ScrimlyLogo from '@/assets/logo.png';
import { Separator } from '@/components/ui/separator';

function Header() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  return (
    <header className="h-28 w-full z-20 sticky top-0 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <Link href="/">
                <Image src={ScrimlyLogo} alt="Scrimly Logo" width={80} height={80} />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
                <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t('LandingPage.about_us')}</Link>
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

function Footer() {
    const { t } = useI18n();
    const [currentYear, setCurrentYear] = useState<number | null>(null);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);
    return (
        <footer className="w-full border-t border-border/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
                 <div className="mb-2">
                    <span>© {currentYear || new Date().getFullYear()} Scrimly. </span>
                    <span>{t('LandingPage.footer_rights')}</span>
                </div>
                <div className="flex justify-center items-center gap-4">
                    <Button variant="link" className="p-0 h-auto text-muted-foreground" asChild>
                        <Link href="/terms">{t('LandingPage.terms')}</Link>
                    </Button>
                    <Separator orientation="vertical" className="h-4 bg-border" />
                    <Button variant="link" className="p-0 h-auto text-muted-foreground" asChild>
                        <Link href="/privacy">{t('LandingPage.privacy')}</Link>
                    </Button>
                </div>
            </div>
        </footer>
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
