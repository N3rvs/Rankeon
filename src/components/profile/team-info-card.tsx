
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords } from 'lucide-react';
import { Link } from 'next-intl/navigation';

interface TeamInfoCardProps {
  teamId: string;
}

export function TeamInfoCard({ teamId }: TeamInfoCardProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchTeam = async () => {
      setLoading(true);
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        setTeam({ id: teamSnap.id, ...teamSnap.data() } as Team);
      } else {
        setTeam(null);
      }
      setLoading(false);
    };

    fetchTeam();
  }, [teamId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return null; // Or some message indicating team not found
  }

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <Link href={`/teams/${team.id}`} className="block group">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5 text-primary" />
            Equipo Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
              <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold group-hover:underline">{team.name}</p>
              <p className="text-sm text-muted-foreground">{team.game}</p>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
