'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { Tournament, UserProfile } from '@/lib/types';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { TournamentBracket } from '@/components/tournaments/tournament-bracket';

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

export default function TournamentDetailPage() {
  const { tournamentId } = useParams() as { tournamentId: string };
  const router = useRouter();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournament = async () => {
      setLoading(true);
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);

      if (tournamentSnap.exists()) {
        const tournamentData = { id: tournamentSnap.id, ...tournamentSnap.data(), } as Tournament;
        setTournament(tournamentData);

        // Fetch organizer profile
        const organizerRef = doc(db, 'users', tournamentData.organizer.uid);
        const organizerSnap = await getDoc(organizerRef);
        if (organizerSnap.exists()) {
          setOrganizer({ id: organizerSnap.id, ...organizerSnap.data() } as UserProfile);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Tournament not found.',
          variant: 'destructive',
        });
        router.push('/tournaments');
      }
      setLoading(false);
    };

    fetchTournament();
  }, [tournamentId, router, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
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
                     <Link href={`/users/${organizer.id}`} className="text-muted-foreground flex items-center gap-2">
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

          <Button className="w-full" size="lg" disabled>
            Register Your Team (Coming Soon)
          </Button>
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
  );
}
