// src/components/scrims/scrim-card.tsx
'use client';

import { useTransition, useState } from 'react';
import type { Scrim } from '@/lib/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Shield, Swords, Flag, Trophy, Clock, Hourglass } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { challengeScrimAction, cancelScrimAction, reportScrimResultAction, respondToScrimChallengeAction } from '@/lib/actions/scrims';
import { useI18n } from '@/contexts/i18n-context';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '../ui/alert-dialog';

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

export function ScrimCard({ scrim }: { scrim: Scrim }) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const myTeamId = userProfile?.teamId;
  const isTeamA = myTeamId === scrim.teamAId;
  const isChallenger = myTeamId === scrim.challengerId;
  const isTeamB = myTeamId === scrim.teamBId;
  const isParticipant = isTeamA || isTeamB;

  const statusTextMap: Record<Scrim['status'], string> = {
    open: t('ScrimsPage.status_pending'),
    challenged: "Challenged",
    confirmed: t('ScrimsPage.status_confirmed'),
    cancelled: t('ScrimsPage.status_cancelled'),
    completed: t('ScrimsPage.status_completed'),
  };

  const handleChallenge = () => {
    if (!myTeamId || scrim.status !== 'open') return;
    startTransition(async () => {
      const result = await challengeScrimAction(scrim.id, myTeamId);
      toast({ title: result.success ? 'Challenge Sent' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    });
  };

  const handleRespond = (accept: boolean) => {
    startTransition(async () => {
      const result = await respondToScrimChallengeAction(scrim.id, accept);
      toast({ title: result.success ? 'Response Sent' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    });
  }

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelScrimAction(scrim.id);
      toast({ title: result.success ? 'Action Complete' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    });
  };
  
  const rankDisplay = [scrim.rankMin, scrim.rankMax].filter(Boolean).join(' - ');
  const opponent = scrim.teamBId ? { id: scrim.teamBId, name: scrim.teamBName, avatar: scrim.teamBAvatarUrl } : 
                   scrim.challengerId ? { id: scrim.challengerId, name: scrim.challengerName, avatar: scrim.challengerAvatarUrl } : null;

  const renderCardFooter = () => {
    switch(scrim.status) {
        case 'open':
            if (isTeamA) return <Button variant="destructive-outline" className="w-full" onClick={handleCancel} disabled={isPending}><X className="mr-2 h-4 w-4" /> Cancel Posting</Button>;
            if (myTeamId) return <Button className="w-full" onClick={handleChallenge} disabled={isPending}>Challenge Team</Button>;
            return null;
        case 'challenged':
            if (isTeamA) return (
                <div className="flex w-full gap-2">
                    <Button variant="destructive-outline" className="w-full" onClick={() => handleRespond(false)} disabled={isPending}><X className="mr-2 h-4 w-4" /> Decline</Button>
                    <Button className="w-full" onClick={() => handleRespond(true)} disabled={isPending}><Check className="mr-2 h-4 w-4" /> Accept</Button>
                </div>
            );
            if (isChallenger) return <Button variant="outline" className="w-full" disabled>Challenge Sent</Button>;
            return null;
        case 'confirmed':
             if (isParticipant) return (
                 <div className="w-full flex gap-2">
                    <Button className="w-full" onClick={() => setIsReportModalOpen(true)} disabled={isPending}><Trophy className="mr-2 h-4 w-4" /> Report Result</Button>
                    <Button variant="destructive-outline" size="icon" onClick={handleCancel} disabled={isPending}><X className="h-4 w-4" /></Button>
                </div>
            );
            return null;
        case 'completed':
            return (
                 <div className="text-center w-full">
                    <p className="text-sm font-semibold flex items-center justify-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500"/> Winner: {scrim.winnerId === scrim.teamAId ? scrim.teamAName : scrim.teamBName}
                    </p>
                </div>
            );
        case 'cancelled':
             return <Badge variant="destructive" className="w-full justify-center capitalize py-2">{statusTextMap[scrim.status]}</Badge>
        default:
            return null;
    }
  }

  return (
    <>
    {scrim.status === 'confirmed' && <AlertDialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}><ReportResultDialog scrim={scrim} onOpenChange={setIsReportModalOpen} /></AlertDialog>}
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
          <div className="flex flex-col items-center gap-2 text-center w-28">
              <Avatar className={cn("h-16 w-16", scrim.status === 'challenged' && 'opacity-50')}>
                {opponent ? <AvatarImage src={opponent.avatar} data-ai-hint="team logo" /> : <div className="h-full w-full rounded-full bg-muted border-dashed border-2 flex items-center justify-center"><p className="text-3xl font-bold text-muted-foreground">?</p></div> }
                {opponent && <AvatarFallback>{opponent.name.slice(0, 2)}</AvatarFallback>}
              </Avatar>
              <p className={cn("font-semibold text-sm truncate w-full", !opponent && "text-xs text-muted-foreground")}>
                {opponent ? opponent.name : t('ScrimsPage.looking_for_match')}
              </p>
            </div>
        </div>
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-2 border-t border-dashed">
            {scrim.country && <p className="flex items-center justify-center gap-2"><Flag className="h-3 w-3" />{scrim.country}</p>}
            {rankDisplay && <p className="flex items-center justify-center gap-2"><Shield className="h-3 w-3" />{rankDisplay}</p>}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {renderCardFooter()}
      </CardFooter>
    </Card>
    </>
  );
}
