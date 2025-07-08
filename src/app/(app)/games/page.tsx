'use client';

import { GameCard } from "@/components/games/game-card";
import { useI18n } from "@/contexts/i18n-context";

export default function GamesPage() {
    const { t } = useI18n();

    const games = [
        {
            title: "Valorant",
            imageUrl: "https://placehold.co/720x960.png",
            imageHint: "valorant game art",
            description: t('GamesPage.valorant_desc'),
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">
                    {t('GamesPage.title')}
                </h1>
                <p className="text-muted-foreground">
                    {t('GamesPage.subtitle')}
                </p>
            </div>
            <div className="flex flex-wrap gap-8">
                {games.map(game => (
                    <GameCard 
                        key={game.title}
                        title={game.title}
                        imageUrl={game.imageUrl}
                        imageHint={game.imageHint}
                        description={game.description}
                    />
                ))}
            </div>
        </div>
    );
}
