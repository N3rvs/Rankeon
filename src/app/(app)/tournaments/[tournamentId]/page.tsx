
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { Tournament, UserProfile, MatchTeam } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Calendar,
  Gamepad2,
  Shield,
  User,
  Info,
  Trophy,
  Swords,
  Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { TournamentBracket } from '@/components/tournaments/tournament-bracket';
import { useAuth } from '@/contexts/auth-context';
import { registerTeamForTournament } from '@/lib/actions/tournaments';

function TournamentStatusBadge({ status }: { status: Tournament['status'] }) {
  switch (status) {
    case 'upcoming':
      return <Badge variant="secondary">Upcoming</Badge>;
    case 'ongoing':
      return (
        <Badge className="bg-green-500/20 text-green-400 border-transparent">
          Ongoing
        </Badge>
      );
    case 'completed':
      return <Badge variant="outline">Completed</Badge>;
    default:
      return null;
  }
}

function ParticipantCard({ team }: { team: MatchTeam }) {
    return (
        <Button variant="ghost" className="w-full h-auto p-0" asChild>
            <Link href={`/teams/${team.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg border bg-background hover:bg-muted w-full">
                    <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
                        <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{team.name}</span>
                </div>
            </Link>
        </Button>
    )
}

export default function TournamentDetailPage() {
  const { tournamentId } = useParams() as { tournamentId: string };
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile, claims } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, startRegistering] = useTransition();

  useEffect(() => {
    if (!tournamentId) return;

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    
    const unsubscribe = onSnapshot(tournamentRef, async (tournamentSnap) => {
        setLoading(true);
        if (tournamentSnap.exists()) {
            const tournamentData = { id: tournamentSnap.id, ...tournamentSnap.data(), } as Tournament;
            setTournament(tournamentData);

            if (tournamentData.organizer.uid && !organizer) {
                const organizerRef = doc(db, 'users', tournamentData.organizer.uid);
                const organizerSnap = await getDoc(organizerRef);
                if (organizerSnap.exists()) {
                  setOrganizer({ id: organizerSnap.id, ...organizerSnap.data() } as UserProfile);
                }
            }
        } else {
            toast({ title: 'Error', description: 'Tournament not found.', variant: 'destructive' });
            router.push('/tournaments');
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching tournament:", error);
        toast({ title: 'Error', description: 'Could not load tournament data.', variant: 'destructive' });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentId, router, toast, organizer]);

  const handleRegisterTeam = () => {
    if (!userProfile?.teamId) {
        toast({ title: "No Team", description: "You must be on a team to register." });
        return;
    }
    startRegistering(async () => {
        const result = await registerTeamForTournament({ tournamentId, teamId: userProfile.teamId! });
        if (result.success) {
            toast({ title: "Success!", description: "Your team has been registered for the tournament." });
        } else {
            toast({ title: "Registration Failed", description: result.message, variant: "destructive" });
        }
    });
  };
  
  const canRegister = userProfile?.teamId && (
    userProfile.role === 'founder' 
    || userProfile.role === 'coach'
    || claims?.role === 'admin'
    || claims?.role === 'moderator'
  );
  const isRegistered = tournament?.participants?.some(p => p.id === userProfile?.teamId);


  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1">
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null; // Redirect is handled in the effect
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournaments
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div className="flex items-center gap-4">
                  <Trophy className="h-10 w-10 text-primary" />
                  <div>
                    <CardTitle className="font-headline text-3xl">
                      {tournament.name}
                    </CardTitle>
                    <CardDescription>
                      A {tournament.game} tournament.
                    </CardDescription>
                  </div>
                </div>
                <div className="shrink-0">
                  <TournamentStatusBadge status={tournament.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="font-semibold font-headline mb-2 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Description & Rules
                </h3>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {tournament.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Start Date</p>
                    <p className="text-muted-foreground">
                      {format(tournament.startDate.toDate(), 'PPP p')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Format</p>
                    <p className="text-muted-foreground capitalize">
                      {tournament.format.replace('-', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Game</p>
                    <p className="text-muted-foreground">{tournament.game}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Organized by</p>
                    {organizer ? (
                      <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={`/users/${organizer.id}`} className="text-muted-foreground flex items-center gap-2 hover:underline">
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={organizer.avatarUrl} data-ai-hint="person avatar" />
                              <AvatarFallback>{organizer.name.slice(0,2)}</AvatarFallback>
                          </Avatar>
                          {tournament.organizer.name}
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-muted-foreground">
                        {tournament.organizer.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {tournament.status === 'upcoming' ? (
                canRegister ? (
                  <Button className="w-full" size="lg" disabled={isRegistered || isRegistering} onClick={handleRegisterTeam}>
                    {isRegistered ? "Team Registered" : (isRegistering ? "Registering..." : "Register Your Team")}
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" disabled>
                    {userProfile?.teamId ? "Only Founder, Coach or Staff can register" : "You must be on a team to register"}
                  </Button>
                )
              ) : (
                <Button className="w-full" size="lg" disabled>
                  Registration Closed
                </Button>
              )}
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
               <div className="flex items-center gap-3">
                    <Swords className="h-6 w-6 text-primary" />
                     <div>
                        <CardTitle className="font-headline text-2xl">Tournament Bracket</CardTitle>
                        <CardDescription>Follow the action as it unfolds.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
               <TournamentBracket bracket={tournament.bracket} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                   <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle className="font-headline text-xl">Participants ({tournament.participants?.length || 0})</CardTitle>
                            <CardDescription>Teams registered for this tournament.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {tournament.participants && tournament.participants.length > 0 ? (
                        tournament.participants.map(team => <ParticipantCard key={team.id} team={team} />)
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No teams have registered yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
