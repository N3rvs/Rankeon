// src/app/(app)/teams/[id]/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Gamepad2, Info, Target, BrainCircuit, Globe, Frown, UserPlus, CheckCircle, Crown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition } from 'react';
import { collection, query, onSnapshot, Unsubscribe, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, TeamMember, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { applyToTeam } from '@/lib/actions/teams';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/i18n-context';

function PublicTeamProfile({ team, members }: { team: Team, members: TeamMember[] }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const { userProfile, loading: authLoading } = useAuth();

    const handleApply = () => {
        startTransition(async () => {
            const result = await applyToTeam(team.id);
            if (result.success) {
                toast({ title: "Application Sent", description: "Your application has been sent to the team founder." });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const roleIcons: { [key: string]: React.ReactNode } = {
        founder: <Crown className="h-4 w-4 text-amber-400" />,
        coach: <ShieldCheck className="h-4 w-4 text-blue-400" />,
    };

    const canApply = userProfile && !userProfile.teamId && team.lookingForPlayers;
    const hasApplied = false; // TODO: Implement logic to check if user has already applied
    
    const renderVideo = (videoUrl?: string) => {
        if (!videoUrl) {
          return (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">No showcase video provided.</p>
            </div>
          );
        }
        
        let embedUrl = '';
        if (videoUrl.includes("youtube.com/watch?v=")) {
          const videoId = videoUrl.split('v=')[1].split('&')[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes("youtu.be/")) {
          const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        if (embedUrl) {
          return (
            <div className="aspect-video">
              <iframe
                className="w-full h-full rounded-lg"
                src={embedUrl}
                title="Team Showcase Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          );
        }

        // Assume it's a direct video link (.mp4 etc)
        return <video controls src={videoUrl} className="w-full aspect-video rounded-lg bg-black" />;
    };

    return (
        <div className="space-y-6">
            <div className="pt-14 md:pt-8" />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* VIDEO COLUMN */}
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardContent className="p-0">
                            {renderVideo(team.videoUrl)}
                        </CardContent>
                    </Card>
                </div>

                {/* INFO COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-3xl lg:text-4xl font-headline">{team.name}</CardTitle>
                                <CardDescription className="flex items-center gap-4 pt-1">
                                    <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" />Playing {team.game}</span>
                                    {team.country && <span className="flex items-center gap-2"><Globe className="h-4 w-4" />{team.country}</span>}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {canApply && (
                                    <Button onClick={handleApply} disabled={isPending || authLoading}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        {isPending ? "Applying..." : "Apply to Join"}
                                    </Button>
                                )}
                                {userProfile?.teamId === team.id && (
                                     <Badge variant="secondary"><CheckCircle className="mr-2 h-4 w-4"/>Your Team</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h3 className="font-headline font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5" /> About the Team</h3>
                            <p className="text-muted-foreground text-sm">{team.description || 'No description provided.'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><Target className="h-5 w-5" /> Recruitment Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Badge variant={team.lookingForPlayers ? 'default' : 'secondary'}>{team.lookingForPlayers ? 'Actively Recruiting' : 'Team Full'}</Badge>
                            <div className="flex flex-wrap gap-2">
                                {team.lookingForPlayers && team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                                    team.recruitingRoles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)
                                ) : (
                                    <p className="text-sm text-muted-foreground">{team.lookingForPlayers ? 'All roles welcome.' : 'No specific roles wanted.'}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5" /> Team Members ({members.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {members.map(member => (
                                <div key={member.id} className="p-3 flex items-center justify-between rounded-lg border bg-background">
                                    <Link href={`/users/${member.id}`} className="flex items-center gap-3 group flex-1">
                                        <Avatar>
                                            <AvatarImage src={member.avatarUrl} data-ai-hint="person avatar" />
                                            <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-sm group-hover:underline">{member.name}</span>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                {roleIcons[member.role] || null}
                                                <span className="capitalize">{member.role}</span>
                                                {member.isIGL && (<> <span className="mx-1">·</span> <BrainCircuit className="h-4 w-4 text-sky-400" /><span>IGL</span> </>)}
                                            </div>
                                            {member.skills && member.skills.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    {member.skills.map(skill => (
                                                        <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function TeamPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const { t } = useI18n();
    const teamId = params.id as string;

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!authLoading && userProfile && userProfile.teamId === teamId) {
        router.replace('/teams');
      }
    }, [teamId, userProfile, authLoading, router]);

    useEffect(() => {
        if (!teamId) return;

        let teamUnsubscribe: Unsubscribe | undefined;
        let membersUnsubscribe: Unsubscribe | undefined;

        const cleanup = () => {
            if (teamUnsubscribe) teamUnsubscribe();
            if (membersUnsubscribe) membersUnsubscribe();
        };
    
        setLoading(true);
        const teamRef = doc(db, 'teams', teamId);
        
        teamUnsubscribe = onSnapshot(teamRef, (teamDoc) => {
          if (membersUnsubscribe) membersUnsubscribe();

          if (teamDoc.exists()) {
            const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
            setTeam(teamData);

            const membersQuery = query(collection(db, `teams/${teamData.id}/members`));
            membersUnsubscribe = onSnapshot(membersQuery, async (membersSnapshot) => {
                const memberPromises = membersSnapshot.docs.map(async (memberDoc) => {
                    const memberData = memberDoc.data();
                    const userDocSnap = await getDoc(doc(db, 'users', memberDoc.id));
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        return {
                            id: memberDoc.id,
                            role: memberData.role,
                            joinedAt: memberData.joinedAt,
                            isIGL: memberData.isIGL || false,
                            name: userData.name,
                            avatarUrl: userData.avatarUrl,
                            skills: userData.skills || [],
                        } as TeamMember
                    }
                    return null;
                });
                const memberDocs = await Promise.all(memberPromises);
                setMembers(memberDocs.filter(Boolean) as TeamMember[]);
                setLoading(false);
            });
          } else {
            setTeam(null);
            setMembers([]);
            setLoading(false);
          }
        }, (error) => {
          console.error("Error fetching team: ", error);
          setLoading(false);
        });
    
        return cleanup;
      }, [teamId]);

    if (loading || authLoading) {
        return (
            <div className="space-y-6">
                 <div className="relative -mx-4 md:-mx-6">
                    <Skeleton className="h-48 md:h-64 bg-muted" />
                    <div className="absolute top-full -translate-y-1/2 left-6 md:left-8 z-10">
                        <Skeleton className="h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-background" />
                    </div>
                </div>
                 <div className="pt-20">
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-full mt-24">
                <Frown className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Team Not Found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">The team you are looking for does not exist.</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="relative -mx-4 md:-mx-6 -mt-4 md:-mt-6">
                <div className="h-48 md:h-64 bg-muted overflow-hidden">
                    {team && (
                        <Image
                            src={team.bannerUrl || 'https://placehold.co/1200x480.png'}
                            alt={`${team.name} banner`}
                            fill
                            className="object-cover"
                            data-ai-hint="team banner"
                        />
                    )}
                </div>
                {team && (
                    <div className="absolute top-full -translate-y-1/2 left-6 md:left-8 z-10">
                        <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background bg-card">
                            <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
                            <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                    </div>
                )}
            </div>

            <PublicTeamProfile team={team} members={members} />
        </div>
    );
}
