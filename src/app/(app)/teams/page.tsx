// src/app/(app)/teams/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trash2, Edit, Crown, MoreVertical, ShieldCheck, UserMinus, UserCog, Gamepad2, Info, Target, BrainCircuit, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition } from 'react';
import { collection, query, onSnapshot, Unsubscribe, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, TeamMember, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam, kickTeamMember, updateTeamMemberRole, setTeamIGL } from '@/lib/actions/teams';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditTeamDialog } from '@/components/teams/edit-team-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog';

function MemberManager({ team, member, currentUserRole }: { team: Team, member: TeamMember, currentUserRole: 'founder' | 'coach' | 'member' }) {
    const { toast } = useToast();
    const [isKickAlertOpen, setKickAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedMemberProfile, setSelectedMemberProfile] = useState<UserProfile | null>(null);

    const handleOpenEditDialog = async () => {
        // If we already have the profile data, just open the dialog
        if (selectedMemberProfile && selectedMemberProfile.id === member.id) {
            setIsEditDialogOpen(true);
            return;
        }
        startTransition(async () => {
            const userDoc = await getDoc(doc(db, 'users', member.id));
            if (userDoc.exists()) {
                setSelectedMemberProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
                setIsEditDialogOpen(true);
            } else {
                toast({ title: "Error", description: "Could not find user profile.", variant: "destructive" });
            }
        });
    };

    const handleRoleChange = (newRole: 'coach' | 'member') => {
        if (member.role === newRole) return;
        startTransition(async () => {
            const result = await updateTeamMemberRole(team.id, member.id, newRole);
            if (result.success) {
                toast({ title: "Rol Actualizado", description: `${member.name} es ahora ${newRole}.` });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    }

    const handleKick = () => {
        startTransition(async () => {
            const result = await kickTeamMember(team.id, member.id);
             if (result.success) {
                toast({ title: "Miembro Expulsado", description: `${member.name} ha sido expulsado del equipo.` });
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
                toast({ title: "Rol Actualizado", description: result.message });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const canEditProfile = currentUserRole === 'founder' || currentUserRole === 'coach';
    const canManageRoles = currentUserRole === 'founder' || currentUserRole === 'coach';
    const canKick = currentUserRole === 'founder' || (currentUserRole === 'coach' && member.role === 'member');
    const canSetIGL = currentUserRole === 'founder' || currentUserRole === 'coach';

    if (member.role === 'founder' || (!canManageRoles && !canKick && !canEditProfile)) {
        return null;
    }

    return (
        <>
            {selectedMemberProfile && (
                <EditProfileDialog
                    userProfile={selectedMemberProfile}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                />
            )}
            <AlertDialog open={isKickAlertOpen} onOpenChange={setKickAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Expulsar a {member.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. {member.name} será eliminado permanentemente de tu equipo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleKick} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Expulsando..." : "Sí, expulsar"}
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
                    {canEditProfile && (
                        <DropdownMenuItem onSelect={handleOpenEditDialog} disabled={isPending}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                        </DropdownMenuItem>
                    )}
                    {(canEditProfile && (canManageRoles || canSetIGL)) && <DropdownMenuSeparator />}
                    {canManageRoles && (
                        <>
                            {member.role === 'member' && (
                                <DropdownMenuItem onSelect={() => handleRoleChange('coach')} disabled={isPending}>
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Ascender a Coach
                                </DropdownMenuItem>
                            )}
                            {member.role === 'coach' && (
                                <DropdownMenuItem onSelect={() => handleRoleChange('member')} disabled={isPending}>
                                    <UserCog className="mr-2 h-4 w-4" /> Degradar a Miembro
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                    {canSetIGL && (
                         <DropdownMenuItem onSelect={handleSetIGL} disabled={isPending}>
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            {member.isIGL ? 'Quitar Rol de IGL' : 'Designar como IGL'}
                        </DropdownMenuItem>
                    )}
                    {canKick && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setKickAlertOpen(true)} className="text-destructive focus:text-destructive" disabled={isPending}>
                                <UserMinus className="mr-2 h-4 w-4" /> Expulsar del Equipo
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

function TeamDisplay({ team, members, currentUserRole }: { team: Team, members: TeamMember[], currentUserRole: 'founder' | 'coach' | 'member' }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteTeam({ teamId: team.id });
            if (result.success) {
                toast({ title: "Equipo Eliminado", description: "Tu equipo ha sido eliminado con éxito." });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const roleIcons: { [key: string]: React.ReactNode } = {
        founder: <Crown className="h-4 w-4 text-amber-400" />,
        coach: <ShieldCheck className="h-4 w-4 text-blue-400" />,
    };

    return (
        <div className="space-y-6">
            <EditTeamDialog team={team} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
            
            <div className="pt-14 md:pt-8" />
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                             <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-3xl lg:text-4xl font-headline">{team.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-4 pt-1">
                                        <span className="flex items-center gap-2">
                                            <Gamepad2 className="h-4 w-4" />
                                            <span>Jugando {team.game}</span>
                                        </span>
                                        {team.country && (
                                            <>
                                                <span className="text-muted-foreground/50">|</span>
                                                <span className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span>{team.country}</span>
                                                </span>
                                            </>
                                        )}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                     <Button onClick={() => setIsEditDialogOpen(true)} size="sm">
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente tu equipo y todos sus datos. Tu rol volverá a ser "jugador".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    {isPending ? "Eliminando..." : "Sí, eliminar equipo"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <h3 className="font-headline font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5" /> Sobre el Equipo</h3>
                                <p className="text-muted-foreground text-sm">{team.description || 'No se ha proporcionado una descripción.'}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5" /> Miembros del Equipo ({members.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {members.map(member => (
                                    <Card key={member.id} className="p-2 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.avatarUrl} data-ai-hint="person avatar" />
                                                <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col items-start">
                                                <span className="font-semibold text-sm">{member.name}</span>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                     {roleIcons[member.role] || null}
                                                     <span className="capitalize">{member.role}</span>
                                                     {member.isIGL && (
                                                        <>
                                                            <span className="mx-1">·</span>
                                                            <BrainCircuit className="h-4 w-4 text-sky-400" />
                                                            <span>IGL</span>
                                                        </>
                                                     )}
                                                </div>
                                                {member.skills && member.skills.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {member.skills.map(skill => (
                                                            <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <MemberManager team={team} member={member} currentUserRole={currentUserRole} />
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN */}
                     <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2"><Target className="h-5 w-5" /> Estado de Reclutamiento</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Badge variant={team.lookingForPlayers ? 'default' : 'secondary'}>{team.lookingForPlayers ? 'Activamente Reclutando' : 'Equipo Lleno'}</Badge>
                                <div className="flex flex-wrap gap-2">
                                    {team.lookingForPlayers && team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                                        team.recruitingRoles.map((role) => <Badge key={role} variant="outline">{role}</Badge>)
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{team.lookingForPlayers ? 'Cualquier rol es bienvenido.' : 'No se están buscando roles específicos.'}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
        </div>
    );
}

function NoTeamDisplay() {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-full mt-24">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">Aún no tienes un equipo</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                ¡Crea tu propio equipo para empezar a reclutar jugadores!
            </p>
            <CreateTeamDialog />
        </div>
    );
}


export default function TeamsPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(true);

    useEffect(() => {
        let teamUnsubscribe: Unsubscribe | undefined;
        let membersUnsubscribe: Unsubscribe | undefined;

        const cleanup = () => {
            if (teamUnsubscribe) teamUnsubscribe();
            if (membersUnsubscribe) membersUnsubscribe();
        };
    
        if (userProfile?.teamId) {
          setLoadingTeam(true);
          const teamRef = doc(db, 'teams', userProfile.teamId);
          
          teamUnsubscribe = onSnapshot(teamRef, (teamDoc) => {
            if (membersUnsubscribe) membersUnsubscribe(); // Unsubscribe from old members listener

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
              });

            } else {
              setTeam(null);
              setMembers([]);
            }
            setLoadingTeam(false);
          }, (error) => {
            console.error("Error fetching team: ", error);
            setLoadingTeam(false);
          });
    
        } else if (!authLoading) {
          setTeam(null);
          setMembers([]);
          setLoadingTeam(false);
        }
    
        return cleanup;
      }, [userProfile?.teamId, authLoading]);

    if (authLoading || loadingTeam) {
        return (
            <div className="space-y-6">
                 <div className="relative">
                    <Skeleton className="h-48 md:h-64 bg-muted rounded-lg" />
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
    
    const currentUserMembership = members.find(m => m.id === userProfile?.id);

    return (
        <div className="space-y-6">
            <div className="relative">
                <div className="h-48 md:h-64 bg-muted rounded-lg overflow-hidden">
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

            {team && currentUserMembership ? <TeamDisplay team={team} members={members} currentUserRole={currentUserMembership.role} /> : <NoTeamDisplay />}
        </div>
    );
}
