
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile, UserRole } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    BarChart2,
    Gamepad2,
    Swords,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FriendshipButton } from '@/components/friends/friendship-button';
import { useAuth } from '@/contexts/auth-context';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { HonorsSection } from '@/components/profile/honors-section';
import { TeamInfoCard } from '@/components/profile/team-info-card';
import Link from 'next/link';
import { getFlagEmoji } from '@/lib/utils';

// Mock data as this is not in the DB
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

const getRoleBadgeVariant = (role: UserRole): 'premium' | 'secondary' | 'moderator' | 'founder' | 'coach' => {
  switch (role) {
    case 'admin':
      return 'premium';
    case 'moderator':
      return 'moderator';
    case 'founder':
      return 'founder';
    case 'coach':
      return 'coach';
    default:
      return 'secondary';
  }
};


export default function UserProfilePage() {
  const { userId } = useParams() as { userId: string };
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isOwnProfile = currentUser?.uid === userId;
  
  useEffect(() => {
    if (isOwnProfile) {
        router.replace('/profile');
        return;
    }

    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    getDoc(userRef).then(docSnap => {
        if (docSnap.exists()) {
          setUser({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          setUser(null);
          toast({
            title: 'Error',
            description: 'User not found.',
            variant: 'destructive',
          });
          router.push('/dashboard');
        }
        setLoading(false);
    }).catch(error => {
        console.error('Error fetching user profile:', error);
        setLoading(false);
    });

  }, [userId, router, toast, isOwnProfile]);

  if (loading || isOwnProfile) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 flex flex-col gap-6">
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-6">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  if (!user) {
    return null; // Redirect is handled in effect
  }
  
  return (
    <div className="space-y-6">
        <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Link>
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                <Card>
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-bold font-headline">{user.name}</h2>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                             <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                             <Badge variant="outline" className="flex items-center gap-1.5"><Gamepad2 className="h-3 w-3" />{user.primaryGame}</Badge>
                             {user.country && <Badge variant="secondary">{getFlagEmoji(user.country)} {user.country}</Badge>}
                        </div>
                        {user.skills && user.skills.length > 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                {user.skills.map((skill) => (
                                    <Badge key={skill} variant="outline">{skill}</Badge>
                                ))}
                            </div>
                        )}
                        <p className="text-muted-foreground text-sm mt-4">
                            {user.bio || "I'm new to SquadUp! Ready to find a team and compete."}
                        </p>
                        <div className="mt-6 w-full">
                            <FriendshipButton targetUser={user} />
                        </div>
                    </CardContent>
                </Card>

                {user.teamId && <TeamInfoCard teamId={user.teamId} />}

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
                        <CardDescription>Las últimas 3 partidas competitivas del usuario</CardDescription>
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
    </div>
  )
}
