'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Medal } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/i18n-context';

function calculateTotalHonors(user: UserProfile): number {
    if (!user.honorCounts) {
        return 0;
    }
    return Object.values(user.honorCounts).reduce((sum, count) => sum + count, 0);
}

export function HonorRankings() {
  const { t } = useI18n();
  const [rankedPlayers, setRankedPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      
      const sortedUsers = usersData
        .map(user => ({
          ...user,
          totalHonors: calculateTotalHonors(user),
        }))
        .filter(user => user.totalHonors > 0)
        .sort((a, b) => b.totalHonors - a.totalHonors);
      
      setRankedPlayers(sortedUsers.slice(0, 50));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users for honor rankings:", error);
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

  if (rankedPlayers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[300px]">
        <Award className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('RankingsPage.no_honors_title')}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {t('RankingsPage.no_honors_desc')}
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
                    <TableHead className="w-12 text-center">{t('HonorRankings.rank_header')}</TableHead>
                    <TableHead>{t('HonorRankings.player_header')}</TableHead>
                    <TableHead className="text-right">{t('HonorRankings.honors_header')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rankedPlayers.map((player, index) => (
                    <TableRow key={player.id}>
                         <TableCell className="text-center">
                            {getRankIcon(index)}
                        </TableCell>
                        <TableCell>
                            <Link href={`/users/${player.id}`} className="flex items-center gap-3 group">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={player.avatarUrl} alt={player.name} data-ai-hint="person avatar" />
                                    <AvatarFallback>{player.name?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold group-hover:underline">{player.name}</h3>
                                </div>
                            </Link>
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                            {calculateTotalHonors(player)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
