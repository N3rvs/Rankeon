'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Trophy, Calendar, Gamepad2, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TournamentBracket } from '@/components/tournaments/tournament-bracket';
import { useAuth } from '@/contexts/auth-context';
import { registerTeamForTournament } from '@/lib/actions/tournaments';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TournamentDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const fetchTournament = async () => {
                setLoading(true);
                const docRef = doc(db, 'tournaments', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTournament({ id: docSnap.id, ...docSnap.data({ serverTimestamps: 'estimate' }) } as Tournament);
                }
                setLoading(false);
            };
            fetchTournament();
        }
    }, [id]);
    
    const handleRegister = async () => {
        if (!userProfile?.teamId || !tournament) return;
        const result = await registerTeamForTournament({ tournamentId: tournament.id, teamId: userProfile.teamId });
        if(result.success) {
            toast({ title: "Success", description: result.message });
            // Manually update the state to reflect registration
            setTournament(prev => prev ? ({ ...prev, participants: [...(prev.participants || []), { id: userProfile.teamId!, name: userProfile.name, avatarUrl: userProfile.avatarUrl }] }) : null);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };

    const isTeamRegistered = tournament?.participants?.some(p => p.id === userProfile?.teamId);

    if (loading || authLoading) {
        return <div><Skeleton className="h-screen w-full" /></div>;
    }

    if (!tournament) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Tournament Not Found</h2>
                <p className="text-muted-foreground">The tournament you are looking for does not exist or has been removed.</p>
                <Button asChild className="mt-4">
                    <Link href="/tournaments">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tournaments
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/tournaments"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Tournaments</Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-primary"/>
                        {tournament.name}
                    </CardTitle>
                    <CardDescription>Organized by {tournament.organizer.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> {tournament.game}</div>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4"/> {format(tournament.startDate.toDate(), "PPP")}</div>
                        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> {tournament.format}</div>
                    </div>
                    <p>{tournament.description}</p>
                </CardContent>
                 <CardFooter>
                    {userProfile?.teamId && tournament.status === 'upcoming' && (
                        <Button onClick={handleRegister} disabled={isTeamRegistered}>
                            {isTeamRegistered ? 'Team Registered' : 'Register Your Team'}
                        </Button>
                    )}
                 </CardFooter>
            </Card>

            <Tabs defaultValue="bracket" className="w-full">
                <TabsList>
                    <TabsTrigger value="bracket">Bracket</TabsTrigger>
                    <TabsTrigger value="participants">Participants ({tournament.participants?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="bracket">
                    <TournamentBracket bracket={tournament.bracket || null} />
                </TabsContent>
                <TabsContent value="participants">
                    <Card>
                        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {tournament.participants?.map(team => (
                                <Link href={`/teams/${team.id}`} key={team.id} className="flex flex-col items-center gap-2 p-2 rounded-md hover:bg-muted">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo"/>
                                        <AvatarFallback>{team.name.slice(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-center">{team.name}</span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
