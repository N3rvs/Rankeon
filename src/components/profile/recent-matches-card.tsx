
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/i18n-context";

const recentMatches = [
  { status: 'Victoria', map: 'Ascent', score: '13-5', k: 25, d: 10, a: 8 },
  { status: 'Derrota', map: 'Bind', score: '9-13', k: 18, d: 15, a: 5 },
  { status: 'Victoria', map: 'Haven', score: '13-10', k: 22, d: 14, a: 12 },
];

export function RecentMatchesCard() {
    const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Swords className="h-5 w-5" />
          {t('ProfilePage.recent_matches')}
        </CardTitle>
        <CardDescription>{t('ProfilePage.last_matches_desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMatches.map((match, index) => (
          <div key={index} 
            className={cn(
                "flex items-center gap-4 p-3 rounded-lg border-l-4",
                match.status === 'Victoria' ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'
            )}>
            <div className="flex-1">
              <p className={cn(
                  "font-semibold",
                  match.status === 'Victoria' ? 'text-primary' : 'text-destructive'
              )}>{match.status === 'Victoria' ? t('ProfilePage.victory') : t('ProfilePage.defeat')}</p>
              <p className="text-sm text-muted-foreground">{match.map}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{match.score}</p>
            </div>
            <div className="hidden sm:block text-sm text-muted-foreground">
              K: <span className="font-medium text-foreground">{match.k}</span> D: <span className="font-medium text-foreground">{match.d}</span> A: <span className="font-medium text-foreground">{match.a}</span>
            </div>
            <Button variant="ghost" size="sm">{t('ProfilePage.details')}</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
