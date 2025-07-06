// src/app/(app)/teams/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trash2, Edit, Crown, MoreVertical, ShieldCheck, UserMinus, UserCog, Gamepad2, Info, Target, Twitch, Twitter, Youtube } from 'lucide-react';
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
import Link from 'next/link';

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4464.8257-.698 1.333-2.2582.022-4.4848.022-6.7431 0-.2516-.5072-.487-1.002-.6979-1.3329a.0741.0741 0 00-.0785-.0371A19.8665 19.8665 0 003.6831 4.3698a.0741.0741 0 00-.0371.0785v.0001c.0142.1252.0221.2503.0371.3753a18.4233 18.4233 0 00-1.6256 5.8645.0741.0741 0 00.0371.0857c.3753.211.7505.3999 1.1036.5664a.0741.0741 0 00.0927-.0221c.2946-.3382.5664-.698.816-1.0805a16.4951 16.4951 0 00-2.2582-1.1258.0741.0741 0 00-.0998.0221c-.4928.698-.9272 1.4507-1.2828 2.2582a.0741.0741 0 00.0221.0998c.4699.2705.9619.493 1.4507.698a.0741.0741 0 00.0927-.0142c.7121-.5664 1.346-1.2185 1.9096-1.9334a.0741.0741 0 00.0142-.0927A17.5342 17.5342 0 006.965 9.7576a.0741.0741 0 00-.0714-.0927h-.0001a14.512 14.512 0 00-1.8025.2946.0741.0741 0 00-.0514.0785c-.0221.2868-.0371.5807-.0371.8675a10.2973 10.2973 0 00.2705 2.1501.0741.0741 0 00.0652.0585c.667.142.9341.142.9341.142l.0001-.0001a.0741.0741 0 00.0857-.0585c.0714-.2445.1359-.4961.1933-.7505a.0741.0741 0 00-.044-.0927c-.2946-.1281-.5807-.2634-.8528-.407a.0741.0741 0 00-.0927.0071c-.0714.0785-.142.157-.211.2435a.0741.0741 0 00-.0071.0927c.487.3824.9861.7347 1.4952 1.0569a.0741.0741 0 00.0927-.0071c.4216-.324.802-.6701 1.1462-1.0387a.0741.0741 0 00-.0071-.0998c-.1281-.1359-.2584-.2705-.3824-.4141a.0741.0741 0 00-.0857-.0221c-1.4286.6393-2.7368 1.0136-3.8962 1.1537a.0741.0741 0 00-.0652.0714c.0071.0371.0071.0714.0142.1132a18.0019 18.0019 0 003.0425 4.54a.0741.0741 0 00.0927.0371c.7121-.3168 1.3939-.6772 2.044-1.0637a.0741.0741 0 00.044-.0927c-.157-.211-.3075-.4216-.4464-.6464a.0741.0741 0 00-.0785-.044c-.211.0857-.4216.1642-.6321.2435a.0741.0741 0 00-.0652.0714c.1789.7944.3999 1.567.6608 2.3089a.0741.0741 0 00.0714.0652c3.4282-.142 6.5519-1.2757 8.9242-3.23a.0741.0741 0 00.044-.0785c-.1789-.882-.4628-1.742-8.887-2.4018a.0741.0741 0 00.0714.0652c.2634.0927.5268.1789.7825.2634a.0741.0741 0 00.0785-.0585c.1933-.5392.3611-1.0876.5072-1.6431a.0741.0741 0 00-.044-.0857c-1.8883-.8528-3.69-1.2828-5.3888-.9929a.0741.0741 0 00-.0514.044c-.211.7121-.4357 1.4144-.6701 2.1024a.0741.0741 0 00.0585.0857c.211.044.4216.0785.6321.1132l.0001.0001.0001.0001c.211.022.4216.044.6321.0585a.0741.0741 0 00.0714-.0652c.2435-1.002.5072-2.011.7825-3.02a.0741.0741 0 00-.0652-.0857c-.2634-.0371-.5197-.0785-.7754-.1209h-.0071c-.2634-.044-.5268-.0857-.7967-.1281a.0741.0741 0 00-.0785.0514c-.324.9479-.6171 1.8883-.8758 2.8216a.0741.0741 0 00.0785.0785c.2946-.0714.5807-.157.8599-.2435a.0741.0741 0 00.0714-.0857c.186-1.1036.4357-2.193.7347-3.2658a.0741.0741 0 00-.0714-.0857c-.0142 0-.0221 0-.0371.0071a14.7821 14.7821 0 00-4.5841.8019.0741.0741 0 00-.0585.0714c-.0371.3088-.0857.6171-.1281.9272a.0741.0741 0 00.0585.0785c1.4507.2868 2.8942.493 4.3006.5949a.0741.0741 0 00.0785-.0585c.3451-.9034.6393-1.8025.8758-2.6994a.0741.0741 0 00-.0714-.0857c-.2039-.0142-.407-.0371-.6099-.0585a15.8202 15.8202 0 01-6.721 0c-.2039.022-.407.044-.6099.0585a.0741.0741 0 00-.0714.0857c.2365.896.5307 1.7959.8758 2.6994a.0741.0741 0 00.0785.0585c1.4063-.1019 2.8499-.3081 4.3006-.5949a.0741.0741 0 00.0585-.0785c-.044-.3101-.0857-.6184-.1281-.9272a.0741.0741 0 00-.0585-.0714 14.79 14.79 0 00-4.5841-.8019.0741.0741 0 00-.0785.0927c.3009 1.0728.5505 2.1622.7347 3.2658a.0741.0741 0 00.0714.0857c.2705-.0857.5664-.1718.8599-.2435a.0741.0741 0 00.0714-.0785c.2634-1.1258.5268-2.2445.7825-3.3632a.0741.0741 0 00-.0652-.0857c-.2556-.044-.512-.0857-.7754-.1281-2.0864-.324-4.084-.9861-5.7442-1.9263a.0741.0741 0 00-.0927.0221c-.3522.477-.6902.969-.9998 1.4809a.0741.0741 0 00.0142.0998c.4557.2868.9114.5522 1.3671.7967a.0741.0741 0 00.0927-.0142c.324-.4357.6242-.8892.9034-1.3592a.0741.0741 0 00-.0221-.0998c-.2868-.186-.5807-.3611-.882-.5392a.0741.0741 0 00-.0927.0221A18.4413 18.4413 0 002.0886 10.232a.0741.0741 0 00.0371.0857c.3522.1673.7045.3168 1.0567.4464a.0741.0741 0 00.0927-.044c.2634-.4216.512-.8528.7474-1.297a.0741.0741 0 00-.044-.0927c-.4557-.211-.896-.4464-1.3219-.698a.0741.0741 0 00-.0857.0142 19.0575 19.0575 0 00-1.8025 5.0487.0741.0741 0 00.0585.0857c2.4593.816 4.8851.9929 7.2458.2946a.0741.0741 0 00.0652-.0585c.1789-.4141.3382-.8282.477-1.2565a.0741.0741 0 00-.0652-.0857c-.493-.1281-.9861-.2634-1.4738-.4141a.0741.0741 0 00-.0857.044c-.0714.157-.1359.3168-.2039.477a.0741.0741 0 00.0071.0857c.5664.4557 1.1537.8758 1.7631 1.2423a.0741.0741 0 00.0998-.0142c.407-.3088.7967-.6393 1.1683-.9861a.0741.0741 0 00.0142-.0927c-.2218-.324-.4557-.6464-.698-.969a.0741.0741 0 00-.0857-.044c-.7505.2868-1.5152.532-2.28.7474a.0741.0741 0 00-.0585.0714c-.0585.2218-.1132.4464-.1718.667a.0741.0741 0 00.0585.0785 17.5613 17.5613 0 005.1668-.3168.0741.0741 0 00.0652-.0714c.1209-.3753.2365-.7505.3382-1.1258a.0741.0741 0 00-.0585-.0857c-.5735-.157-1.1537-.3075-1.722-.477a.0741.0741 0 00-.0857.044c-.1642.3611-.3382.722-.5197 1.0876a.0741.0741 0 00.0371.0927c.4357.2516.8758.493 1.3219.7051a.0741.0741 0 00.0927-.0221c1.4507-1.1908 2.3724-2.651 2.5714-4.2155a.0741.0741 0 00-.0371-.0785A19.921 19.921 0 0012.0002 2.8698z"/></svg>
);

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
        founder: <Crown className="h-4 w-4 text-amber-400" />,
        coach: <ShieldCheck className="h-4 w-4 text-blue-400" />,
    };

    const safeVideoUrl = team.videoUrl ? team.videoUrl.replace("watch?v=", "embed/") : '';

    return (
        <div className="space-y-6">
            <EditTeamDialog team={team} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
            
            <div className="relative">
                <div className="h-48 md:h-64 bg-muted rounded-lg overflow-hidden">
                    <Image
                        src={team.bannerUrl || 'https://placehold.co/1200x480.png'}
                        alt={`${team.name} banner`}
                        fill
                        className="object-cover"
                        data-ai-hint="team banner"
                    />
                </div>
                <div className="absolute top-full -translate-y-1/2 left-6 md:left-8 z-10">
                    <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background bg-card">
                        <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
                        <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                </div>
            </div>

            <div className="pt-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-3xl lg:text-4xl font-headline">{team.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 pt-1">
                                            <Gamepad2 className="h-4 w-4" />
                                            <span>Jugando {team.game}</span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive-outline" size="sm">
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
                                        <Button onClick={() => setIsEditDialogOpen(true)} size="sm">
                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                        </Button>
                                    </div>
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
                                                </div>
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
                        {team.videoUrl && (
                            <Card className="overflow-hidden p-0">
                                <CardContent className="p-0">
                                    <div className="aspect-video bg-muted">
                                        <iframe className="w-full h-full" src={safeVideoUrl} title="Vídeo de Presentación del Equipo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Conecta</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {team.discordUrl && <Button variant="outline" asChild className="w-full justify-start"><Link href={team.discordUrl} target="_blank"><DiscordIcon className="h-4 w-4 mr-2" /> Discord</Link></Button>}
                                {team.twitchUrl && <Button variant="outline" asChild className="w-full justify-start"><Link href={team.twitchUrl} target="_blank"><Twitch className="h-4 w-4 mr-2" /> Twitch</Link></Button>}
                                {team.twitterUrl && <Button variant="outline" asChild className="w-full justify-start"><Link href={team.twitterUrl} target="_blank"><Twitter className="h-4 w-4 mr-2" /> Twitter / X</Link></Button>}
                                {team.videoUrl && <Button variant="outline" asChild className="w-full justify-start"><Link href={team.videoUrl} target="_blank"><Youtube className="h-4 w-4 mr-2" /> YouTube</Link></Button>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
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
