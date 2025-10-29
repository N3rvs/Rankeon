
// src/app/(app)/teams/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trash2, Edit, Crown, MoreVertical, ShieldCheck, UserMinus, UserCog, Gamepad2, Info, Target, BrainCircuit, Globe, Store, Trophy, ClipboardList, Settings, Swords, Shield, Twitch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition } from 'react';
// updateDoc ya no es necesario aquí para skills
import { collection, query, onSnapshot, Unsubscribe, doc, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, TeamMember, UserProfile, Tournament } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam, kickTeamMember, setTeamIGL, getTeamMembers, updateMemberSkills } from '@/lib/actions/teams';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditTeamDialog } from '@/components/teams/edit-team-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuLabel, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { TeamApplications } from '@/components/teams/team-applications';
import { useI18n } from '@/contexts/i18n-context';
import { format } from 'date-fns';
import { CreateScrimDialog } from '@/components/scrims/create-scrim-dialog';
import { TeamScrimStatsCard } from '@/components/teams/team-scrim-stats-card';
import { UpcomingScrimsCard } from '@/components/teams/upcoming-scrims-card';
import { Spinner } from '@/components/ui/spinner';
import { TeamTasksDialog } from '@/components/teams/TeamTasksDialog';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

function MemberManager({ team, member, currentUserRole }: { team: Team, member: TeamMember, currentUserRole: 'founder' | 'coach' | 'member' }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const [isKickAlertOpen, setKickAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const valorantRoles = ["Controlador", "Iniciador", "Duelista", "Centinela"];

    const handleRoleToggle = (toggledRole: string) => {
        startTransition(async () => {
            const currentSkills = member.skills || [];
            let newSkills;
            if (currentSkills.includes(toggledRole)) {
                newSkills = currentSkills.filter((skill) => skill !== toggledRole);
            } else {
                if (currentSkills.length >= 2) {
                    toast({
                        title: "No se pueden añadir más roles",
                        description: "Un jugador puede tener como máximo 2 roles.",
                        variant: "destructive"
                    });
                    return;
                }
                newSkills = [...currentSkills, toggledRole];
            }

            const result = await updateMemberSkills(team.id, member.id, newSkills);

            if (result.success) {
                toast({
                    title: 'Roles actualizados',
                    description: `Se han actualizado los roles de ${member.name}.`
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'No se pudieron actualizar los roles',
                    variant: 'destructive',
                });
            }
        });
    };


    const handleKick = () => {
        startTransition(async () => {
            const result = await kickTeamMember(team.id, member.id);
             if (result.success) {
                toast({ title: 'Member Kicked', description: `${member.name} has been kicked from the team.` });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
            setKickAlertOpen(false);
        });
    }

    const handleSetIGL = () => {
        startTransition(async () => {
            const result = await setTeamIGL(team.id, member.isIGL ? null : member.id);
            if (result.success) {
                toast({ title: t('MemberManager.role_updated'), description: result.message });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const canKick = currentUserRole === 'founder';
    const canManageRoles = currentUserRole === 'founder' || currentUserRole === 'coach';

    if (member.role === 'founder' || !canManageRoles) {
        return null;
    }

    return (
        <>
            <AlertDialog open={isKickAlertOpen} onOpenChange={setKickAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('MemberManager.kick_confirm_title', { name: member.name })}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('MemberManager.kick_confirm_desc', { name: member.name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('MemberManager.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleKick} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? t('MemberManager.kicking') : t('MemberManager.confirm_kick')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {canManageRoles && (
                       <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>{t('MemberManager.edit_game_roles')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuLabel>Roles</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {valorantRoles.map(role => (
                                        <DropdownMenuCheckboxItem
                                            key={role}
                                            checked={member.skills?.includes(role)}
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                handleRoleToggle(role);
                                            }}
                                            disabled={isPending}
                                        >
                                            {role}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    )}
                    {canManageRoles && <DropdownMenuSeparator />}
                    {canManageRoles && (
                         <DropdownMenuItem onSelect={handleSetIGL} disabled={isPending}>
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            {member.isIGL ? t('MemberManager.remove_igl') : t('MemberManager.set_igl')}
                        </DropdownMenuItem>
                    )}
                    {canKick && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setKickAlertOpen(true)} className="text-destructive focus:text-destructive" disabled={isPending}>
                                <UserMinus className="mr-2 h-4 w-4" /> {t('MemberManager.kick_from_team')}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

function TeamDisplay({ team, members, currentUserRole, userProfile }: {
    team: Team,
    members: TeamMember[],
    currentUserRole: 'founder' | 'coach' | 'member',
    userProfile: UserProfile | null
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isTasksDialogOpen, setIsTasksDialogOpen] = useState(false);
    const [wonTournaments, setWonTournaments] = useState<Tournament[]>([]);
    const [loadingTrophies, setLoadingTrophies] = useState(true);

    const staff = members.filter(m => m.role === 'founder' || m.role === 'coach').sort((a, b) => a.role === 'founder' ? -1 : 1);
    const players = members.filter(m => m.role === 'member');

    useEffect(() => {
        if (!team?.id) {
            setLoadingTrophies(false);
            return;
        }
        setLoadingTrophies(true);
        const q = query(
            collection(db, 'tournaments'),
            where('winnerId', '==', team.id),
            orderBy('startDate', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
            setWonTournaments(tournaments);
            setLoadingTrophies(false);
        }, (error) => {
            console.error("Error fetching won tournaments:", error);
            setLoadingTrophies(false);
        });
        return () => unsubscribe();
    }, [team?.id]);

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteTeam({ teamId: team.id });
            if (result.success) {
                toast({ title: t('TeamsPage.delete_confirm_title'), description: "Your team has been successfully deleted." });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const isStaff = currentUserRole === 'founder' || currentUserRole === 'coach';
    const isFounder = currentUserRole === 'founder';

    const rankRange = team.rankMin && team.rankMax
        ? team.rankMin === team.rankMax
            ? team.rankMin
            : `${team.rankMin} - ${team.rankMax}`
        : null;

    const renderVideo = (videoUrl?: string) => {
        if (!videoUrl) return null;
        let embedUrl = '';
        if (videoUrl.includes("youtube.com/watch?v=")) {
          const videoId = videoUrl.split('v=')[1].split('&')[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes("youtu.be/")) {
          const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        const videoNode = embedUrl ? (
             <div className="aspect-video">
               <iframe
                 className="w-full h-full rounded-lg"
                 src={embedUrl}
                 title="Team Showcase Video"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                 allowFullScreen
               ></iframe>
            </div>
        ) : (
            <video controls src={videoUrl} className="w-full aspect-video rounded-lg bg-black" />
        );

        return (
            <Card>
                <CardContent className="p-0">
                    {videoNode}
                </CardContent>
            </Card>
        );
    };

    const MemberCard = ({ member }: { member: TeamMember }) => {
        const roleIcons: { [key: string]: React.ReactNode } = {
            founder: <Crown className="h-4 w-4 text-amber-400" />,
            coach: <ShieldCheck className="h-4 w-4 text-blue-400" />,
        };

        return (
            <div className="p-3 flex items-center justify-between rounded-lg border bg-background">
                <Link href={`/users/${member.id}`} className="flex items-center gap-3 group flex-1">
                    <Avatar>
                        <AvatarImage src={member.avatarUrl} data-ai-hint="person avatar" />
                        <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                        <span className="font-semibold text-sm group-hover:underline flex items-center gap-1.5">
                            {member.name}
                            {member.isCertifiedStreamer && <Twitch className="h-4 w-4 text-purple-500" />}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {roleIcons[member.role] || null}
                            <span className="capitalize">{member.role}</span>
                            {member.isIGL && ( <> <span className="mx-1">·</span> <BrainCircuit className="h-4 w-4 text-sky-400" /> <span>IGL</span> </> )}
                        </div>
                        {member.skills && member.skills.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                                {member.skills.map(skill => ( <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge> ))}
                            </div>
                        )}
                    </div>
                </Link>
                <MemberManager team={team} member={member} currentUserRole={currentUserRole} />
            </div>
        )
    };

    return (
        <div className="space-y-6 pt-20">
            <EditTeamDialog team={team} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
            {isStaff && <TeamTasksDialog teamId={team.id} open={isTasksDialogOpen} onOpenChange={setIsTasksDialogOpen} />}
            
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* LEFT/MAIN COLUMN */}
                <div className="lg:col-span-3 space-y-6">
                    {renderVideo(team.videoUrl)}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5" /> {t('TeamsPage.team_members', { count: members.length })}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Staff</h4>
                                <div className="space-y-2">
                                    {staff.map(member => <MemberCard key={member.id} member={member} />)}
                                </div>
                            </div>
                            {players.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm mt-6 mb-2 text-muted-foreground">Players</h4>
                                    <div className="space-y-2">
                                        {players.map(member => <MemberCard key={member.id} member={member} />)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <UpcomingScrimsCard teamId={team.id} />
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                         <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-3xl lg:text-4xl font-headline">{team.name}</CardTitle>
                                <CardDescription className="flex items-center gap-4 pt-1 flex-wrap">
                                    <span className="flex items-center gap-2"> <Gamepad2 className="h-4 w-4" /> <span>{t('TeamsPage.playing')} {team.game}</span> </span>
                                    {team.country && ( <> <span className="text-muted-foreground/50">|</span> <span className="flex items-center gap-2"> <Globe className="h-4 w-4" /> <span>{team.country}</span> </span> </> )}
                                     {rankRange && ( <> <span className="text-muted-foreground/50">|</span> <span className="flex items-center gap-2"> <Shield className="h-4 w-4" /> <span>{rankRange}</span> </span> </> )}
                                </CardDescription>
                            </div>
                            {isFounder && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button onClick={() => setIsEditDialogOpen(true)} size="icon" variant="secondary"> <Edit className="h-4 w-4" /> <span className="sr-only">{t('TeamsPage.edit')}</span> </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="icon">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('TeamsPage.delete')}</span>
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('TeamsPage.delete_confirm_title')}</AlertDialogTitle>
                                                <AlertDialogDescription> {t('TeamsPage.delete_confirm_desc')} </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('MemberManager.cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90"> {isPending ? t('TeamsPage.deleting') : t('TeamsPage.delete_confirm_button')} </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <h3 className="font-headline font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5" /> {t('TeamsPage.about_the_team')}</h3>
                            <p className="text-muted-foreground text-sm">{team.description || t('TeamsPage.no_description')}</p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><Target className="h-5 w-5" /> {t('TeamsPage.recruitment_status')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Badge variant={team.lookingForPlayers ? 'default' : 'secondary'}>{team.lookingForPlayers ? t('TeamsPage.recruiting') : t('TeamsPage.team_full')}</Badge>
                            <div className="flex flex-wrap gap-2">
                                {team.lookingForPlayers && team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                                    team.recruitingRoles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)
                                ) : (
                                    <p className="text-sm text-muted-foreground">{team.lookingForPlayers ? t('TeamsPage.all_roles_welcome') : t('TeamsPage.no_roles_wanted')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"> <Trophy className="h-5 w-5" /> {t('TeamsPage.achievements_title')} </CardTitle>
                            <CardDescription>{t('TeamsPage.achievements_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-2">{t('TeamsPage.trophy_room_title')}</h4>
                                {loadingTrophies ? (
                                    <Skeleton className="h-12 w-full" />
                                ) : wonTournaments.length > 0 ? (
                                    <div className="space-y-2">
                                        {wonTournaments.map(tourney => (
                                            <div key={tourney.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                                                <Trophy className="h-4 w-4 text-yellow-500" />
                                                <p className="font-semibold flex-1 truncate">{t('TeamsPage.tournament_champion', { tournamentName: tourney.name })}</p>
                                                {/* Asegura que startDate exista antes de llamar a toDate() */}
                                                <p className="text-xs text-muted-foreground">{tourney.startDate ? format(tourney.startDate.toDate(), "d MMM") : 'N/A'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">{t('TeamsPage.no_tournaments_won')}</p>
                                )}
                            </div>
                            <TeamScrimStatsCard team={team} />
                        </CardContent>
                    </Card>

                    {isStaff && <TeamApplications teamId={team.id} />}
                    
                    {isStaff && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2"> <Settings className="h-5 w-5" /> {t('TeamsPage.management_title')} </CardTitle>
                                <CardDescription>{t('TeamsPage.management_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Button variant="secondary" onClick={() => setIsTasksDialogOpen(true)}> <ClipboardList className="mr-2 h-4 w-4" /> {t('TeamsPage.team_tasks')} </Button>
                                {/* --- CORRECCIÓN 2 APLICADA: Pasa userProfile?.country --- */}
                                <CreateScrimDialog teamId={team.id} teamCountry={userProfile?.country} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function NoTeamDisplay({ userProfile }: { userProfile: UserProfile | null }) {
    const { t } = useI18n();
    const canCreateTeam = userProfile?.role === 'player';

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-full mt-24">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{t('TeamsPage.no_team_title')}</h3>
            {canCreateTeam ? (
                 <>
                   <p className="mb-4 mt-2 text-sm text-muted-foreground"> {t('TeamsPage.no_team_subtitle')} </p>
                   <CreateTeamDialog />
                 </>
            ) : (
                <p className="mb-4 mt-2 text-sm text-muted-foreground"> {t('TeamsPage.no_team_subtitle_generic')} </p>
            )}
            <p className="mb-4 mt-8 text-sm text-muted-foreground"> {t('TeamsPage.no_team_join_prompt')} </p>
            <Button asChild>
                <Link href="/dashboard"> <Store className="mr-2 h-4 w-4" /> {t('TeamsPage.join_a_team')} </Link>
            </Button>
        </div>
    );
}


export default function TeamsPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (authLoading) {
            setLoadingTeam(true);
            return;
        }

        let teamUnsubscribe: Unsubscribe | undefined;

        if (userProfile?.teamId) {
            setLoadingTeam(true);
            const teamId = userProfile.teamId;
            const teamRef = doc(db, 'teams', teamId);
            
            teamUnsubscribe = onSnapshot(teamRef, (teamDoc) => {
                if (teamDoc.exists()) {
                const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
                setTeam(teamData);
                
                // Now fetch members securely
                getTeamMembers(teamId).then(result => {
                    if (result.success && result.data) {
                    setMembers(result.data);
                    } else {
                    setMembers([]);
                    toast({ title: 'Error', description: `Failed to load team members: ${result.message}`, variant: 'destructive' });
                    }
                    setLoadingTeam(false); // Set loading to false after members are fetched
                });

                } else {
                setTeam(null);
                setMembers([]);
                setLoadingTeam(false);
                }
            }, (error) => {
                const permissionError = new FirestorePermissionError({
                    path: teamRef.path,
                    operation: 'get',
                });
                errorEmitter.emit('permission-error', permissionError);
                setTeam(null);
                setMembers([]);
                setLoadingTeam(false);
            });

        } else {
            setTeam(null);
            setMembers([]);
            setLoadingTeam(false);
        }

        return () => {
            if (teamUnsubscribe) teamUnsubscribe();
        };
    }, [userProfile?.teamId, authLoading, toast]);

    if (authLoading || loadingTeam) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner className="h-12 w-12" />
            </div>
        );
    }
    
    const currentUserMembership = members.find(m => m.id === userProfile?.id);

    return (
        <div className="-mt-4 md:-mt-6">
            <div className="relative -mx-4 md:-mx-6">
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

            {team && currentUserMembership ?
                <TeamDisplay
                    team={team}
                    members={members}
                    currentUserRole={currentUserMembership.role}
                    userProfile={userProfile}
                 /> :
                 <NoTeamDisplay userProfile={userProfile} />
             }
        </div>
    );
}
