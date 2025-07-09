// src/components/teams/upcoming-scrims-card.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Scrim } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { format } from 'date-fns';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '../ui/spinner';

function UpcomingScrimsCard({ teamId }: { teamId: string }) {
    const { t } = useI18n();
    const [scrimsAsA, setScrimsAsA] = useState<Scrim[]>([]);
    const [scrimsAsB, setScrimsAsB] = useState<Scrim[]>([]);
    const [loadingA, setLoadingA] = useState(true);
    const [loadingB, setLoadingB] = useState(true);

    useEffect(() => {
        setLoadingA(true);
        const q = query(collection(db, 'scrims'), where('teamAId', '==', teamId), where('status', '==', 'confirmed'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setScrimsAsA(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim)));
            setLoadingA(false);
        }, () => setLoadingA(false));
        return () => unsubscribe();
    }, [teamId]);

    useEffect(() => {
        setLoadingB(true);
        const q = query(collection(db, 'scrims'), where('teamBId', '==', teamId), where('status', '==', 'confirmed'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setScrimsAsB(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim)));
            setLoadingB(false);
        }, () => setLoadingB(false));
        return () => unsubscribe();
    }, [teamId]);

    const scrims = useMemo(() => {
        const allScrims = [...scrimsAsA, ...scrimsAsB];
        const uniqueScrims = Array.from(new Map(allScrims.map(item => [item.id, item])).values());
        return uniqueScrims.sort((a, b) => a.date.toMillis() - b.date.toMillis());
    }, [scrimsAsA, scrimsAsB]);

    const loading = loadingA || loadingB;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Calendar className="h-5 w-5" />{t('TeamsPage.upcoming_matches')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="h-24 flex items-center justify-center">
                        <Spinner />
                    </div>
                ) : scrims.length > 0 ? (
                    scrims.map(scrim => (
                         <Link href={`/scrims`} key={scrim.id} className="block p-3 rounded-md hover:bg-muted border">
                            <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                                <span>{format(scrim.date.toDate(), "d MMM, HH:mm")}</span>
                                <Badge variant="outline" className="capitalize">{scrim.format.toUpperCase()}</Badge>
                            </div>
                            <div className="flex justify-around items-center">
                                <div className="flex flex-col items-center gap-1 text-center w-24">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={scrim.teamAAvatarUrl} data-ai-hint="team logo" />
                                        <AvatarFallback>{scrim.teamAName.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-semibold text-xs truncate w-full">{scrim.teamAName}</p>
                                </div>
                                <Swords className="h-4 w-4 text-muted-foreground shrink-0 mx-2" />
                                <div className="flex flex-col items-center gap-1 text-center w-24">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={scrim.teamBAvatarUrl} data-ai-hint="team logo" />
                                        <AvatarFallback>{scrim.teamBName?.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-semibold text-xs truncate w-full">
                                        {scrim.teamBName}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No upcoming matches scheduled.</p>
                )}
            </CardContent>
        </Card>
    );
}

export { UpcomingScrimsCard };
