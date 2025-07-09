// src/components/teams/team-applications.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { TeamApplication } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { respondToTeamApplication } from '@/lib/actions/teams';
import { Spinner } from '../ui/spinner';

function ApplicationCard({ application }: { application: TeamApplication }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleResponse = (accept: boolean) => {
        startTransition(async () => {
            const result = await respondToTeamApplication({
                applicationId: application.id,
                accept: accept,
            });

            if (result.success) {
                toast({
                    title: `Application ${accept ? 'Accepted' : 'Declined'}`,
                    description: `${application.applicantName} has been ${accept ? 'added to the team' : 'notified'}.`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        });
    }

    return (
        <div className="flex items-center justify-between">
            <Link href={`/users/${application.applicantId}`} className="flex items-center gap-3 group flex-1">
                <Avatar>
                    <AvatarImage src={application.applicantAvatarUrl} data-ai-hint="person avatar" />
                    <AvatarFallback>{application.applicantName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                    <span className="font-semibold text-sm group-hover:underline">{application.applicantName}</span>
                    <p className="text-xs text-muted-foreground">{application.message || "I'd like to join your team!"}</p>
                </div>
            </Link>
            <div className="flex gap-2 ml-4">
                 <Button size="sm" onClick={() => handleResponse(true)} disabled={isPending}>
                    <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleResponse(false)} disabled={isPending}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}


export function TeamApplications({ teamId }: { teamId: string }) {
    const [applications, setApplications] = useState<TeamApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'teamApplications'),
            where('teamId', '==', teamId),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamApplication));
            setApplications(apps);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching applications: ", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [teamId]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="h-24 flex items-center justify-center">
                   <Spinner />
                </CardContent>
            </Card>
        );
    }
    
    if (applications.length === 0) {
        return null; // Don't show the card if there are no applications
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <UserPlus className="h-5 w-5" /> Solicitudes de Ingreso ({applications.length})
                </CardTitle>
                <CardDescription>
                    Revisa a los jugadores que quieren unirse a tu equipo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {applications.map(app => (
                    <ApplicationCard key={app.id} application={app} />
                ))}
            </CardContent>
        </Card>
    )
}
