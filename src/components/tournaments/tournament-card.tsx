'use client';

import type { Tournament } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Gamepad2, Info, Shield, ShieldCheck, Recycle, Shuffle, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/contexts/i18n-context';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import React from 'react';

function getStatusBadgeVariant(status: Tournament['status']) {
  switch (status) {
    case 'upcoming':
      return 'secondary';
    case 'ongoing':
      return 'default';
    case 'completed':
      return 'outline';
    default:
      return 'secondary';
  }
}

const formatDetails: { [key: string]: { icon: React.ElementType, nameKey: string } } = {
    'single-elim': { icon: Shield, nameKey: 'TournamentGuideDialog.single_elim_title' },
    'double-elim': { icon: ShieldCheck, nameKey: 'TournamentGuideDialog.double_elim_title' },
    'round-robin': { icon: Recycle, nameKey: 'TournamentGuideDialog.round_robin_title' },
    'swiss': { icon: Shuffle, nameKey: 'TournamentGuideDialog.swiss_system_title' },
};

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { t } = useI18n();

  const statusText = {
    upcoming: t('TournamentDetailsPage.status_upcoming'),
    ongoing: t('TournamentDetailsPage.status_ongoing'),
    completed: t('TournamentDetailsPage.status_completed'),
  };
  
  const FormatIcon = formatDetails[tournament.format]?.icon || Trophy;
  const formatName = t(formatDetails[tournament.format]?.nameKey || 'TournamentDetailsPage.format_label');

  return (
    <Card className="flex flex-col transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
            <CardTitle className="font-headline text-xl flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <FormatIcon className="h-5 w-5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent><p>{formatName}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span>{tournament.name}</span>
            </CardTitle>
            <Badge variant={getStatusBadgeVariant(tournament.status)} className="capitalize shrink-0">{statusText[tournament.status]}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2 pt-1">
            <Gamepad2 className="h-4 w-4" /> {tournament.game}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        
        <div className="flex justify-between items-center text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
             <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>{tournament.participants?.length || 0} / {tournament.maxTeams} {t('TournamentDetailsPage.slots_label')}</span>
            </div>
            <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <span className="truncate">{tournament.prize || t('TournamentDetailsPage.no_prize')}</span>
            </div>
        </div>

        <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{t('TournamentDetailsPage.date_label')}: {format(tournament.startDate.toDate(), "PPP")}</span>
            </div>
             <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{t('TournamentDetailsPage.rank_label')}: {tournament.rankMin || tournament.rankMax ? `${tournament.rankMin || '?'} - ${tournament.rankMax || '?'}` : t('TournamentDetailsPage.no_rank_restriction')}</span>
            </div>
        </div>
        
        <p className="text-sm text-muted-foreground pt-3 border-t border-dashed line-clamp-2">
          {tournament.description}
        </p>
        
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/tournaments/${tournament.id}`}>
            <Info className="mr-2 h-4 w-4" />
            {t('TournamentsPage.view_details')}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
