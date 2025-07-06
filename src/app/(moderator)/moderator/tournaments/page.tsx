'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentProposalsList } from '@/components/moderator/tournament-proposals-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gavel } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from "@/contexts/i18n-context";

export default function ModeratorTournamentsPage() {
    const { t } = useI18n();
    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/moderator">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('ModPanel.back_button')}
                </Link>
            </Button>
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Gavel className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle className="font-headline text-2xl">{t('ModPanel.tournament_proposals_page_title')}</CardTitle>
                            <CardDescription>{t('ModPanel.tournament_proposals_page_desc')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <TournamentProposalsList />
                </CardContent>
            </Card>
        </div>
    )
}

    