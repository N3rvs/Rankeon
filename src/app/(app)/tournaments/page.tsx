// src/app/(app)/tournaments/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { ProposeTournamentDialog } from '@/components/tournaments/propose-tournament-dialog';

export default function TournamentsPage() {
    const { userProfile } = useAuth();

    const canPropose = userProfile?.isCertifiedStreamer || userProfile?.role === 'admin' || userProfile?.role === 'moderator';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Tournaments</h1>
                    <p className="text-muted-foreground">Compete, win, and make a name for yourself.</p>
                </div>
                {canPropose && (
                     <ProposeTournamentDialog />
                )}
            </div>

            <Card className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center mt-8 col-span-full">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">No Active Tournaments</h3>
                <p className="mt-2 text-muted-foreground">
                    There are no tournaments running right now. Check back later!
                </p>
            </Card>
        </div>
    );
}
