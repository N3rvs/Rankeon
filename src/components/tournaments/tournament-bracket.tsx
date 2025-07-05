'use client';

import type { Bracket, Match, MatchTeam, Round } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import React from 'react';

const TeamDisplay = ({
  team,
  isWinner,
}: {
  team: MatchTeam;
  isWinner: boolean;
}) => (
  <div
    className={cn(
      'flex items-center justify-between p-2 rounded-md transition-colors',
      isWinner ? 'bg-primary/10' : 'bg-card'
    )}
  >
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
        <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'text-sm',
          isWinner ? 'font-bold text-primary' : 'text-muted-foreground'
        )}
      >
        {team.name}
      </span>
    </div>
    <span
      className={cn(
        'text-sm font-bold',
        isWinner ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {team.score ?? ''}
    </span>
  </div>
);

const MatchCard = ({ match }: { match: Match }) => {
  if (!match.team1 || !match.team2) {
    // Render a placeholder for an upcoming match
    return (
      <Card className="w-56 bg-muted/50 border-dashed">
        <CardContent className="p-2 space-y-1 h-[76px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">TBD</p>
        </CardContent>
      </Card>
    );
  }

  const { team1, team2, winnerId } = match;

  return (
    <Card className="w-56 bg-background">
      <CardContent className="p-2 space-y-1">
        <TeamDisplay team={team1} isWinner={team1.id === winnerId} />
        <TeamDisplay team={team2} isWinner={team2.id === winnerId} />
      </CardContent>
    </Card>
  );
};

const BracketConnectors = ({ round }: { round: Round }) => {
  // This is a simplified connector logic for visual representation.
  const matchCount = round.matches.length;
  // We want to draw a line between each pair of matches that feed into the next round.
  const connectorCount = Math.ceil(matchCount / 2);

  return (
    <div
      className="flex flex-col w-16 items-stretch justify-around self-stretch"
      aria-hidden="true"
    >
      {Array.from({ length: connectorCount }).map((_, index) => (
        <div
          key={index}
          className="flex-1 flex flex-col items-center justify-center relative"
        >
          {/* Vertical line connecting the pair */}
          <div className="w-px bg-border h-full absolute top-0 left-1/2" />
          {/* Horizontal line pointing to the next match */}
          <div className="w-full h-px bg-border absolute left-1/2" />
        </div>
      ))}
    </div>
  );
};

export const TournamentBracket = ({ bracket }: { bracket: Bracket | null }) => {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-[300px]">
        <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">Bracket Coming Soon</h3>
        <p className="mt-2 text-muted-foreground">
          The tournament bracket will be generated once teams are registered and
          seeded.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-8 bg-background/50 rounded-lg border p-4">
      <div className="inline-flex items-start space-x-4">
        {bracket.rounds.map((round, roundIndex) => (
          <React.Fragment key={round.id}>
            <div className="flex flex-col space-y-12">
              <h3 className="font-headline text-xl text-center">
                {round.name}
              </h3>
              <div className="flex flex-col justify-around flex-1 space-y-10">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
            {roundIndex < bracket.rounds.length - 1 && (
              <div className="flex flex-col justify-around self-stretch pt-20">
                <BracketConnectors round={round} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
