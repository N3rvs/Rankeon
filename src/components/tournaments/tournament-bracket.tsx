
'use client';

import React, { useState, useTransition } from 'react';
import type { Match, MatchTeam, Tournament } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Crown, Edit, Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

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
    team1: match.team1?.score ?? '',
    team2: match.team2?.score ?? ''
  });
  const { toast } = useToast();
  const { t } = useI18n();

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
    // Allow empty string to clear the input, but parse as number
    const newScore = value === '' ? '' : parseInt(value, 10);
    if (value === '' || (!isNaN(newScore as number) && newScore >= 0)) {
      setScores(prev => ({...prev, [team]: newScore}));
    }
  };

  const handleSaveScores = () => {
    console.log("Saving scores:", { tournamentId, matchId: match.id, scores });
    toast({ title: "Edit Mode", description: "Saving functionality is under development." });
    setIsEditing(false);
    // When backend is ready, this would be:
    /*
    startTransition(async () => {
      const result = await updateTournamentMatch({
        tournamentId,
        matchId: match.id,
        scores: { team1Score: scores.team1, team2Score: scores.team2 },
      });
      if (result.success) {
        toast({ title: "Match Updated" });
        setIsEditing(false);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
    */
  }

  const TeamDisplay = ({ team, score, isWinner }: { team?: MatchTeam, score?: number | '', isWinner: boolean }) => {
    if (!team || !team.id) {
      return (
        <div className="flex items-center p-2 text-sm text-muted-foreground italic h-12">
            {t('StandingsTable.tbd')}
        </div>
      );
    }
    return (
      <div className={cn(
        'flex items-center justify-between p-2 h-12 rounded-md',
        isWinner ? 'font-bold text-foreground bg-primary/10' : 'text-muted-foreground',
      )}>
        <div className="flex items-center gap-2 overflow-hidden">
          {isWinner && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
            <AvatarFallback>{team.name?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{team.name}</span>
        </div>
        <span className="font-bold text-lg">{score}</span>
      </div>
    );
  };
  
  if (!match.team1 && !match.team2) {
    return null; // Don't render empty match slots from later rounds
  }

  return (
    <Card className="w-64 bg-background/50 shadow-md relative group/match">
      {isEditable && !isEditing && (
        <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover/match:opacity-100 transition-opacity" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="p-1">
        {isEditing ? (
          <div className="space-y-1 p-1">
             <div className="flex items-center justify-between h-12 gap-2">
                <div className="flex items-center gap-2 overflow-hidden text-sm">
                    <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={match.team1?.avatarUrl} data-ai-hint="team logo" />
                        <AvatarFallback>{match.team1?.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{match.team1?.name || t('StandingsTable.tbd')}</span>
                </div>
                <Input type="number" className="w-16 h-8 text-center" value={scores.team1} onChange={(e) => handleScoreChange('team1', e.target.value)}/>
            </div>
             <div className="flex items-center justify-between h-12 gap-2">
                <div className="flex items-center gap-2 overflow-hidden text-sm">
                    <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={match.team2?.avatarUrl} data-ai-hint="team logo" />
                        <AvatarFallback>{match.team2?.name?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{match.team2?.name || t('StandingsTable.tbd')}</span>
                </div>
                <Input type="number" className="w-16 h-8 text-center" value={scores.team2} onChange={(e) => handleScoreChange('team2', e.target.value)}/>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" className="h-7" onClick={handleSaveScores} disabled={isPending}>Save</Button>
            </div>
          </div>
        ) : (
            <div className="space-y-1">
                <TeamDisplay team={match.team1} score={match.team1?.score} isWinner={match.winnerId === match.team1?.id} />
                <div className="flex items-center gap-2 px-2">
                    <div className="flex-1 h-px bg-border/50"></div>
                    <span className="text-xs font-bold text-muted-foreground">VS</span>
                    <div className="flex-1 h-px bg-border/50"></div>
                </div>
                <TeamDisplay team={match.team2} score={match.team2?.score} isWinner={match.winnerId === match.team2?.id} />
            </div>
        )}
      </CardContent>
    </Card>
  );
};


// Main Bracket Component
export const TournamentBracket = ({ tournament, isEditable }: { tournament: Tournament; isEditable: boolean }) => {
  const { t } = useI18n();
  const { bracket } = tournament;
  const participants = tournament.participants || [];
  
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

  const finalRoundIndex = bracket.rounds.length - 1;
  const winnerTeamId = bracket.rounds[finalRoundIndex]?.matches[0]?.winnerId;
  const winnerTeam = winnerTeamId ? participants.find(p => p.id === winnerTeamId) : null;

  return (
    <Card className="p-4 overflow-x-auto bg-card">
        <div className="inline-flex items-start space-x-12 min-h-[400px]">
            {bracket.rounds.map((round, roundIndex) => (
                <div key={round.id} className="flex flex-col h-full justify-around space-y-4 pt-10">
                    <h4 className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm absolute top-2">{round.name}</h4>
                    {round.matches.map((match, matchIndex) => (
                        <div key={match.id} className="relative" style={{ marginTop: matchIndex > 0 ? '4rem' : '0' }}>
                           <MatchCard match={match} isEditable={isEditable} tournamentId={tournament.id} />
                            {/* Draw connectors to next round */}
                            {roundIndex < finalRoundIndex && (
                                <>
                                  <div className="absolute top-1/2 -translate-y-px right-[-3.25rem] w-6 h-px bg-border" />
                                  {matchIndex % 2 === 0 && (
                                      <div 
                                          className="absolute bg-border w-px"
                                          style={{ right: '-3.25rem', top: '50%', height: 'calc(50% + 2rem)' }}
                                      />
                                  )}
                                  {matchIndex % 2 !== 0 && (
                                    <>
                                      <div 
                                          className="absolute bg-border w-px"
                                          style={{ right: '-3.25rem', bottom: '50%', height: 'calc(50% + 2rem)' }}
                                      />
                                      {/* Horizontal connector between pairs */}
                                      <div 
                                          className="absolute h-px w-6 bg-border"
                                          style={{ right: '-4.75rem', top: 'calc(50% - 1px)'}}
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
