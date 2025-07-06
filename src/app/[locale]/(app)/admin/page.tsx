'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from 'next-intl/client';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, LayoutGrid, Settings, ShieldCheck, Swords, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
    const { claims, loading } = useAuth();
    const router = useRouter();

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
            title: "User Management",
            description: "View, edit, ban, and manage all users.",
            icon: Users,
            href: "/admin/users",
        },
        {
            title: "Team Management",
            description: "Oversee and delete teams if necessary.",
            icon: Swords,
            href: "/admin/teams",
        },
        {
            title: "Analytics Dashboard",
            description: "View sign-ups, revenue, and platform metrics.",
            icon: LayoutGrid,
            href: "/admin/dashboard",
        },
         {
            title: "Platform Settings",
            description: "Manage global settings and features.",
            icon: Settings,
            href: "/admin/settings",
        }
    ];
    
    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <ShieldCheck className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="font-headline text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Global control panel for SquadUp platform management.</p>
                </div>
            </div>

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
