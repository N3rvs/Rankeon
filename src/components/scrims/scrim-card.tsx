// src/components/scrims/scrim-card.tsx
'use client';

import { useState, useTransition } from 'react';
import type { ScrimUI } from '@/lib/types'; // <- tu tipo UI con Date
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Shield, Swords, Flag, Trophy, Hourglass } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  challengeScrimAction,
  cancelScrimAction,
  reportScrimResultAction,
  respondToScrimChallengeAction,
} from '@/lib/actions/scrims';
import { useI18n } from '@/contexts/i18n-context';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

function ReportResultDialog({
  scrim,
  onOpenChange,
}: {
  scrim: ScrimUI;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleReport = (winnerId: string) => {
    startTransition(async () => {
      if (!scrim.teamBId) {
        toast({
          title: 'Error',
          description: 'Cannot report result before both teams are confirmed.',
          variant: 'destructive',
        });
        return;
      }
      const result = await reportScrimResultAction(scrim.id, winnerId);
      if (result.success) {
        toast({ title: 'Result Reported', description: 'The match result has been saved.' });
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Report Scrim Result</AlertDialogTitle>
        <AlertDialogDescription>
          Who won the match between {scrim.teamAName} and {scrim.teamBName ?? 'the opponent'}? This
          action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => handleReport(scrim.teamAId)} disabled={isPending} variant="outline" className="w-full">
            {scrim.teamAName ?? 'Team A'} Won
          </Button>
          <Button
            onClick={() => handleReport(scrim.teamBId!)}
            disabled={!scrim.teamBId || isPending}
            variant="outline"
            className="w-full"
          >
            {scrim.teamBName ?? 'Team B'} Won
          </Button>
        </div>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

type ScrimCardProps = { scrim: ScrimUI };

export function ScrimCard({ scrim }: ScrimCardProps) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const myTeamId = userProfile?.teamId ?? null;
  const isTeamA = myTeamId === scrim.teamAId;
  const isTeamB = myTeamId === scrim.teamBId;
  const isParticipant = isTeamA || isTeamB;
  const isChallenger = scrim.status === 'challenged' && myTeamId === scrim.challengerId;

  const statusTextMap: Record<ScrimUI['status'], string> = {
    pending: t('ScrimsPage.status_pending'),
    challenged: t('ScrimsPage.status_challenged'),
    confirmed: t('ScrimsPage.status_confirmed'),
    cancelled: t('ScrimsPage.status_cancelled'),
    completed: t('ScrimsPage.status_completed'),
  };

  const handleChallenge = () => {
    if (!myTeamId || scrim.status !== 'pending') return;
    startTransition(async () => {
      const result = await challengeScrimAction(scrim.id, myTeamId);
      toast({
        title: result.success ? t('ScrimsPage.challenge_sent_title') : t('Common.error'),
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    });
  };

  const handleRespond = (accept: boolean) => {
    if (scrim.status !== 'challenged') return;
    startTransition(async () => {
      const result = await respondToScrimChallengeAction(scrim.id, accept);
      toast({
        title: result.success ? t('ScrimsPage.response_sent_title') : t('Common.error'),
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    });
  };

  const handleCancel = () => {
    if (scrim.status === 'completed' || scrim.status === 'cancelled') return;
    startTransition(async () => {
      const result = await cancelScrimAction(scrim.id);
      toast({
        title: result.success ? t('ScrimsPage.action_complete_title') : t('Common.error'),
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    });
  };

  const rankDisplay = [scrim.rankMin, scrim.rankMax].filter(Boolean).join(' - ');

  const opponent =
    scrim.status === 'confirmed' || scrim.status === 'completed'
      ? scrim.teamBId
        ? { id: scrim.teamBId, name: scrim.teamBName, avatar: scrim.teamBAvatarUrl }
        : null
      : scrim.status === 'challenged' && scrim.challengerId
      ? { id: scrim.challengerId, name: scrim.challengerName, avatar: scrim.challengerAvatarUrl }
      : null;

  const renderCardFooter = () => {
    switch (scrim.status) {
      case 'pending':
        if (isTeamA)
          return (
            <Button variant="destructive-outline" className="w-full" onClick={handleCancel} disabled={isPending}>
              <X className="mr-2 h-4 w-4" /> {t('ScrimsPage.cancel_posting')}
            </Button>
          );
        if (myTeamId && !isTeamA)
          return (
            <Button className="w-full" onClick={handleChallenge} disabled={isPending}>
              <Swords className="mr-2 h-4 w-4" /> {t('ScrimsPage.challenge_team')}
            </Button>
          );
        return null;

      case 'challenged':
        if (isTeamA)
          return (
            <div className="flex w-full gap-2">
              <Button
                variant="destructive-outline"
                className="w-full"
                onClick={() => handleRespond(false)}
                disabled={isPending}
              >
                <X className="mr-2 h-4 w-4" /> {t('ScrimsPage.decline')}
              </Button>
              <Button className="w-full" onClick={() => handleRespond(true)} disabled={isPending}>
                <Check className="mr-2 h-4 w-4" /> {t('ScrimsPage.accept')}
              </Button>
            </div>
          );
        if (isChallenger)
          return (
            <Button variant="outline" className="w-full" disabled>
              <Hourglass className="mr-2 h-4 w-4" /> {t('ScrimsPage.challenge_sent')}
            </Button>
          );
        return null;

      case 'confirmed':
        if (isParticipant)
          return (
            <div className="w-full flex gap-2">
              <Button className="w-full" onClick={() => setIsReportModalOpen(true)} disabled={isPending}>
                <Trophy className="mr-2 h-4 w-4" /> {t('ScrimsPage.report_result')}
              </Button>
              <Button
                variant="destructive-outline"
                size="icon"
                onClick={handleCancel}
                disabled={isPending}
                title={t('ScrimsPage.cancel_match')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        return null;

      case 'completed': {
        const winnerName = scrim.winnerId === scrim.teamAId ? scrim.teamAName : scrim.teamBName;
        return (
          <div className="text-center w-full">
            <p className="text-sm font-semibold flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> {t('ScrimsPage.winner')}: {winnerName ?? 'N/A'}
            </p>
          </div>
        );
      }

      case 'cancelled':
        return (
          <Badge variant="destructive" className="w-full justify-center capitalize py-2">
            {statusTextMap[scrim.status]}
          </Badge>
        );
    }
  };

  return (
    <>
      {scrim.status === 'confirmed' && (
        <AlertDialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <ReportResultDialog scrim={scrim} onOpenChange={setIsReportModalOpen} />
        </AlertDialog>
      )}

      <Card className="flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> {format(scrim.date, 'd MMM, HH:mm')}
            </span>
            <Badge variant="secondary" className="capitalize">
              {scrim.format.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-grow space-y-4">
          <div className="flex justify-around items-center">
            {/* Team A */}
            <Link href={`/teams/${scrim.teamAId}`} className="flex flex-col items-center gap-2 text-center w-28 group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={scrim.teamAAvatarUrl ?? undefined} data-ai-hint="team logo" />
                <AvatarFallback>{scrim.teamAName?.slice(0, 2) ?? 'A'}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm truncate w-full group-hover:underline">
                {scrim.teamAName ?? 'Team A'}
              </p>
            </Link>

            <Swords className="h-6 w-6 text-muted-foreground shrink-0 mx-2" />

            {/* Opponent */}
            <div className="flex flex-col items-center gap-2 text-center w-28">
              {opponent ? (
                <Link href={`/teams/${opponent.id}`} className="flex flex-col items-center gap-2 text-center w-full group">
                  <Avatar className={cn('h-16 w-16', scrim.status === 'challenged' && 'opacity-60')}>
                    <AvatarImage src={opponent.avatar ?? undefined} data-ai-hint="team logo" />
                    <AvatarFallback>{opponent.name?.slice(0, 2) ?? '??'}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm truncate w-full group-hover:underline">
                    {opponent.name ?? 'Unknown Team'}
                  </p>
                </Link>
              ) : (
                <>
                  <Avatar className="h-16 w-16">
                    <div className="h-full w-full rounded-full bg-muted border-dashed border-2 flex items-center justify-center">
                      <p className="text-3xl font-bold text-muted-foreground">?</p>
                    </div>
                  </Avatar>
                  <p className="text-xs text-muted-foreground">
                    {scrim.status === 'challenged'
                      ? t('ScrimsPage.awaiting_response')
                      : t('ScrimsPage.looking_for_match')}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="text-center text-xs text-muted-foreground space-y-1 pt-2 border-t border-dashed">
            {scrim.country && (
              <p className="flex items-center justify-center gap-2">
                <Flag className="h-3 w-3" />
                {scrim.country}
              </p>
            )}
            {[scrim.rankMin, scrim.rankMax].filter(Boolean).length > 0 && (
              <p className="flex items-center justify-center gap-2">
                <Shield className="h-3 w-3" />
                {[scrim.rankMin, scrim.rankMax].filter(Boolean).join(' - ')}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-2 pt-4 border-t">{renderCardFooter()}</CardFooter>
      </Card>
    </>
  );
}
