
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Scrim } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame } from 'lucide-react';
import { CreateScrimDialog } from '@/components/scrims/create-scrim-dialog';
import { ScrimCard } from '@/components/scrims/scrim-card';

export default function ScrimsPage() {
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const [scrims, setScrims] = useState<Scrim[]>([]);
  const [loading, setLoading] = useState(true);

  const canCreate = userProfile?.teamId && (userProfile.role === 'founder' || userProfile.role === 'coach');

  useEffect(() => {
    const q = query(
      collection(db, 'scrims'),
      where('status', '==', 'pending'),
      orderBy('date', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scrim));
      setScrims(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching scrims:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">{t('ScrimsPage.title')}</h1>
          <p className="text-muted-foreground">{t('ScrimsPage.subtitle')}</p>
        </div>
        {canCreate && <CreateScrimDialog teamId={userProfile.teamId!} />}
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : scrims.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scrims.map(scrim => (
            <ScrimCard key={scrim.id} scrim={scrim} />
          ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
            <Flame className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{t('ScrimsPage.no_scrims_title')}</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                {t('ScrimsPage.no_scrims_subtitle')}
            </p>
        </div>
      )}
    </div>
  );
}
