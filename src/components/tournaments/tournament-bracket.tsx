'use client';

import React, { useState } from 'react';
import type { Bracket, Match, MatchTeam, Tournament } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Crown, Edit, Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
// import { updateTournamentMatch } from '@/lib/actions/tournaments'; 
import { useTransition } from 'react';

// Sub-component for a single match
const MatchCard = ({
  match,
  isEditable,
  tournamentId
}: {
  match: Match;
  isEditable: boolean;
  tournamentId: string
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [scores, setScores] = useState({
    team1: match.team1?.score ?? 0,
    team2: match.team2?.score ?? 0
  });
  const { toast } = useToast();

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
    const newScore = parseInt(value, 10);
    if (!isNaN(newScore)) {
      setScores(prev => ({...prev, [team]: newScore}));
    }
  };

  const handleSaveScores = () => {
    // NOTE: Backend function call is commented out as it's not implemented yet.
    // This demonstrates the UI for editing.
    console.log("Saving scores:", { tournamentId, matchId: match.id, scores });
    toast({ title: "Edit Mode", description: "Saving functionality is under development." });
    setIsEditing(false);
    /*
    startTransition(async () => {
      const result = await updateTournamentMatch({
        tournamentId,
        matchId: match.id,
        scores: {
          team1Score: scores.team1,
          team2Score: scores.team2,
        },
      });

      if (result.success) {
        toast({ title: "Match Updated", description: "Scores have been saved." });
        setIsEditing(false);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
    */
  }

  const TeamDisplay = ({ team, score, isWinner, isEditing, onScoreChange }: { team?: MatchTeam, score?: number, isWinner: boolean, isEditing: boolean, onScoreChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const { t } = useI18n();
    if (!team || !team.id) {
      return <div className="flex items-center h-8 p-2 text-sm text-muted-foreground italic">{t('StandingsTable.tbd')}</div>;
    }
    return (
      <div className={cn('flex items-center justify-between p-1', isWinner ? 'font-bold text-foreground' : 'text-muted-foreground')}>
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar className="h-6 w-6">
            <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
            <AvatarFallback>{team.name?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{team.name}</span>
        </div>
        {isEditing ? (
          <Input type="number" className="w-12 h-6 text-center" value={score} onChange={onScoreChange}/>
        ) : (
          <span className="font-bold text-sm">{score ?? ''}</span>
        )}
      </div>
    );
  };
  
  if (!match.team1 && !match.team2) {
    return null; // Don't render empty match slots from later rounds
  }

  return (
    <Card className="w-56 bg-background/50 relative">
      <CardContent className="p-1 space-y-1">
        <TeamDisplay team={match.team1} score={isEditing ? scores.team1 : match.team1?.score} isWinner={match.winnerId === match.team1?.id} isEditing={isEditing} onScoreChange={(e) => handleScoreChange('team1', e.target.value)} />
        <TeamDisplay team={match.team2} score={isEditing ? scores.team2 : match.team2?.score} isWinner={match.winnerId === match.team2?.id} isEditing={isEditing} onScoreChange={(e) => handleScoreChange('team2', e.target.value)}/>
      </CardContent>
      {isEditable && (
        <div className="absolute top-1 right-1">
          {isEditing ? (
            <Button size="sm" variant="secondary" className="h-6 px-2" onClick={handleSaveScores} disabled={isPending}>Save</Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};


// Main Bracket Component
export const TournamentBracket = ({ tournament, isEditable }: { tournament: Tournament; isEditable: boolean }) => {
  const { t } = useI18n();
  const { bracket } = tournament;
  const finalRoundIndex = bracket ? bracket.rounds.length - 1 : 0;
  
  if (!bracket || bracket.rounds.length === 0) {
    return (
        <Card className="flex flex-col items-center justify-center border-dashed min-h-[300px] text-center">
            <CardHeader>
                <div className="mx-auto bg-muted p-4 rounded-full w-fit">
                    <Swords className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="font-headline">{t('TournamentDetailsPage.bracket_coming_soon_title')}</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">{t('TournamentDetailsPage.bracket_coming_soon_desc')}</p>
            </CardContent>
        </Card>
    );
  }

  const finalWinner = bracket.rounds[finalRoundIndex]?.matches[0]?.winnerId
    ? participants.find(p => p.id === bracket.rounds[finalRoundIndex].matches[0].winnerId)
    : null;

  const participants = tournament.participants || [];
  const winnerTeam = tournament.winnerId ? participants.find(p => p.id === tournament.winnerId) : null;

  return (
    <Card className="p-4 overflow-x-auto bg-card">
        <div className="inline-flex items-start space-x-8 min-h-[400px]">
            {bracket.rounds.map((round, roundIndex) => (
                <div key={round.id} className="flex flex-col h-full justify-around space-y-4 pt-10">
                    <h4 className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm absolute top-2">{round.name}</h4>
                    {round.matches.map((match, matchIndex) => (
                        <div key={match.id} className="relative" style={{ marginTop: matchIndex > 0 ? '4rem' : '0' }}>
                           <MatchCard match={match} isEditable={isEditable} tournamentId={tournament.id} />
                            {/* Draw connectors to next round */}
                            {roundIndex < finalRoundIndex && (
                                <>
                                  <div className="absolute top-1/2 -translate-y-px right-[-2.25rem] w-4 h-px bg-border" />
                                  {matchIndex % 2 === 0 && (
                                      <div 
                                          className="absolute bg-border w-px"
                                          style={{ right: '-2.25rem', top: '50%', height: 'calc(50% + 2rem)' }}
                                      />
                                  )}
                                  {matchIndex % 2 !== 0 && (
                                    <>
                                      <div 
                                          className="absolute bg-border w-px"
                                          style={{ right: '-2.25rem', bottom: '50%', height: 'calc(50% + 2rem)' }}
                                      />
                                      {/* Horizontal connector between pairs */}
                                      <div 
                                          className="absolute h-px w-8 bg-border"
                                          style={{ right: '-4.25rem', top: 'calc(50% - 1px)'}}
                                      />
                                    </>
                                  )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ))}
             {/* Champion Display */}
             {winnerTeam && (
                <div className="flex flex-col items-center justify-center pl-8 text-center">
                     <Crown className="h-10 w-10 text-yellow-400"/>
                     <h3 className="text-xl font-bold font-headline mt-2">{winnerTeam.name}</h3>
                     <p className="text-sm text-muted-foreground">{t('StandingsTable.status_champion')}</p>
                </div>
             )}
        </div>
    </Card>
  );
};
