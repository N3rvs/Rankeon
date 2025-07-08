'use client';

import { GameCard } from "@/components/games/game-card";
import { useI18n } from "@/contexts/i18n-context";

export default function GamesPage() {
    const { t } = useI18n();

    const games = [
        {
            title: "Valorant",
            imageUrl: "https://cdn1.epicgames.com/offer/cbd5b3d310a54b12bf3fe8c41994174f/EGS_VALORANT_RiotGames_S2_1200x1600-e4f9165ef5ef86fc591575bdec066bb6",
            imageHint: "valorant game art",
            description: t('GamesPage.valorant_desc'),
        },
        {
            title: "League of Legends (proximamente)",
            imageUrl: "https://cdn1.epicgames.com/offer/24b9b5e323bc40eea252a10cdd3b2f10/EGS_LeagueofLegends_RiotGames_S2_1200x1600-905a96cea329205358868f5871393042",
            imageHint: "LeagoeOfLegends game art",
            description: t('GamesPage.league_of_legends_desc'),
        },
        // {
        //     title: "Csgo2 (proximamente)",
        //     imageUrl: "https://static.wikia.nocookie.net/cswikia/images/3/37/Cs2_boxart.jpg/revision/latest?cb=20230930151452",
        //     imageHint: "Csgo2 game art",
        //     description: t('GamesPage.valorant_desc'),
        // }
    ];

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">
                        {t('GamesPage.title')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('GamesPage.subtitle')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-8 justify-center">
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
        </div>
    );
}
