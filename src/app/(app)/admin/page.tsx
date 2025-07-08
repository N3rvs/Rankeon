
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, LayoutGrid, Settings, ShieldCheck, Swords, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/i18n-context';

export default function AdminPage() {
    const { claims, loading } = useAuth();
    const router = useRouter();
    const { t } = useI18n();

    const isAdmin = claims?.role === 'admin';

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.replace('/dashboard');
        }
    }, [isAdmin, loading, router]);

    if (loading || !isAdmin) {
        return (
             <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8" />
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    const managementCards = [
        {
            title: t('AdminPanel.user_management_title'),
            description: t('AdminPanel.user_management_desc'),
            icon: Users,
            href: "/admin/users",
        },
        {
            title: t('AdminPanel.team_management_title'),
            description: t('AdminPanel.team_management_desc'),
            icon: Swords,
            href: "/admin/teams",
        },
        {
            title: t('AdminPanel.analytics_dashboard_title'),
            description: t('AdminPanel.analytics_dashboard_desc'),
            icon: LayoutGrid,
            href: "/admin/dashboard",
        },
         {
            title: t('AdminPanel.platform_settings_title'),
            description: t('AdminPanel.platform_settings_desc'),
            icon: Settings,
            href: "/admin/settings",
        }
    ];
    
    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <ShieldCheck className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="font-headline text-3xl font-bold">{t('AdminPanel.title')}</h1>
                    <p className="text-muted-foreground">{t('AdminPanel.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                             <Button variant="outline" className="w-full" asChild>
                                <Link href={card.href}>
                                    {t('AdminPanel.go_to_button', { title: card.title })} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
