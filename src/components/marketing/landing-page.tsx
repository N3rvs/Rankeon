
'use client';

import { Button } from '@/components/ui/button';
import { Rocket, Users, Trophy, Check, Swords } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useI18n } from '@/contexts/i18n-context';
import { cn } from '@/lib/utils';
import { PublicLayout } from '../public-layout';

function PricingSection() {
    const { t } = useI18n();
    const plans = [
        {
            title: t('Pricing.player_title'),
            price: t('Pricing.player_price'),
            period: '',
            description: t('Pricing.player_desc'),
            features: t('Pricing.player_features').split('|'),
            cta: t('Pricing.player_cta'),
            isFeatured: false,
        },
        {
            title: t('Pricing.founder_title'),
            price: "€4.99",
            period: t('Pricing.monthly'),
            description: t('Pricing.founder_desc'),
            features: t('Pricing.founder_features').split('|'),
            cta: t('Pricing.founder_cta'),
            isFeatured: true
        },
        {
            title: t('Pricing.coach_title'),
            price: "€1.99",
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
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
                                    {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
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

  return (
    <PublicLayout>
        {/* Hero Section */}
        <section className="bg-background pt-20 pb-20 md:pt-32 md:pb-32 flex items-center justify-center text-center -mt-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
    </PublicLayout>
  );
}
