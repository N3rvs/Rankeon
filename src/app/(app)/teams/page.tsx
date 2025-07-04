'use client';

import { useAuth } from '@/contexts/auth-context';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldCheck, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition } from 'react';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam } from '@/lib/actions/teams';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditTeamDialog } from '@/components/teams/edit-team-dialog';
import { Badge } from '@/components/ui/badge';

function TeamDisplay({ team }: { team: Team }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteTeam({ teamId: team.id });
            if (result.success) {
                toast({ title: "Equipo Eliminado", description: "Tu equipo ha sido eliminado con éxito." });
                // The page will automatically update due to the real-time listener
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <>
            <EditTeamDialog team={team} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                            <Image src={team.avatarUrl} alt={team.name} width={64} height={64} className="rounded-md border" data-ai-hint="team logo" />
                            <div>
                                <CardTitle className="font-headline text-3xl">{team.name}</CardTitle>
                                <CardDescription>¡Felicidades! Eres el fundador de este equipo.</CardDescription>
                            </div>
                        </div>
                        <Badge variant={team.lookingForPlayers ? 'default' : 'secondary'}>
                            {team.lookingForPlayers ? 'Reclutando' : 'Equipo Lleno'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{team.description || "No hay descripción para este equipo."}</p>
                </CardContent>
                 <CardFooter className="border-t pt-6 flex justify-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive-outline">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Equipo
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente tu equipo y todos sus datos. Tu rol volverá a ser "jugador".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {isPending ? "Eliminando..." : "Sí, eliminar equipo"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Equipo
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
}


function NoTeamDisplay() {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-full">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">Aún no tienes un equipo</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                ¡Crea tu propio equipo para empezar a reclutar jugadores!
            </p>
            <CreateTeamDialog />
        </div>
    );
}


export default function TeamsPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [team, setTeam] = useState<Team | null>(null);
    const [loadingTeam, setLoadingTeam] = useState(true);

    useEffect(() => {
        let unsubscribe: Unsubscribe | undefined;
    
        if (userProfile?.id) {
          setLoadingTeam(true);
          const q = query(collection(db, 'teams'), where('founder', '==', userProfile.id));
          
          unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
              const teamData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Team;
              setTeam(teamData);
            } else {
              setTeam(null);
            }
            setLoadingTeam(false);
          }, (error) => {
            console.error("Error fetching team: ", error);
            setLoadingTeam(false);
          });
    
        } else {
          setTeam(null);
          setLoadingTeam(false);
        }
    
        return () => {
          if (unsubscribe) {
            unsubscribe();
          }
        };
      }, [userProfile]);

      if (authLoading || loadingTeam) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-48 mb-4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-80" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
      }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Mi Equipo</h1>
                <p className="text-muted-foreground">
                    Gestiona tu equipo o crea uno nuevo para competir.
                </p>
            </div>
            {team ? <TeamDisplay team={team} /> : <NoTeamDisplay />}
        </div>
    );
}
