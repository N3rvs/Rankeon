'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, TeamMember } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Users, ArrowLeft, Globe, Target, Info, BrainCircuit, UserPlus, Crown, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { applyToTeam } from '@/lib/actions/teams';
import { useToast } from '@/hooks/use-toast';

export default function TeamProfilePage() {
    const params = useParams();
    const id = params.id as string;
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isApplying, startApplying] = useTransition();

    useEffect(() => {
        if (!id) return;

        setLoading(true);
        let teamUnsubscribe: Unsubscribe | undefined;
        let membersUnsubscribe: Unsubscribe | undefined;

        teamUnsubscribe = onSnapshot(doc(db, 'teams', id), (teamDoc) => {
            if (teamDoc.exists()) {
                const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
                setTeam(teamData);

                const membersQuery = query(collection(db, 'teams', id, 'members'));
                membersUnsubscribe = onSnapshot(membersQuery, async (membersSnapshot) => {
                    const memberPromises = membersSnapshot.docs.map(async (memberDoc) => {
                        const userDocSnap = await getDoc(doc(db, 'users', memberDoc.id));
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            return {
                                id: memberDoc.id,
                                role: memberDoc.data().role,
                                isIGL: memberDoc.data().isIGL || false,
                                name: userData.name,
                                avatarUrl: userData.avatarUrl,
                            } as TeamMember;
                        }
                        return null;
                    });
                    const memberDocs = (await Promise.all(memberPromises)).filter(Boolean) as TeamMember[];
                    setMembers(memberDocs);
                    setLoading(false);
                });
            } else {
                setTeam(null);
                setLoading(false);
            }
        });

        return () => {
            teamUnsubscribe?.();
            membersUnsubscribe?.();
        };
    }, [id]);

    const handleApply = () => {
        if (!team) return;
        startApplying(async () => {
            const result = await applyToTeam(team.id);
            if (result.success) {
                toast({ title: "Solicitud Enviada", description: "Tu solicitud para unirte al equipo ha sido enviada." });
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    const canApply = userProfile && !userProfile.teamId && team?.lookingForPlayers;
    const roleIcons: { [key: string]: React.ReactNode } = {
        founder: <Crown className="h-4 w-4 text-amber-400" />,
        coach: <ShieldCheck className="h-4 w-4 text-blue-400" />,
    };


    if (loading || authLoading) {
        return (
            <div className="space-y-6">
                 <Skeleton className="h-10 w-48" />
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
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Equipo no encontrado</h2>
                <p className="text-muted-foreground">El equipo que buscas no existe o ha sido eliminado.</p>
                <Button asChild className="mt-4">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Mercado
                    </Link>
                </Button>
            </div>
        );
    }
    
    const isMyTeam = userProfile?.teamId === team.id;

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al Mercado</Link>
            </Button>
            
            <div className="relative -mx-4 md:-mx-6">
                <div className="h-48 md:h-64 bg-muted overflow-hidden">
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
                        <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo"/>
                        <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                </div>
            </div>

            <div className="pt-14 md:pt-8" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                         <CardHeader>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-3xl lg:text-4xl font-headline">{team.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-4 pt-1">
                                        <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" />Jugando {team.game}</span>
                                        {team.country && <span className="flex items-center gap-2"><Globe className="h-4 w-4" />{team.country}</span>}
                                    </CardDescription>
                                </div>
                                {canApply && !isMyTeam && (
                                     <Button onClick={handleApply} disabled={isApplying}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        {isApplying ? 'Enviando...' : 'Aplicar para Unirse'}
                                    </Button>
                                )}
                                {isMyTeam && (
                                    <Button asChild>
                                        <Link href="/teams">
                                            Gestionar Equipo
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h3 className="font-headline font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5" /> Sobre el Equipo</h3>
                            <p className="text-muted-foreground text-sm">{team.description || 'No se ha proporcionado una descripción.'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5" /> Miembros del Equipo ({members.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {members.map(member => (
                                <Link href={`/users/${member.id}`} key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50">
                                    <Avatar>
                                        <AvatarImage src={member.avatarUrl} data-ai-hint="person avatar" />
                                        <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{member.name}</p>
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
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                 <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Target className="h-5 w-5" /> Estado de Reclutamiento</CardTitle></CardHeader>
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
