
'use client';

import { useTransition } from 'react';
import type { Scrim } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Shield, Swords } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { acceptScrimAction, cancelScrimAction } from '@/lib/actions/scrims';
import { useI18n } from '@/contexts/i18n-context';
import { getFlagEmoji } from '@/lib/utils';

export function ScrimCard({ scrim }: { scrim: Scrim }) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isMyTeamScrim = userProfile?.teamId === scrim.teamAId || userProfile?.teamId === scrim.teamBId;
  const canAccept = userProfile?.teamId && scrim.status === 'pending' && userProfile.teamId !== scrim.teamAId;
  const canCancel = isMyTeamScrim && (scrim.status === 'pending' || scrim.status === 'confirmed');

  const isCompleted = scrim.status === 'completed';
  const isCancelled = scrim.status === 'cancelled';

  const handleAccept = () => {
    if (!canAccept || !userProfile?.teamId) return;

    startTransition(async () => {
      const result = await acceptScrimAction(scrim.id, userProfile.teamId!);
      if (result.success) {
        toast({ title: t('ScrimsPage.scrim_accepted_title'), description: t('ScrimsPage.scrim_accepted_desc') });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleCancel = () => {
    if (!canCancel) return;
    startTransition(async () => {
      const result = await cancelScrimAction(scrim.id);
      if (result.success) {
        toast({ title: t('ScrimsPage.scrim_cancelled_title'), description: t('ScrimsPage.scrim_cancelled_desc') });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const TeamDisplay = ({ name, avatarUrl, country }: { name: string, avatarUrl?: string, country?: string }) => (
    <div className="flex flex-col items-center gap-2 text-center w-28">
        <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl} data-ai-hint="team logo" />
            <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="w-full">
            <p className="font-semibold text-sm truncate">{name}</p>
            {country && <p className="text-xs text-muted-foreground">{getFlagEmoji(country)}</p>}
        </div>
    </div>
  );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-around items-center">
          <TeamDisplay name={scrim.teamAName} avatarUrl={scrim.teamAAvatarUrl} country={scrim.country} />
          <Swords className="h-6 w-6 text-muted-foreground shrink-0" />
          {scrim.teamBId && scrim.teamBName ? (
            <TeamDisplay name={scrim.teamBName} avatarUrl={scrim.teamBAvatarUrl} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center w-28">
              <Avatar className="h-12 w-12 bg-muted border-dashed border-2 flex items-center justify-center">
                <p className="text-2xl font-bold text-muted-foreground">?</p>
              </Avatar>
              <p className="text-xs font-semibold text-muted-foreground">{t('ScrimsPage.looking_for_match')}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow text-center">
        <p className="text-sm font-semibold">{format(scrim.date.toDate(), 'PPP p')}</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="secondary">{scrim.format.toUpperCase()}</Badge>
          <Badge variant="outline" className="capitalize">{scrim.type}</Badge>
          {(scrim.rankMin || scrim.rankMax) && (
            <Badge variant="outline" className="capitalize">
              <Shield className="h-3 w-3 mr-1.5" />
              {scrim.rankMin}{scrim.rankMin && scrim.rankMax && scrim.rankMin !== scrim.rankMax ? ` - ${scrim.rankMax}` : ''}
            </Badge>
          )}
        </div>
        {scrim.notes && <p className="text-xs text-muted-foreground pt-2 italic">"{scrim.notes}"</p>}
      </CardContent>
      <CardFooter>
        {scrim.status === 'pending' &&
          (isMyTeamScrim ? (
            <Button variant="destructive-outline" className="w-full" onClick={handleCancel} disabled={isPending}>
              <X className="mr-2" /> {t('ScrimsPage.cancel')}
            </Button>
          ) : (
            <Button className="w-full" onClick={handleAccept} disabled={!canAccept || isPending}>
              <Check className="mr-2" /> {t('ScrimsPage.accept')}
            </Button>
          ))}
        {scrim.status === 'confirmed' &&
          (canCancel ? (
            <Button variant="destructive-outline" className="w-full" onClick={handleCancel} disabled={isPending}>
              <X className="mr-2" /> {t('ScrimsPage.cancel')}
            </Button>
          ) : (
            <Badge variant="default" className="w-full justify-center capitalize py-2">{scrim.status}</Badge>
          ))}
        {(isCancelled || isCompleted) && (
          <Badge variant={isCancelled ? 'destructive' : 'outline'} className="w-full justify-center capitalize py-2">
            {scrim.status}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
