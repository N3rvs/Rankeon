
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Tournament } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/contexts/i18n-context';
import { TournamentDashboard } from '@/components/tournaments/TournamentDashboard';
import { Spinner } from '@/components/ui/spinner';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

export default function TournamentPage() {
  const params = useParams();
  const id = params.id as string;
  const { t } = useI18n();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const tournamentRef = doc(db, 'tournaments', id);
    const unsub = onSnapshot(tournamentRef, (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
      } else {
        setTournament(null);
      }
      setLoading(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: tournamentRef.path,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!tournament) {
    return <div>Tournament not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/tournaments">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('TournamentDetailsPage.back_button')}
        </Link>
      </Button>
      <TournamentDashboard tournament={tournament} />
    </div>
  );
}
