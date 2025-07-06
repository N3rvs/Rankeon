'use client';

import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Trophy } from 'lucide-react';

export default function TournamentsPage() {
  const { claims } = useAuth();
  const canPropose =
    claims?.role === 'admin' ||
    claims?.role === 'moderator' ||
    claims?.isCertifiedStreamer === true;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Torneos
          </h1>
          <p className="text-muted-foreground">
            Compite por la gloria y los premios.
          </p>
        </div>
        {canPropose && <ProposeTournamentDialog />}
      </div>
       <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
        <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No hay torneos activos</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Vuelve más tarde para ver los próximos eventos.
        </p>
      </div>
    </div>
  );
}
