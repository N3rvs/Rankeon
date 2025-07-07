'use client';

import { Button } from '@/components/ui/button';
import { Rocket, Users, Trophy, Check, Swords } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useI18n } from '@/contexts/i18n-context';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import ScrimlyLogo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

function Header() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  return (
    <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between z-10 sticky top-0 bg-background/80 backdrop-blur-sm border-b">
      <Link href="/">
        <Image src={ScrimlyLogo} alt="Scrimly Logo" width={40} height={40} />
      </Link>
      <nav className="hidden md:flex items-center gap-6">
        <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t('LandingPage.news')}</Link>
        <Link href="/tournaments" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t('LandingPage.tournaments')}</Link>
        <Link href="/rankings" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t('LandingPage.rankings')}</Link>
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
    </header>
  );
}

function PricingSection() {
    const { t } = useI18n();
    const plans = [
        {
            title: t('Pricing.founder_title'),
            price: "€9.99",
            period: t('Pricing.monthly'),
            description: t('Pricing.founder_desc'),
            features: t('Pricing.founder_features').split('|'),
            cta: t('Pricing.founder_cta'),
            isFeatured: true
        },
        {
            title: t('Pricing.coach_title'),
            price: "€7.99",
            period: t('Pricing.monthly'),
            description: t('Pricing.coach_desc'),
            features: t('Pricing.coach_features').split('|'),
            cta: t('Pricing.coach_cta'),
            isFeatured: false
        }
    ];

    return (
        <section id="pricing" className="py-20 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('Pricing.title')}</h2>
                    <p className="text-lg text-muted-foreground mt-2">{t('Pricing.subtitle')}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {plans.map(plan => (
                        <Card key={plan.title} className={cn("flex flex-col", plan.isFeatured && "border-primary ring-2 ring-primary shadow-lg")}>
                            <CardHeader className="pb-4">
                                {plan.isFeatured && <div className="text-center text-sm font-bold text-primary pb-2">{t('Pricing.most_popular')}</div>}
                                <CardTitle className="font-headline text-2xl">{plan.title}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <div className="flex items-baseline">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                                </div>
                                <ul className="space-y-3">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-primary" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className={cn("w-full", !plan.isFeatured && "bg-secondary text-secondary-foreground hover:bg-secondary/80")} asChild>
                                    <Link href="/register">{plan.cta}</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function LandingPage() {
  const { t } = useI18n();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 flex items-center justify-center text-center">
            <div className="absolute inset-0">
                <Image 
                    src="https://placehold.co/1200x800.png"
                    alt="Gaming background"
                    fill
                    className="object-cover opacity-20"
                    data-ai-hint="valorant gaming"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
                 <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-4">
                    {t('LandingPage.title')}
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
                    {t('LandingPage.subtitle')}
                </p>
                <div className="flex justify-center gap-4">
                    <Button size="lg" asChild>
                        <Link href="/register">
                            <Rocket className="mr-2 h-5 w-5" />
                            {t('LandingPage.get_started')}
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('LandingPage.features_title')}</h2>
                <p className="text-lg text-muted-foreground mt-2">{t('LandingPage.features_subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
               <div className="text-center">
                    <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                        <Users className="h-8 w-8" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{t('LandingPage.find_players_title')}</h3>
                    <p className="text-muted-foreground mt-2">{t('LandingPage.find_players_desc')}</p>
                </div>
                 <div className="text-center">
                     <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                        <Swords className="h-8 w-8" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{t('LandingPage.scrims_title')}</h3>
                    <p className="text-muted-foreground mt-2">{t('LandingPage.scrims_desc')}</p>
                </div>
                 <div className="text-center">
                     <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                        <Trophy className="h-8 w-8" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{t('LandingPage.tournaments_title')}</h3>
                    <p className="text-muted-foreground mt-2">{t('LandingPage.tournaments_desc')}</p>
                </div>
            </div>
          </div>
        </section>
        
        <PricingSection />
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm border-t border-border/50">
        {t('LandingPage.footer_text', { year: currentYear || new Date().getFullYear() })}
      </footer>
    </div>
  );
}
