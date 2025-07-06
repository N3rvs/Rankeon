// src/app/(app)/teams/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trash2, Edit, Crown, MoreVertical, ShieldCheck, UserMinus, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition } from 'react';
import { collection, query, where, onSnapshot, Unsubscribe, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, TeamMember } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam, kickTeamMember, updateTeamMemberRole } from '@/lib/actions/teams';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditTeamDialog } from '@/components/teams/edit-team-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function MemberManager({ team, member, currentUserRole }: { team: Team, member: TeamMember, currentUserRole: 'founder' | 'coach' | 'member' }) {
    const { toast } = useToast();
    const [isKickAlertOpen, setKickAlertOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

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

    const canManageRoles = currentUserRole === 'founder' || currentUserRole === 'coach';
    const canKick = currentUserRole === 'founder';

    if (member.role === 'founder' || (!canManageRoles && !canKick)) {
        return null;
    }

    return (
        <>
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
        founder: <Crown className="h-5 w-5 text-amber-400" />,
        coach: <ShieldCheck className="h-5 w-5 text-blue-400" />,
    }

    return (
        <div className="space-y-6">
            <EditTeamDialog team={team} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
             <Card>
                <CardHeader className="p-0">
                    <div className="relative h-56 w-full">
                        <Image
                        src={team.bannerUrl || 'https://placehold.co/1200x400.png'}
                        alt={`${team.name} banner`}
                        fill
                        className="object-cover rounded-t-lg"
                        data-ai-hint="team banner"
                        />
                        <div className="absolute bottom-0 left-6 translate-y-1/2">
                        <Avatar className="h-32 w-32 border-4 border-background bg-card">
                            <AvatarImage
                            src={team.avatarUrl}
                            alt={team.name}
                            data-ai-hint="team logo"
                            />
                            <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        </div>
                    </div>
                    <div className="pt-20 px-6 pb-4 flex justify-between items-start">
                        <div>
                            <CardTitle className="text-3xl font-headline">{team.name}</CardTitle>
                            <CardDescription>{team.description || "No hay descripción para este equipo."}</CardDescription>
                        </div>
                        <Badge variant={team.lookingForPlayers ? 'default' : 'secondary'}>
                            {team.lookingForPlayers ? 'Reclutando' : 'Equipo Lleno'}
                        </Badge>
                    </div>
                </CardHeader>
                
                <CardFooter className="border-t pt-6 flex justify-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive-outline">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Equipo
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
                    <Button onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Equipo
                    </Button>
                </CardFooter>
            </Card>

            {team.videoUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Vídeo de Presentación</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <iframe
                                className="w-full h-full"
                                src={team.videoUrl.replace("watch?v=", "embed/")} // Basic conversion for YouTube links
                                title="Team Presentation Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline text-2xl">Miembros del Equipo ({members.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {members.map(member => (
                         <div key={member.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={member.avatarUrl} data-ai-hint="person avatar" />
                                    <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-2">
                                     <span className="font-medium">{member.name}</span>
                                     {roleIcons[member.role] || null}
                                </div>
                            </div>
                           <MemberManager team={team} member={member} currentUserRole={currentUserRole} />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}


function NoTeamDisplay() {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-full">
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
    
        if (userProfile?.id) {
          setLoadingTeam(true);
          const q = query(collection(db, 'teams'), where('memberIds', 'array-contains', userProfile.id));
          
          teamUnsubscribe = onSnapshot(q, (querySnapshot) => {
            if (membersUnsubscribe) membersUnsubscribe(); // Unsubscribe from old members listener

            if (!querySnapshot.empty) {
              const teamData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Team;
              setTeam(teamData);

              const membersQuery = query(collection(db, `teams/${teamData.id}/members`));
              membersUnsubscribe = onSnapshot(membersQuery, async (membersSnapshot) => {
                  const memberDocs = await Promise.all(membersSnapshot.docs.map(async docSnap => {
                      const memberData = docSnap.data();
                      const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', docSnap.id)));
                      if (!userDoc.empty) {
                          const userData = userDoc.docs[0].data();
                          return {
                              id: docSnap.id,
                              role: memberData.role,
                              joinedAt: memberData.joinedAt,
                              name: userData.name,
                              avatarUrl: userData.avatarUrl,
                          } as TeamMember
                      }
                      return null;
                  }));
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
          setLoadingTeam(false);
        }
    
        return cleanup;
      }, [userProfile?.id, authLoading]);

    if (authLoading || loadingTeam) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                </div>
                <Card>
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                    <CardHeader className="pt-16">
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-80" />
                    </CardHeader>
                    <CardFooter>
                         <Skeleton className="h-10 w-32 ml-auto" />
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                         <Skeleton className="h-8 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const currentUserMembership = members.find(m => m.id === userProfile?.id);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Mi Equipo</h1>
                <p className="text-muted-foreground">
                    Gestiona tu equipo o crea uno nuevo para competir.
                </p>
            </div>
            {team && currentUserMembership ? <TeamDisplay team={team} members={members} currentUserRole={currentUserMembership.role} /> : <NoTeamDisplay />}
        </div>
    );
}
