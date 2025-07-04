'use client';

import { useAuth } from '@/contexts/auth-context';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team } from '@/lib/types';
import Image from 'next/image';

function TeamDisplay({ team }: { team: Team }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Image src={team.avatarUrl} alt={team.name} width={64} height={64} className="rounded-md border" data-ai-hint="team logo" />
                    <div>
                        <CardTitle className="font-headline text-3xl">{team.name}</CardTitle>
                        <CardDescription>¡Felicidades! Eres el fundador de este equipo.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{team.description}</p>
                <Button className="mt-4" disabled>
                    Gestionar Equipo (Próximamente)
                </Button>
            </CardContent>
        </Card>
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
    
        if (userProfile?.role === 'founder' && userProfile.id) {
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
