
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/contexts/i18n-context';
import { TournamentRankings } from '@/components/rankings/tournament-rankings';
import { ScrimRankings } from '@/components/rankings/scrim-rankings';
import { HonorRankings } from '@/components/rankings/honor-rankings';

export default function RankingsPage() {
  const { t } = useI18n();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            {t('RankingsPage.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('RankingsPage.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tournaments">{t('RankingsPage.tournaments_tab')}</TabsTrigger>
            <TabsTrigger value="scrims">{t('RankingsPage.scrims_tab')}</TabsTrigger>
            <TabsTrigger value="honors">{t('RankingsPage.honors_tab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="tournaments" className="mt-6">
            <TournamentRankings />
          </TabsContent>
          <TabsContent value="scrims" className="mt-6">
            <ScrimRankings />
          </TabsContent>
          <TabsContent value="honors" className="mt-6">
            <HonorRankings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
