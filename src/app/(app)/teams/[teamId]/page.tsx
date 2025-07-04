'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { Team, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Gamepad2, ShieldCheck, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

function MemberCard({
  profile,
  isFounder,
}: {
  profile: UserProfile;
  isFounder: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={profile.avatarUrl} data-ai-hint="person avatar" />
          <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{profile.name}</span>
      </div>
      <Badge
        variant={isFounder ? 'default' : 'secondary'}
        className="capitalize"
      >
        {isFounder ? 'Founder' : 'Member'}
      </Badge>
    </div>
  );
}

export default function TeamProfilePage() {
  const { teamId } = useParams() as { teamId: string };
  const router = useRouter();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const teamRef = doc(db, 'teams', teamId);
    const unsubscribe = onSnapshot(
      teamRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
          setTeam(teamData);

          if (teamData.memberIds && teamData.memberIds.length > 0) {
            const profiles = await Promise.all(
              teamData.memberIds.map(async (uid) => {
                const userDoc = await getDoc(doc(db, 'users', uid));
                return userDoc.exists()
                  ? ({ id: userDoc.id, ...userDoc.data() } as UserProfile)
                  : null;
              })
            );
            setMembers(profiles.filter(Boolean) as UserProfile[]);
          } else {
            setMembers([]);
          }
        } else {
          setTeam(null);
          toast({
            title: 'Error',
            description: 'El equipo no existe o fue eliminado.',
            variant: 'destructive',
          });
          router.push('/dashboard');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching team:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamId, router, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!team) {
    return null; // Redirect is handled in effect
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Mercado
      </Button>

      <Card>
        <CardHeader className="p-0">
          <div className="relative h-48 w-full">
            <Image
              src={team.bannerUrl || 'https://placehold.co/1200x400.png'}
              alt={`${team.name} banner`}
              fill
              className="object-cover rounded-t-lg"
              data-ai-hint="team banner"
            />
            <div className="absolute bottom-0 left-6 translate-y-1/2">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage
                  src={team.avatarUrl}
                  alt={team.name}
                  data-ai-hint="team logo"
                />
                <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="pt-16 px-6 pb-4">
            <CardTitle className="text-3xl font-headline">{team.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Gamepad2 className="h-4 w-4" />
              <span>Playing {team.game}</span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 space-y-6">
          <div>
            <h3 className="font-semibold font-headline mb-2">About Team</h3>
            <p className="text-muted-foreground text-sm">
              {team.description || 'No description provided.'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold font-headline mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              We are recruiting
            </h3>
            <div className="flex flex-wrap gap-2">
              {team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                team.recruitingRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Any role is welcome.
                </p>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold font-headline mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  profile={member}
                  isFounder={member.id === team.founder}
                />
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              toast({
                title: 'Coming Soon!',
                description: 'The team application system is under construction.',
              })
            }
          >
            <Mail className="mr-2 h-4 w-4" /> Apply to Join
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
