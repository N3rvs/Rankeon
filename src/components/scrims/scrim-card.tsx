'use client';

import { useTransition } from 'react';
import type { Scrim } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { acceptScrimAction, cancelScrimAction } from '@/lib/actions/scrims';
import { useI18n } from '@/contexts/i18n-context';

export function ScrimCard({ scrim }: { scrim: Scrim }) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isMyTeamScrim = userProfile?.teamId === scrim.teamAId;
  const canAccept = userProfile?.teamId && !isMyTeamScrim;

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
    startTransition(async () => {
      const result = await cancelScrimAction(scrim.id);
      if (result.success) {
        toast({ title: t('ScrimsPage.scrim_cancelled_title'), description: t('ScrimsPage.scrim_cancelled_desc') });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={scrim.teamAAvatarUrl} data-ai-hint="team logo" />
            <AvatarFallback>{scrim.teamAName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base font-semibold">{scrim.teamAName}</CardTitle>
            <CardDescription className="text-xs">{t('ScrimsPage.looking_for_match')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(scrim.date.toDate(), 'PPP p')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{scrim.format.toUpperCase()}</Badge>
            <Badge variant="outline" className="capitalize">{scrim.type}</Badge>
            {(scrim.rankMin || scrim.rankMax) && (
                <Badge variant="outline" className="capitalize">
                    <Shield className="h-3 w-3 mr-1.5" />
                    {scrim.rankMin}{scrim.rankMin && scrim.rankMax && scrim.rankMin !== scrim.rankMax ? ` - ${scrim.rankMax}` : ''}
                </Badge>
            )}
        </div>
      </CardContent>
      <CardFooter>
        {isMyTeamScrim ? (
          <Button variant="destructive-outline" className="w-full" onClick={handleCancel} disabled={isPending}>
            <X className="mr-2" /> {t('ScrimsPage.cancel')}
          </Button>
        ) : (
          <Button className="w-full" onClick={handleAccept} disabled={!canAccept || isPending}>
            <Check className="mr-2" /> {t('ScrimsPage.accept')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
