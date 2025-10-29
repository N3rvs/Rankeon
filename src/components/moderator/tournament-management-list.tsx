
'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Trash2, Trophy as TrophyIcon, Edit } from 'lucide-react';
import { deleteTournament } from '@/lib/actions/tournaments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { useI18n } from '@/contexts/i18n-context';
import { EditTournamentDialog } from '@/components/tournaments/edit-tournament-dialog';
import { Spinner } from '../ui/spinner';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';


function getStatusBadgeVariant(status: Tournament['status']) {
  switch (status) {
    case 'upcoming': return 'secondary';
    case 'ongoing': return 'default';
    case 'completed': return 'outline';
    default: return 'secondary';
  }
}

function TournamentManagementCard({ tournament }: { tournament: Tournament }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteTournament({ tournamentId: tournament.id });
             if (result.success) {
                toast({
                    title: 'Success',
                    description: `Tournament "${tournament.name}" has been deleted.`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        });
    }

    const statusText = {
        upcoming: t('TournamentManagement.status_upcoming'),
        ongoing: t('TournamentManagement.status_ongoing'),
        completed: t('TournamentManagement.status_completed'),
    };

    return (
        <>
            <EditTournamentDialog tournament={tournament} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <Link href={`/tournaments/${tournament.id}`} className="hover:underline">
                            <CardTitle className="font-headline text-lg">{tournament.name}</CardTitle>
                        </Link>
                        <Badge variant={getStatusBadgeVariant(tournament.status)} className="capitalize">{statusText[tournament.status]}</Badge>
                    </div>
                    <CardDescription>
                        Organized by {tournament.organizer.name} for {tournament.game}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                        Starts on {format(tournament.startDate.toDate(), "PPP")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Participants: {tournament.participants?.length || 0} / {tournament.maxTeams}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button size="sm" variant="secondary" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('TournamentManagement.delete_button')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('TournamentManagement.delete_confirm_title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('TournamentManagement.delete_confirm_desc', { name: tournament.name })}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('TournamentManagement.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                                    {isPending ? t('TournamentManagement.deleting') : t('TournamentManagement.confirm_delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </>
    );
}

export function TournamentManagementList() {
  const { t } = useI18n();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    setLoading(true);
    const tournamentsRef = collection(db, 'tournaments');
    const q = query(
      tournamentsRef,
      orderBy('startDate', 'desc')
    );
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Tournament)
        );
        setTournaments(data);
        setLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: tournamentsRef.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe?.();
  }, []);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-[200px]">
        <TrophyIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t('TournamentManagement.no_tournaments_title')}</h3>
        <p className="mt-2 text-muted-foreground">
          {t('TournamentManagement.no_tournaments_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map(t => <TournamentManagementCard key={t.id} tournament={t} />)}
    </div>
  );
}
