
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/i18n-context';

export function TournamentRankings() {
  const { t } = useI18n();
  const [completedTournaments, setCompletedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'tournaments'),
      where('status', '==', 'completed'),
      where('winnerId', '!=', null),
      orderBy('winnerId'),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setCompletedTournaments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching completed tournaments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    );
  }

  if (completedTournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[300px]">
        <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('RankingsPage.no_tournaments_title')}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {t('RankingsPage.no_tournaments_desc')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {completedTournaments.map(tournament => {
        const winner = tournament.participants?.find(p => p.id === tournament.winnerId);
        if (!winner) return null;

        return (
          <Card key={tournament.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <Link href={`/tournaments/${tournament.id}`} className="font-semibold hover:underline">{tournament.name}</Link>
                  <p className="text-sm text-muted-foreground">
                    {t('RankingsPage.tournament_won_on', { date: format(tournament.startDate.toDate(), "PPP") })}
                  </p>
                </div>
              </div>
              <Link href={`/teams/${winner.id}`} className="flex items-center gap-3 group">
                <div className="text-right">
                    <p className="font-semibold text-sm group-hover:underline">{winner.name}</p>
                    <p className="text-xs text-muted-foreground">{t('RankingsPage.champion')}</p>
                </div>
                <Avatar>
                  <AvatarImage src={winner.avatarUrl} data-ai-hint="team logo" />
                  <AvatarFallback>{winner.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
