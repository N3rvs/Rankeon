// src/components/teams/team-scrim-stats-card.tsx
'use client';

import type { Team } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

interface TeamScrimStatsCardProps {
  team: Team;
}

export function TeamScrimStatsCard({ team }: TeamScrimStatsCardProps) {
  const { t } = useI18n();

  const played = team.stats?.scrimsPlayed ?? 0;
  const won = team.stats?.scrimsWon ?? 0;
  const lost = played - won;
  const winRate = played > 0 ? ((won / played) * 100).toFixed(1) : "0.0";

  return (
    <div>
        <h4 className="text-sm font-semibold mb-2">{t('TeamsPage.scrim_record_title')}</h4>
        {played > 0 ? (
             <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-md bg-muted/50">
                <div>
                    <p className="text-xs text-muted-foreground">Jugados</p>
                    <p className="font-bold text-lg">{played}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Ganados</p>
                    <p className="font-bold text-lg text-green-500">{won}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">V/D %</p>
                    <p className="font-bold text-lg">{winRate}%</p>
                </div>
            </div>
        ) : (
            <p className="text-xs text-muted-foreground text-center py-2">{t('TeamsPage.scrim_record_soon')}</p>
        )}
    </div>
  );
}
