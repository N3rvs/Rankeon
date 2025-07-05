
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ticket, Construction } from 'lucide-react';
import Link from 'next/link';
import { ModeratorGuard } from '@/components/auth/moderator-guard';

export default function ModeratorTicketsPage() {
    return (
        <ModeratorGuard>
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
                            <Ticket className="h-6 w-6 text-primary" />
                             <div>
                                <CardTitle className="font-headline text-2xl">Support Tickets</CardTitle>
                                <CardDescription>Manage user support requests.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-[300px]">
                            <Construction className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-xl font-semibold">Under Construction</h3>
                            <p className="mt-2 text-muted-foreground">
                               The support ticket system is coming soon.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ModeratorGuard>
    )
}
