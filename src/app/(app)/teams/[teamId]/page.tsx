'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';
import type { Team, TeamMember, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Settings } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamMembersTable } from '@/components/teams/team-members-table';
import { TeamSettings } from '@/components/teams/team-settings';

interface EnrichedTeamMember extends UserProfile {
  role: TeamMember['role'];
  joinedAt: any;
}

export default function TeamManagementPage() {
  const { teamId } = useParams() as { teamId: string };
  const { user } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<EnrichedTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !user) return;

    const teamRef = doc(db, 'teams', teamId);
    const unsubscribeTeam = onSnapshot(teamRef, (docSnap) => {
      if (docSnap.exists()) {
        setTeam({ id: docSnap.id, ...docSnap.data() } as Team);
      } else {
        setTeam(null);
        router.push('/teams');
      }
    });

    const membersRef = collection(db, 'teams', teamId, 'members');
    const membersQuery = query(membersRef);
    const unsubscribeMembers = onSnapshot(membersQuery, async (snapshot) => {
      const memberDocs = snapshot.docs;
      const memberProfilesPromises = memberDocs.map(async (memberDoc) => {
        const memberData = memberDoc.data() as TeamMember;
        const userDoc = await getDoc(doc(db, 'users', memberDoc.id));
        if (userDoc.exists()) {
          return {
            ...(userDoc.data() as UserProfile),
            id: userDoc.id,
            role: memberData.role,
            joinedAt: memberData.joinedAt,
          };
        }
        return null;
      });

      const resolvedMembers = (await Promise.all(memberProfilesPromises)).filter(Boolean) as EnrichedTeamMember[];
      resolvedMembers.sort((a, b) => {
        const roleOrder = { founder: 0, coach: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      });

      setMembers(resolvedMembers);
      setLoading(false);
    });

    return () => {
      unsubscribeTeam();
      unsubscribeMembers();
    };
  }, [teamId, user, router]);

  const currentMemberRole = useMemo(() => {
    return members.find(m => m.id === user?.uid)?.role;
  }, [members, user]);
  
  const canManage = currentMemberRole === 'founder' || currentMemberRole === 'coach';

  if (loading || !team) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Teams
      </Button>

      <Card className="overflow-hidden">
        <div className="relative h-48 w-full bg-muted">
          <Image src={team.bannerUrl || "https://placehold.co/1200x400.png"} alt={`${team.name} banner`} fill style={{ objectFit: 'cover' }} data-ai-hint="gaming banner" />
        </div>
        <CardHeader className="p-6 relative">
          <div className="absolute top-[-3rem] left-6">
            <Avatar className="h-24 w-24 border-4 border-card">
              <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
              <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="pt-12">
            <CardTitle className="text-3xl font-headline">{team.name}</CardTitle>
            <CardDescription>{team.description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="members">
        <TabsList>
            <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" /> Members</TabsTrigger>
            {canManage && <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" /> Settings</TabsTrigger>}
        </TabsList>
        <TabsContent value="members" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Team Roster</CardTitle>
                    <CardDescription>View and manage your team members.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TeamMembersTable members={members} currentMemberRole={currentMemberRole} teamId={team.id} />
                </CardContent>
            </Card>
        </TabsContent>
        {canManage && (
            <TabsContent value="settings" className="mt-4">
                <TeamSettings team={team} currentMemberRole={currentMemberRole} />
            </TabsContent>
        )}
      </Tabs>

    </div>
  );
}
