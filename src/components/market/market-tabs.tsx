
'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { UserProfile, Team } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { FriendshipButton } from '../friends/friendship-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '../ui/button';
import { Search, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getFlagEmoji } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import Link from 'next/link';

const valorantRanks = [
    { value: 'all', label: 'Todos los Rangos' },
    { value: 'Plata', label: 'Plata' },
    { value: 'Oro', label: 'Oro' },
    { value: 'Platino', label: 'Platino' },
    { value: 'Ascendente', label: 'Ascendente' },
    { value: 'Inmortal', label: 'Inmortal' },
];

const valorantRoles = [
    { value: 'all', label: 'Todos los Roles' },
    { value: 'Controlador', label: 'Controlador' },
    { value: 'Iniciador', label: 'Iniciador' },
    { value: 'Duelista', label: 'Duelista' },
    { value: 'Centinela', label: 'Centinela' },
];

const europeanCountries = [
    { value: 'Albania', label: 'Albania' },
    { value: 'Andorra', label: 'Andorra' },
    { value: 'Austria', label: 'Austria' },
    { value: 'Belarus', label: 'Belarus' },
    { value: 'Belgium', label: 'Belgium' },
    { value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
    { value: 'Bulgaria', label: 'Bulgaria' },
    { value: 'Croatia', label: 'Croatia' },
    { value: 'Cyprus', label: 'Cyprus' },
    { value: 'Czech Republic', label: 'Czech Republic' },
    { value: 'Denmark', label: 'Denmark' },
    { value: 'Estonia', label: 'Estonia' },
    { value: 'Finland', label: 'Finland' },
    { value: 'France', label: 'France' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Greece', label: 'Greece' },
    { value: 'Hungary', label: 'Hungary' },
    { value: 'Iceland', label: 'Iceland' },
    { value: 'Ireland', label: 'Ireland' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Latvia', label: 'Latvia' },
    { value: 'Liechtenstein', label: 'Liechtenstein' },
    { value: 'Lithuania', label: 'Lithuania' },
    { value: 'Luxembourg', label: 'Luxembourg' },
    { value: 'Malta', label: 'Malta' },
    { value: 'Moldova', label: 'Moldova' },
    { value: 'Monaco', label: 'Monaco' },
    { value: 'Montenegro', label: 'Montenegro' },
    { value: 'Netherlands', label: 'Netherlands' },
    { value: 'North Macedonia', label: 'North Macedonia' },
    { value: 'Norway', label: 'Norway' },
    { value: 'Poland', label: 'Poland' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'Romania', label: 'Romania' },
    { value: 'Russia', label: 'Russia' },
    { value: 'San Marino', label: 'San Marino' },
    { value: 'Serbia', label: 'Serbia' },
    { value: 'Slovakia', label: 'Slovakia' },
    { value: 'Slovenia', label: 'Slovenia' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Sweden', label: 'Sweden' },
    { value: 'Switzerland', label: 'Switzerland' },
    { value: 'Ukraine', label: 'Ukraine' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Vatican City', label: 'Vatican City' }
];

function PlayerTable({
  players,
  loading,
}: {
  players: UserProfile[];
  loading: boolean;
}) {
  const loadingSkeletons = [...Array(5)].map((_, i) => (
    <TableRow key={i}>
      <TableCell className="w-1/3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </TableCell>
       <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-9 w-9 ml-auto rounded-full" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Jugador</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Rango</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            loadingSkeletons
          ) : players.length > 0 ? (
            players.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                    <Link href={`/users/${player.id}`} className="flex items-center gap-4 group">
                        <Avatar className="h-10 w-10">
                        <AvatarImage
                            src={player.avatarUrl}
                            alt={player.name}
                            data-ai-hint="player avatar"
                        />
                        <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                        <h3 className="font-semibold group-hover:underline">
                            {player.name}
                        </h3>
                        </div>
                    </Link>
                </TableCell>
                 <TableCell>
                    <span className="text-sm text-muted-foreground">{getFlagEmoji(player.country || '')} {player.country || 'N/A'}</span>
                 </TableCell>
                 <TableCell>
                  {player.rank ? (
                    <Badge variant="secondary">{player.rank}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {player.skills && player.skills.length > 0 ? (
                      player.skills
                        .slice(0, 2)
                        .map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Sin roles
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                   {player.lookingForTeam ? (
                        <FriendshipButton targetUser={player} variant="icon" />
                    ) : (
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled>
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Este jugador no está buscando equipo.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No se encontraron jugadores.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamTable({
  teams,
  loading,
  isOwnTeam
}: {
  teams: Team[];
  loading: boolean;
  isOwnTeam: (teamId: string) => boolean;
}) {
  const loadingSkeletons = [...Array(5)].map((_, i) => (
    <TableRow key={i}>
      <TableCell className="w-1/3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
    </TableRow>
  ));

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Equipo</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Rango</TableHead>
            <TableHead>Roles Buscados</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            loadingSkeletons
          ) : teams.length > 0 ? (
            teams.map((team) => (
              <TableRow key={team.id} className={isOwnTeam(team.id) ? 'bg-primary/5' : ''}>
                <TableCell>
                  <Link href={`/teams/${team.id}`} className="flex items-center gap-4 group">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo" />
                      <AvatarFallback>{team.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold group-hover:underline">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">{team.game}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{getFlagEmoji(team.country || '')} {team.country || 'N/A'}</span>
                </TableCell>
                <TableCell>
                  {team.rankMin || team.rankMax ? (
                    <Badge variant="secondary">
                      {team.rankMin}{team.rankMin && team.rankMax && team.rankMin !== team.rankMax ? ` - ${team.rankMax}` : ''}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {team.lookingForPlayers && team.recruitingRoles && team.recruitingRoles.length > 0 ? (
                      team.recruitingRoles.slice(0, 2).map((role) => (
                        <Badge key={role} variant="outline">{role}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {team.lookingForPlayers ? 'Todos' : 'Cerrado'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                     <Link href={`/teams/${team.id}`}>Ver Equipo</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">No se encontraron equipos.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}


export function MarketTabs() {
  const { user, userProfile } = useAuth();
  
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  
  const primaryGame = userProfile?.primaryGame || 'Valorant';
  
  const rankOrder: { [key: string]: number } = {
        'Plata': 1,
        'Oro': 2,
        'Platino': 3,
        'Ascendente': 4,
        'Inmortal': 5,
    };

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (user && userProfile) {
      setLoadingPlayers(true);
      const playersQuery = query(collection(db, 'users'));
      unsubscribe = onSnapshot(playersQuery, (snapshot) => {
        const playersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UserProfile));
        const filteredPlayers = playersData.filter((p) => {
          if (userProfile.blocked?.includes(p.id)) return false;
          if (p.blocked?.includes(user.uid)) return false;
          return true;
        });
        setPlayers(filteredPlayers);
        setLoadingPlayers(false);
      }, (error) => {
        console.error('Error fetching players:', error);
        setLoadingPlayers(false);
      });
    } else {
      setPlayers([]);
      setLoadingPlayers(false);
    }
    return () => unsubscribe?.();
  }, [user, userProfile]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    setLoadingTeams(true);
    const teamsQuery = query(collection(db, 'teams'));
    unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoadingTeams(false);
    }, (error) => {
      console.error('Error fetching teams:', error);
      setLoadingTeams(false);
    });
    return () => unsubscribe?.();
  }, []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setCountryFilter('all');
  };

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
        const gameMatch = p.primaryGame === primaryGame;
        const searchMatch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const roleMatch = roleFilter === 'all' || p.skills?.includes(roleFilter);
        const countryMatch = countryFilter === 'all' || p.country === countryFilter;
        return gameMatch && searchMatch && roleMatch && countryMatch;
    });
  }, [players, primaryGame, searchQuery, roleFilter, countryFilter]);

  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
        const gameMatch = t.game === primaryGame;
        const searchMatch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const roleMatch = roleFilter === 'all' || t.recruitingRoles?.includes(roleFilter);
        const countryMatch = countryFilter === 'all' || t.country === countryFilter;
        return gameMatch && searchMatch && roleMatch && countryMatch;
    });
  }, [teams, primaryGame, searchQuery, roleFilter, countryFilter]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 lg:col-span-1">
                <Label htmlFor="search-market">Buscar equipos o jugadores...</Label>
                <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-market"
                        placeholder="Buscar por nombre..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <Label htmlFor="role-filter">Filtrar por rol</Label>
                 <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger id="role-filter" className="mt-1">
                        <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {valorantRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="country-filter">Filtrar por país</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger id="country-filter" className="mt-1">
                        <SelectValue placeholder="Filtrar por país" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{getFlagEmoji('all')} Todos los Países</SelectItem>
                        {europeanCountries.map(c => <SelectItem key={c.value} value={c.value}>{getFlagEmoji(c.value)} {c.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
         <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleResetFilters}>Reiniciar</Button>
            <Button>Buscar</Button>
        </div>
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">Equipos</TabsTrigger>
          <TabsTrigger value="players">Jugadores</TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="mt-6">
            <TeamTable teams={filteredTeams} loading={loadingTeams} isOwnTeam={(teamId) => teamId === userProfile?.teamId} />
        </TabsContent>
        <TabsContent value="players" className="mt-6">
            <PlayerTable players={filteredPlayers} loading={loadingPlayers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
