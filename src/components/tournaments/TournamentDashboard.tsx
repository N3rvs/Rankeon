'use client';

import type { Tournament } from '@/lib/types';
import { TournamentBracket } from './tournament-bracket';
import { StandingsTable } from './StandingsTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Gamepad2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function TournamentDashboard({ tournament }: { tournament: Tournament }) {
  const { userProfile, claims } = useAuth();
  const isMod = claims?.role === 'admin' || claims?.role === 'moderator';
  const isOwner = tournament.organizer.uid === userProfile?.id;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{tournament.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-1">
            <Gamepad2 className="h-4 w-4" /> {tournament.game}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">{tournament.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TournamentBracket tournament={tournament} isEditable={isMod || isOwner} />
        </div>
        <div className="xl:col-span-1">
          <StandingsTable tournament={tournament} />
        </div>
      </div>
    </div>
  );
}
