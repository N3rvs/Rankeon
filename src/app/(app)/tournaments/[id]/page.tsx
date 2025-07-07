'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Gamepad2, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { TournamentBracket } from '@/components/tournaments/tournament-bracket';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useI18n } from '@/contexts/i18n-context';

function getStatusBadgeVariant(status: Tournament['status']) {
  switch (status) {
    case 'upcoming':
      return 'secondary';
    case 'ongoing':
      return 'default';
    case 'completed':
      return 'outline';
    default:
      return 'secondary';
  }
}

function TournamentDetails({ tournament }: { tournament: Tournament }) {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const canRegister = tournament.status === 'upcoming' && userProfile?.teamId && userProfile.role === 'founder';
  const isRegistered = tournament.participants?.some(p => p.id === userProfile?.teamId);

  const statusText = {
    upcoming: t('TournamentDetailsPage.status_upcoming'),
    ongoing: t('TournamentDetailsPage.status_ongoing'),
    completed: t('TournamentDetailsPage.status_completed'),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="font-headline text-2xl">{tournament.name}</CardTitle>
              <Badge variant={getStatusBadgeVariant(tournament.status)} className="capitalize">{statusText[tournament.status]}</Badge>
            </div>
            <CardDescription className="flex items-center gap-2 pt-2">
              <Gamepad2 className="h-4 w-4" /> {tournament.game}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('TournamentDetailsPage.date_label')}:</span>
              <span className="font-semibold">{format(tournament.startDate.toDate(), "PPP")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('TournamentDetailsPage.format_label')}:</span>
              <span className="font-semibold capitalize">{tournament.format.replace('-', ' ')}</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">{t('TournamentDetailsPage.description_label')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>
            </div>
          </CardContent>
        </Card>
        
        {canRegister && (
          <Card>
            <CardHeader>
              <CardTitle>{t('TournamentDetailsPage.register_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isRegistered ? (
                 <p className="text-green-600 font-semibold">{t('TournamentDetailsPage.registered_text')}</p>
              ) : (
                <Button className="w-full">{t('TournamentDetailsPage.register_button')}</Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('TournamentDetailsPage.participants_title', {count: tournament.participants?.length || 0})}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {tournament.participants && tournament.participants.length > 0 ? (
                    tournament.participants.map(team => (
                        <div key={team.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={team.avatarUrl} data-ai-hint="team logo" />
                                <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{team.name}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('TournamentDetailsPage.no_participants')}</p>
                )}
            </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2">
        <TournamentBracket bracket={tournament.bracket || null} />
      </div>
    </div>
  );
}

export default function TournamentPage() {
  const params = useParams();
  const id = params.id as string;
  const { t } = useI18n();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
      } else {
        setTournament(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tournament:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return <div>Tournament not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/tournaments">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('TournamentDetailsPage.back_button')}
        </Link>
      </Button>
      <TournamentDetails tournament={tournament} />
    </div>
  );
}
