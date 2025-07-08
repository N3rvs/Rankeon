'use client';

import { useState, useEffect } from 'react';
import type { Scrim } from '@/lib/types';
import { PublicScrimCard } from './PublicScrimCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useI18n } from '@/contexts/i18n-context';
import { getFeaturedScrims } from '@/lib/actions/public';

export function FeaturedScrims() {
  const { t } = useI18n();
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFeaturedScrims().then(result => {
      if (result.success && result.data) {
        setScrims(result.data);
      } else {
        console.error("Failed to load featured scrims:", result.message);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
        <section className="py-20 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('LandingPage.upcoming_matches')}</h2>
                    <p className="text-lg text-muted-foreground mt-2">{t('LandingPage.community_matches')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                </div>
            </div>
        </section>
    );
  }

  if (scrims.length === 0) {
    return null; // Don't show the section if there are no scrims
  }

  return (
    <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold font-headline">{t('LandingPage.upcoming_matches')}</h2>
                <p className="text-lg text-muted-foreground mt-2">{t('LandingPage.community_matches')}</p>
            </div>
            <Carousel
                opts={{
                    align: "start",
                    loop: scrims.length > 3,
                }}
                className="w-full"
            >
                <CarouselContent>
                    {scrims.map((scrim) => (
                        <CarouselItem key={scrim.id} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                                <PublicScrimCard scrim={scrim} />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </div>
    </section>
  );
}
