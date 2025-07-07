
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Scrim } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

export function ScrimRankings() {
    const { t } = useI18n();
    const [scrims, setScrims] = useState<Scrim[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'scrims'), where('status', '==', 'completed'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const scrimsData = snapshot.docs.map(doc => doc.data() as Scrim);
            setScrims(scrimsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching scrims:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[300px]">
            <Flame className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{t('RankingsPage.no_scrims_title')}</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                {t('RankingsPage.no_scrims_desc')}
            </p>
        </div>
    );
}
