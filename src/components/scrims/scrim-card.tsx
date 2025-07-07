// src/components/scrims/scrim-card.tsx
'use client';

import { useTransition, useState } from 'react';
import type { Scrim } from '@/lib/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Shield, Swords, Flag, Trophy, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { acceptScrimAction, cancelScrimAction, reportScrimResultAction } from '@/lib/actions/scrims';
import { useI18n } from '@/contexts/i18n-context';
import { getFlagEmoji } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

function ReportResultDialog({ scrim, onOpenChange }: { scrim: Scrim; onOpenChange: (open: boolean) => void; }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleReport = (winnerId: string) => {
        startTransition(async () => {
            const result = await reportScrimResultAction(scrim.id, winnerId);
            if(result.success) {
                toast({ title: "Result Reported", description: "The match result has been saved." });
                onOpenChange(false);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    }
    
    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Report Scrim Result</AlertDialogTitle>
                <AlertDialogDescription>
                    Who won the match between {scrim.teamAName} and {scrim.teamBName}? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => handleReport(scrim.teamAId)} disabled={isPending} variant="outline" className="w-full">{scrim.teamAName} Won</Button>
                    <Button onClick={() => handleReport(scrim.teamBId!)} disabled={isPending} variant="outline" className="w-full">{scrim.teamBName} Won</Button>
                </div>
            </AlertDialogFooter>
        </AlertDialogContent>
    )
}

export function ScrimCard({ scrim, onScrimAction }: { scrim: Scrim, onScrimAction?: () => void }) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isMyTeamScrim = userProfile?.teamId === scrim.teamAId || userProfile?.teamId === scrim.teamBId;
  const canAccept = userProfile?.teamId && scrim.status === 'pending' && userProfile.teamId !== scrim.teamAId;
  const canCancel = isMyTeamScrim && (scrim.status === 'pending' || scrim.status === 'confirmed');
  const canReport = isMyTeamScrim && scrim.status === 'confirmed';

  const statusTextMap: Record<Scrim['status'], string> = {
    pending: t('ScrimsPage.status_pending'),
    confirmed: t('ScrimsPage.status_confirmed'),
    cancelled: t('ScrimsPage.status_cancelled'),
    completed: t('ScrimsPage.status_completed'),
  };
  const statusText = statusTextMap[scrim.status];

  const handleAccept = () => {
    if (!canAccept || !userProfile?.teamId) return;

    startTransition(async () => {
      const result = await acceptScrimAction(scrim.id, userProfile.teamId!);
      if (result.success) {
        toast({ title: t('ScrimsPage.scrim_accepted_title'), description: t('ScrimsPage.scrim_accepted_desc') });
        onScrimAction?.();
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
        toast({ title: t('ScrimsPage.scrim_cancelled_title'), description: result.message });
        onScrimAction?.();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };
  
  const rankDisplay = [scrim.rankMin, scrim.rankMax].filter(Boolean).join(' - ');

  return (
    <>
    <AlertDialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
       <ReportResultDialog scrim={scrim} onOpenChange={setIsReportModalOpen} />
    </AlertDialog>
    <Card className="flex flex-col">
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
          {scrim.teamBId && scrim.teamBName ? (
            <div className="flex flex-col items-center gap-2 text-center w-28">
              <Avatar className="h-16 w-16">
                <AvatarImage src={scrim.teamBAvatarUrl} data-ai-hint="team logo" />
                <AvatarFallback>{scrim.teamBName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm truncate w-full">{scrim.teamBName}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center w-28">
              <Avatar className="h-16 w-16 bg-muted border-dashed border-2 flex items-center justify-center">
                <p className="text-3xl font-bold text-muted-foreground">?</p>
              </Avatar>
              <p className="text-xs font-semibold text-muted-foreground">{t('ScrimsPage.looking_for_match')}</p>
            </div>
          )}
        </div>
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-2 border-t border-dashed">
            {scrim.country && <p className="flex items-center justify-center gap-2"><Flag className="h-3 w-3" />{scrim.country}</p>}
            {rankDisplay && <p className="flex items-center justify-center gap-2"><Shield className="h-3 w-3" />{rankDisplay}</p>}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {scrim.status === 'pending' && (
          canAccept ? (
            <Button className="w-full" onClick={handleAccept} disabled={isPending}>
              <Check className="mr-2 h-4 w-4" /> {t('ScrimsPage.accept')}
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={handleCancel} disabled={isPending}>
              <X className="mr-2 h-4 w-4" /> {t('ScrimsPage.cancel')}
            </Button>
          )
        )}
        {scrim.status === 'confirmed' && (
          <div className="w-full flex gap-2">
             <Button className="w-full" disabled={!canReport} onClick={() => setIsReportModalOpen(true)}>
                <Trophy className="mr-2 h-4 w-4" /> Reportar Resultado
             </Button>
             <Button variant="destructive-outline" size="icon" onClick={handleCancel} disabled={!canCancel || isPending}>
                <X className="h-4 w-4" />
             </Button>
          </div>
        )}
        {scrim.status === 'completed' && (
            <div className="text-center w-full">
                <p className="text-sm font-semibold flex items-center justify-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500"/> Ganador: {scrim.winnerId === scrim.teamAId ? scrim.teamAName : scrim.teamBName}
                </p>
            </div>
        )}
        {scrim.status === 'cancelled' && (
            <Badge variant="destructive" className="w-full justify-center capitalize py-2">{statusText}</Badge>
        )}
      </CardFooter>
    </Card>
    </>
  );
}
