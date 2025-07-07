
'use client';

import { useState } from 'react';
import type { Tournament, Bracket, MatchTeam } from '@/lib/types';
import { TournamentBracket } from './tournament-bracket';
import { StandingsTable } from './StandingsTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Gamepad2, Edit, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { EditTournamentDialog } from './edit-tournament-dialog';
import { Button } from '../ui/button';
import { useI18n } from '@/contexts/i18n-context';

// --- MOCK DATA FOR VISUALIZATION ---
const mockParticipants: MatchTeam[] = [
  { id: 'team-a', name: 'Cosmic Phoenix', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'team-b', name: 'Abyssal Serpents', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'team-c', name: 'Solar Sentinels', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'team-d', name: 'Void Vipers', avatarUrl: 'https://placehold.co/100x100.png' },
];

const mockBracket: Bracket = {
  rounds: [
    {
      id: 'round-1',
      name: 'Semifinals',
      matches: [
        {
          id: 'match-1',
          team1: { ...mockParticipants[0], score: 13 },
          team2: { ...mockParticipants[1], score: 10 },
          winnerId: 'team-a',
        },
        {
          id: 'match-2',
          team1: { ...mockParticipants[2], score: 8 },
          team2: { ...mockParticipants[3], score: 13 },
          winnerId: 'team-d',
        },
      ],
    },
    {
      id: 'round-2',
      name: 'Finals',
      matches: [
        {
          id: 'match-3',
          team1: { ...mockParticipants[0], score: 2 },
          team2: { ...mockParticipants[3], score: 1 },
          winnerId: 'team-a',
        },
      ],
    },
  ],
};
// --- END MOCK DATA ---

export function TournamentDashboard({ tournament }: { tournament: Tournament }) {
  const { userProfile, claims } = useAuth();
  const { t } = useI18n();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const isMod = claims?.role === 'admin' || claims?.role === 'moderator';
  const isOwner = tournament.organizer.uid === userProfile?.id;
  const isEditable = isMod || isOwner;

  // Create a temporary tournament object for display
  const displayTournament = { ...tournament };

  // If the tournament from props doesn't have a bracket or participants, use the mock data
  if (!displayTournament.bracket || displayTournament.bracket.rounds.length === 0) {
    displayTournament.bracket = mockBracket;
    // Also ensure participants are mocked if not present, for StandingsTable
    if (!displayTournament.participants || displayTournament.participants.length === 0) {
        displayTournament.participants = mockParticipants;
    }
    displayTournament.winnerId = 'team-a';
  }

  const prizeText = displayTournament.prize
    ? `${displayTournament.currency || ''} ${displayTournament.prize}`.trim()
    : t('TournamentDetailsPage.no_prize');

  return (
    <div className="space-y-6">
      <EditTournamentDialog tournament={tournament} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      <Card>
        <CardHeader>
           <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="font-headline text-3xl">{displayTournament.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 pt-1">
                <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" /> {displayTournament.game}</span>
                <span className="text-muted-foreground/50">|</span>
                <span className="flex items-center gap-2"><Trophy className="h-4 w-4" /> {prizeText}</span>
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
           <p className="text-sm text-muted-foreground">{displayTournament.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TournamentBracket tournament={displayTournament} isEditable={isEditable} />
        </div>
        <div className="xl:col-span-1">
          <StandingsTable tournament={displayTournament} />
        </div>
      </div>
    </div>
  );
}
