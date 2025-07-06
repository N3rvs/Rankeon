'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart2,
  Swords,
  Edit,
  Gamepad2,
  Globe,
} from 'lucide-react';
import React from "react";
import type { UserRole } from "@/lib/types";
import { HonorsSection } from '@/components/profile/honors-section';

// Mock data since this is not in the DB
const performanceData = {
  kdRatio: 1.78,
  winRate: 62,
  headshotPercentage: 45,
};

const recentMatches = [
  {
    id: 'match1',
    result: 'Victoria',
    map: 'Ascent',
    score: '13-5',
    k: 25,
    d: 10,
    a: 8,
  },
  {
    id: 'match2',
    result: 'Derrota',
    map: 'Bind',
    score: '9-13',
    k: 18,
    d: 15,
    a: 5,
  },
  {
    id: 'match3',
    result: 'Victoria',
    map: 'Haven',
    score: '13-10',
    k: 22,
    d: 14,
    a: 12,
  },
];

const getRoleBadgeVariant = (role: UserRole): 'premium' | 'secondary' | 'moderator' => {
  if (role === 'admin') {
    return 'premium';
  }
  if (role === 'moderator') {
    return 'moderator';
  }
  return 'secondary';
};

export default function ProfilePage() {
    const { userProfile, loading } = useAuth();

    if (loading || !userProfile) {
        // Skeleton remains similar but adapted to the new layout
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Skeleton className="h-72 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Skeleton className="h-56 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    const user = userProfile;
    // Assuming a user might have a primary skill or role to display
    const primarySkill = user.skills && user.skills.length > 0 ? user.skills[0] : 'Iniciador';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                <Card>
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="male avatar" />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-bold font-headline">{user.name}</h2>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                             <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                             <Badge variant="outline" className="flex items-center gap-1.5"><Gamepad2 className="h-3 w-3" />{user.primaryGame}</Badge>
                             {user.country && <Badge variant="secondary" className="flex items-center gap-1.5"><Globe className="h-3 w-3"/>{user.country}</Badge>}
                        </div>
                        <p className="text-muted-foreground text-sm mt-4">
                            {user.bio || "I'm new to SquadUp! Ready to find a team and compete."}
                        </p>
                        <EditProfileDialog userProfile={user}>
                            <Button className="mt-6 w-full">
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Perfil
                            </Button>
                        </EditProfileDialog>
                    </CardContent>
                </Card>

                <HonorsSection targetUser={user} />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <BarChart2 className="h-5 w-5 text-primary" />
                            Análisis de Rendimiento
                        </CardTitle>
                        <CardDescription>Estadísticas de partidas recientes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground min-w-[150px]">Ratio K/D</span>
                            <Progress value={performanceData.kdRatio / 2 * 100} className="h-2" />
                            <span className="text-sm font-semibold w-12 text-right">{performanceData.kdRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="text-sm text-muted-foreground min-w-[150px]">Tasa de Victorias</span>
                             <Progress value={performanceData.winRate} className="h-2" />
                             <span className="text-sm font-semibold w-12 text-right">{performanceData.winRate}%</span>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="text-sm text-muted-foreground min-w-[150px]">% de Tiros a la Cabeza</span>
                             <Progress value={performanceData.headshotPercentage} className="h-2" />
                             <span className="text-sm font-semibold w-12 text-right">{performanceData.headshotPercentage}%</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Swords className="h-5 w-5 text-primary" />
                            Partidas Recientes
                        </CardTitle>
                        <CardDescription>Tus últimas 3 partidas competitivas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recentMatches.map((match, index) => (
                           <React.Fragment key={match.id}>
                               <div className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                   <div className={`w-1 h-10 rounded-full mr-4 ${match.result === 'Victoria' ? 'bg-primary' : 'bg-destructive'}`}></div>
                                   <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                       <div>
                                           <p className="font-semibold">{match.result}</p>
                                           <p className="text-sm text-muted-foreground">{match.map}</p>
                                       </div>
                                       <p className="font-semibold text-center">{match.score}</p>
                                       <p className="text-sm text-muted-foreground text-center">
                                           K: <span className="font-semibold text-foreground">{match.k}</span> / D: <span className="font-semibold text-foreground">{match.d}</span> / A: <span className="font-semibold text-foreground">{match.a}</span>
                                       </p>
                                       <div className="text-right">
                                            <Button variant="ghost" size="sm">Detalles</Button>
                                       </div>
                                   </div>
                               </div>
                               {index < recentMatches.length - 1 && <Separator />}
                           </React.Fragment>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
