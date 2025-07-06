'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, Unsubscribe, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

function TournamentCard({ tournament }: { tournament: Tournament }) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-xl">{tournament.name}</CardTitle>
                        <CardDescription>Organized by {tournament.organizer.name}</CardDescription>
                    </div>
                    <Badge variant={tournament.status === 'upcoming' ? 'default' : 'secondary'} className="capitalize">{tournament.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{tournament.description.substring(0, 100)}...</p>
                <div className="mt-4 text-sm space-y-1">
                    <p><strong>Game:</strong> {tournament.game}</p>
                    <p><strong>Format:</strong> {tournament.format}</p>
                    <p><strong>Starts:</strong> {format(tournament.startDate.toDate(), "PPP")}</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full">
                    <Link href={`/tournaments/${tournament.id}`}>View Tournament</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function TournamentsPage() {
    const { claims } = useAuth();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    const canPropose = claims?.isCertifiedStreamer || claims?.role === 'moderator' || claims?.role === 'admin';

    useEffect(() => {
        setLoading(true);
        const tourneyQuery = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
        const unsubscribe: Unsubscribe = onSnapshot(tourneyQuery, (snapshot) => {
            const tourneyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
            setTournaments(tourneyData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tournaments:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                        <Trophy />
                        Tournaments
                    </h1>
                    <p className="text-muted-foreground">
                        Compete for glory and prizes.
                    </p>
                </div>
                {canPropose && <ProposeTournamentDialog />}
            </div>

            {loading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                </div>
            ) : tournaments.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
                </div>
            ) : (
                 <div className="text-center py-16 text-muted-foreground">
                    <p>No upcoming tournaments.</p>
                    <p className="text-sm">Check back soon!</p>
                </div>
            )}
        </div>
    );
}
