'use client';

import { useState } from 'react';
import type { Tournament } from '@/lib/types';
import { TournamentBracket } from './tournament-bracket';
import { StandingsTable } from './StandingsTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Gamepad2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { EditTournamentDialog } from './edit-tournament-dialog';
import { Button } from '../ui/button';
import { useI18n } from '@/contexts/i18n-context';

export function TournamentDashboard({ tournament }: { tournament: Tournament }) {
  const { userProfile, claims } = useAuth();
  const { t } = useI18n();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const isMod = claims?.role === 'admin' || claims?.role === 'moderator';
  const isOwner = tournament.organizer.uid === userProfile?.id;
  const isEditable = isMod || isOwner;

  return (
    <div className="space-y-6">
      <EditTournamentDialog tournament={tournament} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      <Card>
        <CardHeader>
           <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="font-headline text-3xl">{tournament.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 pt-1">
                <Gamepad2 className="h-4 w-4" /> {tournament.game}
              </CardDescription>
            </div>
            {isEditable && (
                <Button variant="secondary" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4"/>
                    {t('TeamsPage.edit')}
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">{tournament.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TournamentBracket tournament={tournament} isEditable={isEditable} />
        </div>
        <div className="xl:col-span-1">
          <StandingsTable tournament={tournament} />
        </div>
      </div>
    </div>
  );
}
