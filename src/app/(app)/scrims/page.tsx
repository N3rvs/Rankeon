// src/app/(app)/scrims/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Scrim, Team, TeamMember } from '@/lib/types';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateScrimDialog } from '@/components/scrims/create-scrim-dialog';
import { ScrimCard } from '@/components/scrims/scrim-card';
import { Swords } from 'lucide-react';

export default function ScrimsPage() {
    const { user } = useAuth();
    const [scrims, setScrims] = useState<Scrim[]>([]);
    const [userStaffTeams, setUserStaffTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    const canCreateScrim = userStaffTeams.length > 0;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch teams where user is staff
        const fetchUserTeams = async () => {
            const teamsQuery = query(collection(db, 'teams'), where('memberIds', 'array-contains', user.uid));
            const teamsSnapshot = await getDocs(teamsQuery);
            const teamsData = teamsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
            
            const staffTeams: Team[] = [];
            for (const team of teamsData) {
                const memberDoc = await getDoc(doc(db, `teams/${team.id}/members/${user.uid}`));
                if (memberDoc.exists()) {
                    const memberData = memberDoc.data() as TeamMember;
                    if (['founder', 'coach', 'admin'].includes(memberData.role)) {
                        staffTeams.push(team);
                    }
                }
            }
            setUserStaffTeams(staffTeams);
        };

        fetchUserTeams();
    }, [user]);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, 'scrims'),
            where('status', '==', 'pending'),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const scrimsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim));
            setScrims(scrimsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching scrims: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loadingSkeletons = [...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-52 w-full rounded-lg" />
    ));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Scrims & Tryouts</h1>
                    <p className="text-muted-foreground">Find a practice match or post one for your team.</p>
                </div>
                {canCreateScrim && <CreateScrimDialog userStaffTeams={userStaffTeams} />}
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loadingSkeletons}
                </div>
            ) : scrims.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {scrims.map((scrim) => (
                        <ScrimCard key={scrim.id} scrim={scrim} userStaffTeams={userStaffTeams} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center mt-8 col-span-full">
                    <Swords className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Pending Scrims</h3>
                    <p className="mt-2 text-muted-foreground">
                       There are no available scrims right now. Why not create one?
                    </p>
                </div>
            )}
        </div>
    );
}