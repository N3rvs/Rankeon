'use client';

import type { Tournament } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Gamepad2, Info } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/contexts/i18n-context';

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

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { t } = useI18n();

  const statusText = {
    upcoming: t('TournamentDetailsPage.status_upcoming'),
    ongoing: t('TournamentDetailsPage.status_ongoing'),
    completed: t('TournamentDetailsPage.status_completed'),
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="font-headline text-xl">{tournament.name}</CardTitle>
            <Badge variant={getStatusBadgeVariant(tournament.status)} className="capitalize">{statusText[tournament.status]}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" /> {tournament.game}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Starts on {format(tournament.startDate.toDate(), "PPP")}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
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
