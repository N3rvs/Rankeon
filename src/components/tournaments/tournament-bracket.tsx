
'use client';

import React, { useState, useTransition } from 'react';
import type { Match, MatchTeam, Tournament } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Crown, Edit, Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { reportBracketMatchResult } from '@/lib/actions/tournaments';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const { t } = useI18n();

  const TeamDisplay = ({ team, isWinner }: { team?: MatchTeam, isWinner: boolean }) => {
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
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
            <AvatarFallback>{team.name?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{team.name}</span>
        </div>
        <span className="font-bold text-lg">{team.score ?? ''}</span>
      </div>
    );
  };
  
  if (!match.team1 && !match.team2) {
    return null; // Don't render empty match slots from later rounds
  }

  const canReport = isEditable && match.team1 && match.team2 && !match.winnerId;

  return (
    <>
      <AlertDialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <ReportResultDialog
          match={match}
          tournamentId={tournamentId}
          onOpenChange={setIsReportModalOpen}
        />
      </AlertDialog>

      <Card className="w-64 bg-background/50 shadow-md relative group/match">
        {canReport && (
          <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover/match:opacity-100 transition-opacity" onClick={() => setIsReportModalOpen(true)}>
              <Edit className="h-4 w-4" />
          </Button>
        )}
        <CardContent className="p-1">
          <div className="space-y-1">
              <TeamDisplay team={match.team1} isWinner={match.winnerId === match.team1?.id} />
              <div className="flex items-center gap-2 px-2">
                  <div className="flex-1 h-px bg-border/50"></div>
                  <span className="text-xs font-bold text-muted-foreground">VS</span>
                  <div className="flex-1 h-px bg-border/50"></div>
              </div>
              <TeamDisplay team={match.team2} isWinner={match.winnerId === match.team2?.id} />
          </div>
        </CardContent>
      </Card>
    </>
  );
};


function ReportResultDialog({
  match,
  tournamentId,
  onOpenChange,
}: {
  match: Match;
  tournamentId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleReport = (winnerId: string) => {
    startTransition(async () => {
      const result = await reportBracketMatchResult({
        tournamentId,
        matchId: match.id,
        winnerId,
      });

      if (result.success) {
        toast({ title: 'Match Result Reported', description: result.message });
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Report Match Result</AlertDialogTitle>
        <AlertDialogDescription>
          Who won the match between {match.team1?.name} and {match.team2?.name}? This will advance the winner to the next round.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <div className="flex flex-col sm:flex-row gap-2">
          {match.team1?.id && (
            <Button onClick={() => handleReport(match.team1!.id)} disabled={isPending} variant="outline" className="w-full">
              {match.team1.name} Won
            </Button>
          )}
          {match.team2?.id && (
            <Button onClick={() => handleReport(match.team2!.id)} disabled={isPending} variant="outline" className="w-full">
              {match.team2.name} Won
            </Button>
          )}
        </div>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}


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
