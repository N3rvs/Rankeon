'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Team } from '@/lib/types';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { TeamCard } from '@/components/teams/team-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

export default function TeamsPage() {
    const { user, userProfile } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    const canCreateTeam = userProfile && ['admin', 'moderator', 'founder'].includes(userProfile.role);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'teams'),
            where('memberIds', 'array-contains', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as Team));
            setTeams(teamsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching teams: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const loadingSkeletons = [...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-[350px] w-full rounded-lg" />
    ));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">My Teams</h1>
                    <p className="text-muted-foreground">Manage your teams or create a new one.</p>
                </div>
                {canCreateTeam && <CreateTeamDialog />}
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loadingSkeletons}
                </div>
            ) : teams.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                        <TeamCard key={team.id} team={team} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center mt-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Teams Found</h3>
                    <p className="mt-2 text-muted-foreground">
                        You are not a member of any team yet.
                        {canCreateTeam ? " Why not create one from the button above?" : ""}
                    </p>
                </div>
            )}
        </div>
    );
}
