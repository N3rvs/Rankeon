'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Gavel, Users, Ticket, MessageSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

export default function ModeratorPage() {
    const { claims } = useAuth();
    const isAlsoAdmin = claims?.role === 'admin';

    const managementCards = [
        {
            title: "User Management",
            description: "View, ban, and manage all users.",
            icon: Users,
            href: "/moderator/users",
        },
        {
            title: "Tournament Proposals",
            description: "Approve or reject community tournaments.",
            icon: Gavel,
            href: "/moderator/tournaments",
        },
        {
            title: "Support Tickets",
            description: "View and respond to user support requests.",
            icon: Ticket,
            href: "/moderator/tickets",
        },
         {
            title: "Chat Moderation",
            description: "Review chat logs for rule violations.",
            icon: MessageSquare,
            href: "/moderator/chats",
        }
    ];
    
    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Gavel className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="font-headline text-3xl font-bold">Moderator Panel</h1>
                    <p className="text-muted-foreground">Platform moderation tools.</p>
                </div>
            </div>
            
            {isAlsoAdmin && (
                <Card className="bg-primary/5 border-primary/20">
                     <CardHeader className="flex-row items-center gap-4">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle>Admin Access</CardTitle>
                            <CardDescription className="text-muted-foreground">
                               You are viewing this panel as an Admin. You have access to all moderation tools.
                                <Button variant="link" asChild className="p-0 h-auto ml-2"><Link href="/admin">Go to Admin Dashboard &rarr;</Link></Button>
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {managementCards.map((card) => (
                    <Card key={card.title} className="flex flex-col">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <card.icon className="h-8 w-8 text-muted-foreground" />
                             <div>
                                <CardTitle className="font-headline text-xl">{card.title}</CardTitle>
                                <CardDescription>{card.description}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow" />
                        <div className="p-6 pt-0">
                             <Button variant="outline" className="w-full" asChild>
                                <Link href={card.href}>
                                    Go to {card.title} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
