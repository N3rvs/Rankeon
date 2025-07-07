'use client';

import { useState, useEffect } from 'react';
import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Trophy } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import { TournamentGuideDialog } from '@/components/tournaments/tournament-guide-dialog';

export default function TournamentsPage() {
  const { claims } = useAuth();
  const { t } = useI18n();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const canPropose =
    claims?.role === 'admin' ||
    claims?.role === 'moderator' ||
    claims?.isCertifiedStreamer === true;

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'tournaments'),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tournaments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        <div className="flex items-center gap-2">
          <TournamentGuideDialog />
          {canPropose && <ProposeTournamentDialog />}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">{t('TournamentsPage.no_tournaments_title')}</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {t('TournamentsPage.no_tournaments_subtitle')}
          </p>
        </div>
      )}
    </div>
  );
}
