'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Scrim } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { format } from 'date-fns';
import Link from 'next/link';

function UpcomingScrimsCard({ teamId }: { teamId: string }) {
    const { t } = useI18n();
    const [scrims, setScrims] = useState<Scrim[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q1 = query(collection(db, 'scrims'), where('teamAId', '==', teamId), where('status', '==', 'confirmed'));
        const q2 = query(collection(db, 'scrims'), where('teamBId', '==', teamId), where('status', '==', 'confirmed'));

        let scrimsA: Scrim[] = [];
        let scrimsB: Scrim[] = [];
        let combinedInitial = false;

        const combineAndSet = () => {
            const allScrims = [...scrimsA, ...scrimsB];
            const uniqueScrims = Array.from(new Map(allScrims.map(item => [item.id, item])).values());
            const sorted = uniqueScrims.sort((a, b) => a.date.toMillis() - b.date.toMillis());
            setScrims(sorted);
            if(combinedInitial) setLoading(false);
        };
        
        const unsub1 = onSnapshot(q1, (snap) => { 
            scrimsA = snap.docs.map(doc => ({id: doc.id, ...doc.data()}) as Scrim); 
            combineAndSet(); 
        });
        const unsub2 = onSnapshot(q2, (snap) => { 
            scrimsB = snap.docs.map(doc => ({id: doc.id, ...doc.data()}) as Scrim); 
            combineAndSet(); 
        });

        // A small delay to ensure both snapshots can arrive
        setTimeout(() => {
            combinedInitial = true;
            if (loading) {
                combineAndSet();
            }
        }, 1500);


        return () => {
            unsub1();
            unsub2();
        }
    }, [teamId]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Calendar className="h-5 w-5" />{t('TeamsPage.upcoming_matches')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <Skeleton className="h-12 w-full" />
                ) : scrims.length > 0 ? (
                    scrims.map(scrim => {
                        const isTeamA = scrim.teamAId === teamId;
                        const opponent = isTeamA ? 
                            { name: scrim.teamBName, id: scrim.teamBId } : 
                            { name: scrim.teamAName, id: scrim.teamAId };
                        
                        return (
                             <Link href={`/scrims`} key={scrim.id} className="block p-3 rounded-md hover:bg-muted">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Swords className="h-4 w-4 text-muted-foreground"/>
                                        <p className="font-semibold text-sm">vs {opponent.name}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{format(scrim.date.toDate(), "d MMM, HH:mm")}</p>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No upcoming matches scheduled.</p>
                )}
            </CardContent>
        </Card>
    );
}

export { UpcomingScrimsCard };
