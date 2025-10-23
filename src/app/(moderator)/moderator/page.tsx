
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Gavel, Users, Ticket, MessageSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';

export default function ModeratorPage() {
    const { t } = useI18n();
    const { claims } = useAuth();
    const isAlsoAdmin = claims?.role === 'admin';

    const managementCards = [
        {
            title: t('ModPanel.user_management_title'),
            description: t('ModPanel.user_management_desc'),
            icon: Users,
            href: "/moderator/users",
        },
        {
            title: t('ModPanel.tournament_proposals_title'),
            description: t('ModPanel.tournament_proposals_desc'),
            icon: Gavel,
            href: "/moderator/tournaments",
        },
        {
            title: t('ModPanel.support_tickets_title'),
            description: t('ModPanel.support_tickets_desc'),
            icon: Ticket,
            href: "/moderator/tickets",
        },
         {
            title: t('ModPanel.chat_moderation_title'),
            description: t('ModPanel.chat_moderation_desc'),
            icon: MessageSquare,
            href: "/moderator/chats",
        }
    ];
    
    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Gavel className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="font-headline text-3xl font-bold">{t('ModPanel.title')}</h1>
                    <p className="text-muted-foreground">{t('ModPanel.subtitle')}</p>
                </div>
            </div>
            
            {isAlsoAdmin && (
                <Card className="bg-primary/5 border-primary/20">
                     <CardHeader className="flex-row items-center gap-4">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                         <div>
                            <CardTitle>{t('ModPanel.admin_access_title')}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                               {t('ModPanel.admin_access_desc')}
                                <Button variant="link" asChild className="p-0 h-auto ml-2"><Link href="/admin">{t('ModPanel.go_to_admin_dashboard')}</Link></Button>
                            </CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {managementCards.map((card) => (
                    <Card key={card.title} className="flex flex-col">
                        <CardHeader className="flex flex-row items-start gap-4">
                            <card.icon className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                             <div className="flex-1">
                                <CardTitle className="font-headline text-xl">{card.title}</CardTitle>
                                <CardDescription>{card.description}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow" />
                        <div className="p-6 pt-0">
                             <Button variant="outline" className="w-full whitespace-normal h-auto" asChild>
                                <Link href={card.href}>
                                    {t('ModPanel.go_to_button', { title: card.title })} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
