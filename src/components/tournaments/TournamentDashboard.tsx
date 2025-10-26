
'use client';

import { useState } from 'react';
import type { Tournament } from '@/lib/types';
import { TournamentBracket } from './tournament-bracket';
import { StandingsTable } from './StandingsTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Gamepad2, Edit, Trophy, Binary } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { EditTournamentDialog } from './edit-tournament-dialog';
import { Button } from '../ui/button';
import { useI18n } from '@/contexts/i18n-context';
import { generateTournamentStructure } from '@/lib/actions/tournaments';
import { useToast } from '@/hooks/use-toast';

export function TournamentDashboard({ tournament }: { tournament: Tournament }) {
  const { userProfile, claims } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isMod = claims?.role === 'admin' || claims?.role === 'moderator';
  const isOwner = tournament.organizer.uid === userProfile?.id;
  const isEditable = isMod || isOwner;

  const prizeText = tournament.prize
    ? `${tournament.currency || ''} ${tournament.prize}`.trim()
    : t('TournamentDetailsPage.no_prize');

  const handleGenerateStructure = async () => {
    setIsGenerating(true);
    const result = await generateTournamentStructure({ tournamentId: tournament.id });
    if (result.success) {
        toast({ title: 'Structure Generated', description: result.message });
    } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsGenerating(false);
  };

  const showGenerateButton = isEditable && tournament.status === 'upcoming' && (tournament.participants?.length || 0) >= 2 && (!tournament.bracket || tournament.bracket.rounds.length === 0);

  return (
    <div className="space-y-6">
      <EditTournamentDialog tournament={tournament} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      <Card>
        <CardHeader>
           <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="font-headline text-3xl">{tournament.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 pt-1">
                <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" /> {tournament.game}</span>
                <span className="text-muted-foreground/50">|</span>
                <span className="flex items-center gap-2"><Trophy className="h-4 w-4" /> {prizeText}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                {showGenerateButton && (
                    <Button onClick={handleGenerateStructure} disabled={isGenerating}>
                        <Binary className="mr-2 h-4 w-4"/>
                        {isGenerating ? "Generating..." : "Generate Bracket"}
                    </Button>
                )}
                {isEditable && (
                    <Button variant="secondary" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4"/>
                        {t('TeamsPage.edit')}
                    </Button>
                )}
            </div>
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
