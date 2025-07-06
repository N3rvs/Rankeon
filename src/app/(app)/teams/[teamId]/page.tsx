
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { Team, UserProfile } from '@/lib/types';
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
  Users,
  Gamepad2,
  Globe,
  Twitch,
  Twitter,
  Youtube,
  Info,
  Target,
  UserPlus,
  Crown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4464.8257-.698 1.333-2.2582.022-4.4848.022-6.7431 0-.2516-.5072-.487-1.002-.6979-1.3329a.0741.0741 0 00-.0785-.0371A19.8665 19.8665 0 003.6831 4.3698a.0741.0741 0 00-.0371.0785v.0001c.0142.1252.0221.2503.0371.3753a18.4233 18.4233 0 00-1.6256 5.8645.0741.0741 0 00.0371.0857c.3753.211.7505.3999 1.1036.5664a.0741.0741 0 00.0927-.0221c.2946-.3382.5664-.698.816-1.0805a16.4951 16.4951 0 00-2.2582-1.1258.0741.0741 0 00-.0998.0221c-.4928.698-.9272 1.4507-1.2828 2.2582a.0741.0741 0 00.0221.0998c.4699.2705.9619.493 1.4507.698a.0741.0741 0 00.0927-.0142c.7121-.5664 1.346-1.2185 1.9096-1.9334a.0741.0741 0 00.0142-.0927A17.5342 17.5342 0 006.965 9.7576a.0741.0741 0 00-.0714-.0927h-.0001a14.512 14.512 0 00-1.8025.2946.0741.0741 0 00-.0514.0785c-.0221.2868-.0371.5807-.0371.8675a10.2973 10.2973 0 00.2705 2.1501.0741.0741 0 00.0652.0585c.667.142.9341.142.9341.142l.0001-.0001a.0741.0741 0 00.0857-.0585c.0714-.2445.1359-.4961.1933-.7505a.0741.0741 0 00-.044-.0927c-.2946-.1281-.5807-.2634-.8528-.407a.0741.0741 0 00-.0927.0071c-.0714.0785-.142.157-.211.2435a.0741.0741 0 00-.0071.0927c.487.3824.9861.7347 1.4952 1.0569a.0741.0741 0 00.0927-.0071c.4216-.324.802-.6701 1.1462-1.0387a.0741.0741 0 00-.0071-.0998c-.1281-.1359-.2584-.2705-.3824-.4141a.0741.0741 0 00-.0857-.0221c-1.4286.6393-2.7368 1.0136-3.8962 1.1537a.0741.0741 0 00-.0652.0714c.0071.0371.0071.0714.0142.1132a18.0019 18.0019 0 003.0425 4.54a.0741.0741 0 00.0927.0371c.7121-.3168 1.3939-.6772 2.044-1.0637a.0741.0741 0 00.044-.0927c-.157-.211-.3075-.4216-.4464-.6464a.0741.0741 0 00-.0785-.044c-.211.0857-.4216.1642-.6321.2435a.0741.0741 0 00-.0652.0714c.1789.7944.3999 1.567.6608 2.3089a.0741.0741 0 00.0714.0652c3.4282-.142 6.5519-1.2757 8.9242-3.23a.0741.0741 0 00.044-.0785c-.1789-.882-.4628-1.742-8.887-2.4018a.0741.0741 0 00.0714.0652c.2634.0927.5268.1789.7825.2634a.0741.0741 0 00.0785-.0585c.1933-.5392.3611-1.0876.5072-1.6431a.0741.0741 0 00-.044-.0857c-1.8883-.8528-3.69-1.2828-5.3888-.9929a.0741.0741 0 00-.0514.044c-.211.7121-.4357 1.4144-.6701 2.1024a.0741.0741 0 00.0585.0857c.211.044.4216.0785.6321.1132l.0001.0001.0001.0001c.211.022.4216.044.6321.0585a.0741.0741 0 00.0714-.0652c.2435-1.002.5072-2.011.7825-3.02a.0741.0741 0 00-.0652-.0857c-.2634-.0371-.5197-.0785-.7754-.1209h-.0071c-.2634-.044-.5268-.0857-.7967-.1281a.0741.0741 0 00-.0785.0514c-.324.9479-.6171 1.8883-.8758 2.8216a.0741.0741 0 00.0785.0785c.2946-.0714.5807-.157.8599-.2435a.0741.0741 0 00.0714-.0857c.186-1.1036.4357-2.193.7347-3.2658a.0741.0741 0 00-.0714-.0857c-.0142 0-.0221 0-.0371.0071a14.7821 14.7821 0 00-4.5841.8019.0741.0741 0 00-.0585.0714c-.0371.3088-.0857.6171-.1281.9272a.0741.0741 0 00.0585.0785c1.4507.2868 2.8942.493 4.3006.5949a.0741.0741 0 00.0785-.0585c.3451-.9034.6393-1.8025.8758-2.6994a.0741.0741 0 00-.0714-.0857c-.2039-.0142-.407-.0371-.6099-.0585a15.8202 15.8202 0 01-6.721 0c-.2039.022-.407.044-.6099.0585a.0741.0741 0 00-.0714.0857c.2365.896.5307 1.7959.8758 2.6994a.0741.0741 0 00.0785.0585c1.4063-.1019 2.8499-.3081 4.3006-.5949a.0741.0741 0 00.0585-.0785c-.044-.3101-.0857-.6184-.1281-.9272a.0741.0741 0 00-.0585-.0714 14.79 14.79 0 00-4.5841-.8019.0741.0741 0 00-.0785.0927c.3009 1.0728.5505 2.1622.7347 3.2658a.0741.0741 0 00.0714.0857c.2705-.0857.5664-.1718.8599-.2435a.0741.0741 0 00.0714-.0785c.2634-1.1258.5268-2.2445.7825-3.3632a.0741.0741 0 00-.0652-.0857c-.2556-.044-.512-.0857-.7754-.1281-2.0864-.324-4.084-.9861-5.7442-1.9263a.0741.0741 0 00-.0927.0221c-.3522.477-.6902.969-.9998 1.4809a.0741.0741 0 00.0142.0998c.4557.2868.9114.5522 1.3671.7967a.0741.0741 0 00.0927-.0142c.324-.4357.6242-.8892.9034-1.3592a.0741.0741 0 00-.0221-.0998c-.2868-.186-.5807-.3611-.882-.5392a.0741.0741 0 00-.0927.0221A18.4413 18.4413 0 002.0886 10.232a.0741.0741 0 00.0371.0857c.3522.1673.7045.3168 1.0567.4464a.0741.0741 0 00.0927-.044c.2634-.4216.512-.8528.7474-1.297a.0741.0741 0 00-.044-.0927c-.4557-.211-.896-.4464-1.3219-.698a.0741.0741 0 00-.0857.0142 19.0575 19.0575 0 00-1.8025 5.0487.0741.0741 0 00.0585.0857c2.4593.816 4.8851.9929 7.2458.2946a.0741.0741 0 00.0652-.0585c.1789-.4141.3382-.8282.477-1.2565a.0741.0741 0 00-.0652-.0857c-.493-.1281-.9861-.2634-1.4738-.4141a.0741.0741 0 00-.0857.044c-.0714.157-.1359.3168-.2039.477a.0741.0741 0 00.0071.0857c.5664.4557 1.1537.8758 1.7631 1.2423a.0741.0741 0 00.0998-.0142c.407-.3088.7967-.6393 1.1683-.9861a.0741.0741 0 00.0142-.0927c-.2218-.324-.4557-.6464-.698-.969a.0741.0741 0 00-.0857-.044c-.7505.2868-1.5152.532-2.28.7474a.0741.0741 0 00-.0585.0714c-.0585.2218-.1132.4464-.1718.667a.0741.0741 0 00.0585.0785 17.5613 17.5613 0 005.1668-.3168.0741.0741 0 00.0652-.0714c.1209-.3753.2365-.7505.3382-1.1258a.0741.0741 0 00-.0585-.0857c-.5735-.157-1.1537-.3075-1.722-.477a.0741.0741 0 00-.0857.044c-.1642.3611-.3382.722-.5197 1.0876a.0741.0741 0 00.0371.0927c.4357.2516.8758.493 1.3219.7051a.0741.0741 0 00.0927-.0221c1.4507-1.1908 2.3724-2.651 2.5714-4.2155a.0741.0741 0 00-.0371-.0785A19.921 19.921 0 0012.0002 2.8698z"/></svg>
);

function MemberCard({
  profile,
  isFounder,
}: {
  profile: UserProfile;
  isFounder: boolean;
}) {
  return (
    <Button variant="ghost" asChild className="h-auto w-full p-0">
        <Link href={`/users/${profile.id}`} className="group w-full">
            <Card className="p-2 w-full flex items-center justify-between transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                    <Avatar>
                    <AvatarImage src={profile.avatarUrl} data-ai-hint="person avatar" />
                    <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                        <span className="font-semibold text-sm group-hover:underline">{profile.name}</span>
                        <span className="text-xs text-muted-foreground">{profile.role === 'founder' ? 'Founder' : 'Member'}</span>
                    </div>
                </div>
                {isFounder && <Crown className="h-4 w-4 text-amber-400" />}
            </Card>
        </Link>
    </Button>
  );
}

export default function TeamProfilePage() {
  const { teamId } = useParams() as { teamId: string };
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!teamId) return;

    const teamRef = doc(db, 'teams', teamId);
    const unsubscribe = onSnapshot(
      teamRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
          setTeam(teamData);

          if (teamData.memberIds && teamData.memberIds.length > 0) {
            const profiles = await Promise.all(
              teamData.memberIds.map(async (uid) => {
                const userDoc = await getDoc(doc(db, 'users', uid));
                return userDoc.exists()
                  ? ({ id: userDoc.id, ...userDoc.data() } as UserProfile)
                  : null;
              })
            );
            setMembers(profiles.filter(Boolean) as UserProfile[]);
          } else {
            setMembers([]);
          }
        } else {
          setTeam(null);
          toast({
            title: 'Error',
            description: 'El equipo no existe o fue eliminado.',
            variant: 'destructive',
          });
          router.push('/dashboard');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching team:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamId, router, toast]);

  const handleApply = () => {
    startTransition(() => {
        toast({
            title: '¡Próximamente!',
            description: 'El sistema de solicitud de equipos está en construcción.',
        })
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="relative w-full h-64 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return null; // Redirect is handled in effect
  }

  const safeVideoUrl = team.videoUrl ? team.videoUrl.replace("watch?v=", "embed/") : '';

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Mercado
      </Button>

      <div className="relative">
        <div className="h-48 md:h-64 bg-muted rounded-lg overflow-hidden">
             <Image
              src={team.bannerUrl || 'https://placehold.co/1200x480.png'}
              alt={`${team.name} banner`}
              fill
              className="object-cover"
              data-ai-hint="team banner"
            />
        </div>
        
        <div className="absolute top-full -translate-y-1/2 left-6 md:left-8 z-10">
            <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background bg-card">
              <AvatarImage
                  src={team.avatarUrl}
                  alt={team.name}
                  data-ai-hint="team logo"
              />
              <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
        </div>
      </div>
      
      <div className="pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
                {team.videoUrl && (
                    <Card>
                        <CardContent className="p-0">
                            <div className="aspect-video">
                                <iframe
                                    className="w-full h-full rounded-lg"
                                    src={safeVideoUrl}
                                    title="Vídeo de Presentación del Equipo"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                         </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5" /> Miembros del Equipo ({members.length})</CardTitle>
                        {team.lookingForPlayers && team.founder !== user?.uid && (
                            <Button
                                onClick={handleApply}
                                disabled={isPending}
                            >
                                <UserPlus className="mr-2 h-4 w-4" /> 
                                {isPending ? 'Aplicando...' : 'Aplicar al Equipo'}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {members.map((member) => (
                            <MemberCard
                            key={member.id}
                            profile={member}
                            isFounder={member.id === team.founder}
                            />
                        ))}
                    </CardContent>
                </Card>
            </div>
            {/* RIGHT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl lg:text-4xl font-headline">{team.name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 pt-1">
                            <span className="flex items-center gap-2">
                                <Gamepad2 className="h-4 w-4" />
                                <span>Jugando {team.game}</span>
                            </span>
                            {team.country && (
                                <>
                                    <span className="text-muted-foreground/50">|</span>
                                    <span className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        <span>{team.country}</span>
                                    </span>
                                </>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <h3 className="font-headline font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5" /> Sobre el Equipo</h3>
                        <p className="text-muted-foreground text-sm">
                            {team.description || 'No se ha proporcionado una descripción.'}
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Target className="h-5 w-5" /> Estado de Reclutamiento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Badge variant={team.lookingForPlayers ? 'default' : 'secondary'}>
                            {team.lookingForPlayers ? 'Activamente Reclutando' : 'Equipo Lleno'}
                        </Badge>
                        <div className="flex flex-wrap gap-2">
                            {team.lookingForPlayers && team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                                team.recruitingRoles.map((role) => (
                                <Badge key={role} variant="outline">
                                    {role}
                                </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                {team.lookingForPlayers ? 'Cualquier rol es bienvenido.' : 'No se están buscando roles específicos.'}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Conecta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {team.discordUrl && (
                            <Button variant="outline" asChild className="w-full justify-start">
                                <Link href={team.discordUrl} target="_blank">
                                <DiscordIcon className="h-4 w-4 mr-2" /> Discord
                                </Link>
                            </Button>
                        )}
                        {team.twitchUrl && (
                            <Button variant="outline" asChild className="w-full justify-start">
                                <Link href={team.twitchUrl} target="_blank">
                                <Twitch className="h-4 w-4 mr-2" /> Twitch
                                </Link>
                            </Button>
                        )}
                        {team.twitterUrl && (
                            <Button variant="outline" asChild className="w-full justify-start">
                                <Link href={team.twitterUrl} target="_blank">
                                <Twitter className="h-4 w-4 mr-2" /> Twitter / X
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
