// src/components/rankings/scrim-rankings.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flame, Medal } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/i18n-context';

type RankedTeam = Team & {
    winRate: number;
    played: number;
}

export function ScrimRankings() {
  const { t } = useI18n();
  const [rankedTeams, setRankedTeams] = useState<RankedTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'teams'), where('stats.scrimsPlayed', '>', 0));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      
      const rankedData = teamsData
        .map(team => {
            const played = team.stats?.scrimsPlayed || 0;
            const won = team.stats?.scrimsWon || 0;
            const winRate = played > 0 ? (won / played) * 100 : 0;
            return { ...team, winRate, played };
        })
        .sort((a, b) => b.winRate - a.winRate || (b.stats?.scrimsWon || 0) - (a.stats?.scrimsWon || 0));
      
      setRankedTeams(rankedData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams for scrim rankings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (rankedTeams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[300px]">
        <Flame className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('RankingsPage.no_scrims_title')}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {t('RankingsPage.no_scrims_desc')}
        </p>
      </div>
    );
  }

  const getRankIcon = (index: number) => {
      if (index === 0) return <Medal className="h-5 w-5 text-yellow-500" />;
      if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
      if (index === 2) return <Medal className="h-5 w-5 text-yellow-700" />;
      return <span className="w-5 text-center text-sm font-bold">{index + 1}</span>;
  }

  return (
    <div className="rounded-md border bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">Scrims Played</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rankedTeams.map((team, index) => (
                    <TableRow key={team.id}>
                         <TableCell className="text-center">
                            {getRankIcon(index)}
                        </TableCell>
                        <TableCell>
                            <Link href={`/teams/${team.id}`} className="flex items-center gap-3 group">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
                                    <AvatarFallback>{team.name?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold group-hover:underline">{team.name}</h3>
                                </div>
                            </Link>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                            {team.played}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                            {team.winRate.toFixed(1)}%
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
