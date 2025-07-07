'use client';

import { useMemo } from 'react';
import type { Tournament, Match, MatchTeam } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Check, X, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n-context';

type TeamStats = {
  id: string;
  name: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  status: 'champion' | 'eliminated' | 'active';
}

function calculateStandings(tournament: Tournament): TeamStats[] {
  const allMatches = tournament.bracket?.rounds.flatMap(r => r.matches) || [];
  const participants = tournament.participants || [];

  const stats = participants.map(team => {
    let wins = 0;
    let losses = 0;

    for (const match of allMatches) {
      const isInMatch = match.team1?.id === team.id || match.team2?.id === team.id;
      if (isInMatch && match.winnerId) {
        if (match.winnerId === team.id) {
          wins++;
        } else {
          losses++;
        }
      }
    }
    
    let status: TeamStats['status'] = 'active';
    if (tournament.winnerId === team.id) {
        status = 'champion';
    } else if (losses > 0 && tournament.format === 'single-elim') { // Assuming single elim for now
        status = 'eliminated';
    }

    return {
      id: team.id,
      name: team.name,
      avatarUrl: team.avatarUrl || '',
      wins,
      losses,
      status,
    };
  });

  return stats.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

export function StandingsTable({ tournament }: { tournament: Tournament }) {
  const { t } = useI18n();
  const standings = useMemo(() => calculateStandings(tournament), [tournament]);
  
  const getStatusDisplay = (status: TeamStats['status']) => {
    switch (status) {
      case 'champion':
        return <div className="flex items-center justify-center gap-1.5 text-yellow-500 font-bold"><Trophy className="h-4 w-4" /><span>{t('StandingsTable.status_champion')}</span></div>;
      case 'active':
        return <div className="flex items-center justify-center text-green-500"><Check className="h-4 w-4" /></div>;
      case 'eliminated':
        return <div className="flex items-center justify-center text-destructive"><X className="h-4 w-4" /></div>;
      default:
        return null;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{t('StandingsTable.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('StandingsTable.teams_header')}</TableHead>
              <TableHead className="text-center">{t('StandingsTable.victories_header')}</TableHead>
              <TableHead className="text-center">{t('StandingsTable.wl_header')}</TableHead>
              <TableHead className="text-center">{t('StandingsTable.status_header')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map(team => (
              <TableRow key={team.id} className={cn(team.status === 'eliminated' && 'opacity-50')}>
                <TableCell>
                  <div className="flex items-center gap-3 font-medium">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
                      <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span>{team.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{team.wins}</TableCell>
                <TableCell className="text-center text-muted-foreground">{`${team.wins}-${team.losses}`}</TableCell>
                <TableCell className="text-center text-xs uppercase font-bold tracking-wider">
                  {getStatusDisplay(team.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
