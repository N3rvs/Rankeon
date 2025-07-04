'use client';

import { useState, useEffect } from 'react';
import type { Team, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';

interface TeamCardProps {
  team: Team;
}

function MemberAvatars({ memberIds }: { memberIds: string[] }) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const memberPromises = memberIds.slice(0, 5).map(id => getDoc(doc(db, 'users', id)));
        const memberDocs = await Promise.all(memberPromises);
        const memberProfiles = memberDocs
          .filter(doc => doc.exists())
          .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setMembers(memberProfiles);
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoading(false);
      }
    };
    if (memberIds && memberIds.length > 0) {
        fetchMembers();
    } else {
        setLoading(false);
    }
  }, [memberIds]);

  if (loading) {
    return <Skeleton className="h-8 w-24 rounded-full" />
  }

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {members.map(member => (
        <Avatar key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-card">
          <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="player avatar" />
          <AvatarFallback>{member.name?.slice(0, 2) || '?'}</AvatarFallback>
        </Avatar>
      ))}
      {memberIds.length > 5 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted ring-2 ring-card text-xs font-semibold">
          +{memberIds.length - 5}
        </div>
      )}
    </div>
  );
}


export function TeamCard({ team }: TeamCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-32 w-full">
        <Image src="https://placehold.co/600x200.png" alt={`${team.name} banner`} fill style={{ objectFit: 'cover' }} data-ai-hint="gaming banner" />
        <div className="absolute bottom-[-2rem] left-4">
          <Avatar className="h-16 w-16 border-4 border-card">
            <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
            <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <CardHeader className="pt-10">
        <CardTitle className="font-headline">{team.name}</CardTitle>
        <CardDescription>{team.game}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <MemberAvatars memberIds={team.memberIds || []} />
        <p className="text-sm text-muted-foreground">{team.description || 'No description provided.'}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/teams/${team.id}`}>
            <Settings className="mr-2 h-4 w-4" /> Manage Team
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
