// src/components/market/team-card.tsx
'use client';
import type { Team } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { getFlagEmoji } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TeamCardProps {
  team: Team;
  isOwnTeam: boolean;
}

export function TeamCard({ team, isOwnTeam }: TeamCardProps) {
  return (
    <Card className={cn(
        "overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-card border-border/50",
        isOwnTeam && "ring-2 ring-primary"
    )}>
      <Link href={`/teams/${team.id}`} className="flex flex-col h-full">
        <div className="relative aspect-video bg-muted flex-shrink-0">
          <Image
            src={team.bannerUrl || 'https://placehold.co/600x400.png'}
            alt={`${team.name} banner`}
            fill
            className="object-cover"
            data-ai-hint="team banner abstract"
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
           <div className="absolute bottom-2 left-4">
               <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16 border-2 border-primary/50">
                        <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo gaming" />
                        <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                     <div>
                        <h3 className="font-headline text-lg font-bold text-white shadow-black [text-shadow:1px_1px_2px_var(--tw-shadow-color)]">{team.name}</h3>
                        <p className="text-sm text-primary-foreground/80 shadow-black [text-shadow:1px_1px_1px_var(--tw-shadow-color)]">{getFlagEmoji(team.country || '')} {team.country}</p>
                    </div>
                </div>
           </div>
        </div>
        <CardContent className="p-4 flex flex-col flex-grow">
          <p className="text-sm text-muted-foreground h-10 overflow-hidden flex-grow">
            {team.description || 'Este equipo aún no ha añadido una descripción.'}
          </p>
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles Requeridos</span>
              {isOwnTeam ? (
                 <Badge variant="secondary">Tu Equipo</Badge>
              ) : team.lookingForPlayers ? (
                <Badge variant="default">Reclutando</Badge>
              ) : (
                 <Badge variant="outline">Cerrado</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[26px]">
              {team.lookingForPlayers && team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                team.recruitingRoles.map(role => (
                  <Badge key={role} variant="secondary">{role}</Badge>
                ))
              ) : team.lookingForPlayers ? (
                <p className="text-sm text-muted-foreground">Cualquier rol es bienvenido.</p>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
