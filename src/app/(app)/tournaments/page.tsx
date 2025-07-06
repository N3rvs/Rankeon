// src/app/(app)/tournaments/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Trophy, Gamepad2, Calendar, Shield, User, Eye, Users } from 'lucide-react';
import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import type { Tournament } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const getStatusBadge = (status: 'upcoming' | 'ongoing' | 'completed') => {
    switch (status) {
      case 'upcoming': return <Badge variant="secondary">Próximo</Badge>;
      case 'ongoing': return <Badge className="bg-green-500/20 text-green-400 border-transparent">En curso</Badge>;
      case 'completed': return <Badge variant="outline">Completado</Badge>;
      default: return null;
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl">{tournament.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
              <Gamepad2 className="h-4 w-4" /> {tournament.game}
            </CardDescription>
          </div>
          {getStatusBadge(tournament.status)}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Calendar className="h-4 w-4" />
            <span>Inicia: {format(tournament.startDate.toDate(), "PPP")}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Shield className="h-4 w-4" />
            <span className="capitalize">{tournament.format.replace('-', ' ')}</span>
        </div>
         <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Users className="h-4 w-4" />
            <span>{tournament.participants?.length || 0} equipos inscritos</span>
        </div>
         <div className="flex items-center text-sm text-muted-foreground gap-2">
            <User className="h-4 w-4" />
            <span>Organizado por {tournament.organizer.name}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/tournaments/${tournament.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalles
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function TournamentsPage() {
    const { userProfile } = useAuth();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    const canPropose = userProfile?.isCertifiedStreamer || userProfile?.role === 'admin' || userProfile?.role === 'moderator';

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, 'tournaments'),
            orderBy('startDate', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate'}) } as Tournament));
            setTournaments(tournamentsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tournaments:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const loadingSkeletons = [...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-lg" />
    ));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Tournaments</h1>
                    <p className="text-muted-foreground">Compete, win, and make a name for yourself.</p>
                </div>
                {canPropose && (
                     <ProposeTournamentDialog />
                )}
            </div>
            
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loadingSkeletons}
                </div>
            ) : tournaments.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
                </div>
            ) : (
                <Card className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center mt-8 col-span-full">
                    <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Active Tournaments</h3>
                    <p className="mt-2 text-muted-foreground">
                        There are no tournaments running right now. Check back later!
                    </p>
                </Card>
            )}

        </div>
    );
}
