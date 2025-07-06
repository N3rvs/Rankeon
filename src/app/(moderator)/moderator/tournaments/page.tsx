'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentProposalsList } from '@/components/moderator/tournament-proposals-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gavel } from 'lucide-react';
import Link from 'next/link';

export default function ModeratorTournamentsPage() {
    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/moderator">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Moderator Panel
                </Link>
            </Button>
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Gavel className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle className="font-headline text-2xl">Tournament Proposals</CardTitle>
                            <CardDescription>Approve or reject community-submitted tournaments.</CardDescription>
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
