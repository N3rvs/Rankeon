'use client';

import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Trophy } from 'lucide-react';

export default function TournamentsPage() {
  const { claims } = useAuth();
  const { t } = useI18n();
  const canPropose =
    claims?.role === 'admin' ||
    claims?.role === 'moderator' ||
    claims?.isCertifiedStreamer === true;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            {t('TournamentsPage.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('TournamentsPage.subtitle')}
          </p>
        </div>
        {canPropose && <ProposeTournamentDialog />}
      </div>
       <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
        <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('TournamentsPage.no_tournaments_title')}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {t('TournamentsPage.no_tournaments_subtitle')}
        </p>
      </div>
    </div>
  );
}
