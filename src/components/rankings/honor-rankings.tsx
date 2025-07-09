'use client';

import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Medal, Twitch } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/i18n-context';
import { getHonorRankings } from '@/lib/actions/public';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '../ui/spinner';

type HonorRankingPlayer = Pick<UserProfile, 'id' | 'name' | 'avatarUrl' | 'isCertifiedStreamer'> & { totalHonors: number };

export function HonorRankings() {
  const { t } = useI18n();
  const [rankedPlayers, setRankedPlayers] = useState<HonorRankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    getHonorRankings().then(result => {
        if (result.success && result.data) {
            setRankedPlayers(result.data);
        } else {
            toast({ title: 'Error', description: 'Could not load honor rankings.', variant: 'destructive'});
        }
        setLoading(false);
    });
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
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
                                    <h3 className="font-semibold group-hover:underline flex items-center gap-2">
                                      {player.name}
                                      {player.isCertifiedStreamer && <Twitch className="h-4 w-4 text-purple-500" />}
                                    </h3>
                                </div>
                            </Link>
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                            {player.totalHonors}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
