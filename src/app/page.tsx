
'use client';

import { Button } from '@/components/ui/button';
import { Rocket, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/contexts/i18n-context';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import ScrimlyLogo from '@/assets/logo.png';

function HomePageContent() {
  const { t } = useI18n();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Image src={ScrimlyLogo} alt="Scrimly Logo" width={32} height={32} />
          <h1 className="text-2xl font-bold font-headline">Scrimly</h1>
        </div>
        <nav className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">{t('HomePage.get_started')}</Link>
          </Button>
        </nav>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[calc(100vh-4rem)] flex items-center justify-center text-center">
            <div className="absolute inset-0">
                <Image 
                    src="https://placehold.co/1200x800.png"
                    alt="Gaming background"
                    fill
                    className="object-cover opacity-30"
                    data-ai-hint="valorant gaming"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            </div>

            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
                 <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-4">
                    {t('HomePage.title')}
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
                    {t('HomePage.subtitle')}
                </p>
                <div className="flex justify-center gap-4">
                    <Button size="lg" asChild>
                        <Link href="/register">
                            <Rocket className="mr-2 h-5 w-5" />
                            {t('HomePage.find_squad')}
                        </Link>
                    </Button>
                     <Button size="lg" variant="secondary" asChild>
                        <Link href="/register">
                            <span>{t('HomePage.register_player')}</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('HomePage.built_for_champions')}</h2>
                <p className="text-lg text-muted-foreground mt-2">{t('HomePage.champions_subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
               <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Users className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">{t('HomePage.find_players_title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{t('HomePage.find_players_desc')}</p>
                    </CardContent>
                </Card>
                 <Card className="bg-card border-border/50 text-center pt-6">
                    <CardHeader>
                         <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <CardTitle className="font-headline mt-4">{t('HomePage.ai_tools_title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{t('HomePage.ai_tools_desc')}</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm border-t border-border/50">
        {currentYear ? t('HomePage.footer_text', { year: currentYear }) : ''}
      </footer>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Skeleton className="h-24 w-24 rounded-full bg-muted" />
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <LoadingScreen />;
  }

  return <HomePageContent />;
}
