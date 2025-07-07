'use client';

import type { Scrim } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Shield, Swords, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/i18n-context';

export function PublicScrimCard({ scrim }: { scrim: Scrim }) {
  const { t } = useI18n();

  const rankDisplay = [scrim.rankMin, scrim.rankMax].filter(Boolean).join(' - ');

  return (
    <Card className="flex flex-col bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {format(scrim.date.toDate(), "d MMM, HH:mm")}</span>
            <Badge variant="secondary" className="capitalize">{scrim.format.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex justify-around items-center">
          <div className="flex flex-col items-center gap-2 text-center w-28">
            <Avatar className="h-16 w-16">
              <AvatarImage src={scrim.teamAAvatarUrl} data-ai-hint="team logo" />
              <AvatarFallback>{scrim.teamAName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm truncate w-full">{scrim.teamAName}</p>
          </div>
          <Swords className="h-6 w-6 text-muted-foreground shrink-0 mx-2" />
          <div className="flex flex-col items-center gap-2 text-center w-28">
              <Avatar className="h-16 w-16">
                <AvatarImage src={scrim.teamBAvatarUrl} data-ai-hint="team logo" />
                <AvatarFallback>{scrim.teamBName?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm truncate w-full">
                {scrim.teamBName}
              </p>
            </div>
        </div>
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-4 border-t border-dashed">
            {scrim.country && <p className="flex items-center justify-center gap-2"><Flag className="h-3 w-3" />{scrim.country}</p>}
            {rankDisplay && <p className="flex items-center justify-center gap-2"><Shield className="h-3 w-3" />{rankDisplay}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
