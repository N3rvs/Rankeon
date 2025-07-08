
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
import { useState, useEffect, useMemo, useTransition } from 'react';
import type { UserProfile, Team } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { FriendshipButton } from '../friends/friendship-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '../ui/button';
import { Search, MailPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getFlagEmoji } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { sendTeamInvite } from '@/lib/actions/teams';
import { useI18n } from '@/contexts/i18n-context';
import { getMarketPlayers, getMarketTeams } from '@/lib/actions/public';

function PlayerTable({
  players,
  loading,
}: {
  players: UserProfile[];
  loading: boolean;
}) {
  const { userProfile, claims } = useAuth();
  const { toast } = useToast();
  const [isInviting, startInviting] = useTransition();
  const { t } = useI18n();

  const canInvite = userProfile?.teamId && (userProfile.role === 'founder' || userProfile.role === 'coach' || claims?.role === 'admin');

  const handleInvitePlayer = (player: UserProfile) => {
    if (!canInvite || !userProfile.teamId) return;

    startInviting(async () => {
        const result = await sendTeamInvite(player.id, userProfile.teamId!);
        if (result.success) {
            toast({
                title: 'Invitación Enviada',
                description: `Se ha enviado una invitación a ${player.name} para unirse a tu equipo.`,
            });
        } else {
            toast({
                title: 'Error al Invitar',
                description: result.message,
                variant: 'destructive',
            });
        }
    });
  };

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
        <div className="flex items-center justify-end gap-1">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">{t('Market.player_header')}</TableHead>
            <TableHead>{t('Market.country_header')}</TableHead>
            <TableHead>{t('Market.rank_header')}</TableHead>
            <TableHead>{t('Market.roles_header')}</TableHead>
            <TableHead className="text-right">{t('Market.actions_header')}</TableHead>
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
                    <span className="text-sm text-muted-foreground">{getFlagEmoji(player.country || '')} {player.country || t('Market.not_applicable')}</span>
                 </TableCell>
                 <TableCell>
                  {player.rank ? (
                    <Badge variant="secondary">{player.rank}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('Market.not_applicable')}</span>
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
                        {t('Market.no_roles')}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                   <div className="flex items-center justify-end gap-2">
                        {canInvite && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleInvitePlayer(player)}
                                                disabled={!player.lookingForTeam || !!player.teamId || isInviting}
                                                aria-label={t('Market.invite_tooltip')}
                                            >
                                                <MailPlus className="h-4 w-4" />
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {!player.lookingForTeam ? (
                                            <p>{t('Market.not_looking_tooltip')}</p>
                                        ) : player.teamId ? (
                                            <p>{t('Market.already_in_team_tooltip')}</p>
                                        ) : (
                                            <p>{t('Market.invite_tooltip')}</p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                       <FriendshipButton targetUser={player} variant="icon" />
                   </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                {t('Market.no_players_found')}
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
  const { t } = useI18n();

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
    </TableRow>
  ));

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">{t('Market.team_header')}</TableHead>
            <TableHead>{t('Market.country_header')}</TableHead>
            <TableHead>{t('Market.rank_header')}</TableHead>
            <TableHead>{t('Market.roles_wanted_header')}</TableHead>
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
                  <span className="text-sm text-muted-foreground">{getFlagEmoji(team.country || '')} {team.country || t('Market.not_applicable')}</span>
                </TableCell>
                <TableCell>
                  {team.rankMin || team.rankMax ? (
                    <Badge variant="secondary">
                      {team.rankMin}{team.rankMin && team.rankMax && team.rankMin !== team.rankMax ? ` - ${team.rankMax}` : ''}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('Market.not_applicable')}</span>
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
                        {team.lookingForPlayers ? t('Market.all_welcome') : t('Market.closed')}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">{t('Market.no_teams_found')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}


export function MarketTabs() {
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  
  const primaryGame = userProfile?.primaryGame || 'Valorant';
  
  const rankOrder: { [key: string]: number } = {
        'Hierro': 1,
        'Bronce': 2,
        'Plata': 3,
        'Oro': 4,
        'Platino': 5,
        'Diamante': 6,
        'Ascendente': 7,
        'Inmortal': 8,
        'Radiante': 9,
    };

    const valorantRanks = [
      { value: 'all', label: t('Market.all_ranks') },
      { value: 'Hierro', label: t('Ranks.iron') },
      { value: 'Bronce', label: t('Ranks.bronze') },
      { value: 'Plata', label: t('Ranks.silver') },
      { value: 'Oro', label: t('Ranks.gold') },
      { value: 'Platino', label: t('Ranks.platinum') },
      { value: 'Diamante', label: t('Ranks.diamond') },
      { value: 'Ascendente', label: t('Ranks.ascendant') },
      { value: 'Inmortal', label: t('Ranks.immortal') },
      { value: 'Radiante', label: t('Ranks.radiant') },
  ];
  
  const valorantRoles = [
      { value: 'all', label: t('Market.all_roles') },
      { value: 'Controlador', label: t('Roles.controller') },
      { value: 'Iniciador', label: t('Roles.initiator') },
      { value: 'Duelista', label: t('Roles.duelist') },
      { value: 'Centinela', label: t('Roles.sentinel') },
  ];

  const europeanCountries = [
    { value: 'all', label: t('Market.all_countries') },
    { value: 'Albania', label: `${getFlagEmoji('Albania')} ${t('Countries.albania')}` },
    { value: 'Andorra', label: `${getFlagEmoji('Andorra')} ${t('Countries.andorra')}` },
    { value: 'Austria', label: `${getFlagEmoji('Austria')} ${t('Countries.austria')}` },
    { value: 'Belarus', label: `${getFlagEmoji('Belarus')} ${t('Countries.belarus')}` },
    { value: 'Belgium', label: `${getFlagEmoji('Belgium')} ${t('Countries.belgium')}` },
    { value: 'Bosnia and Herzegovina', label: `${getFlagEmoji('Bosnia and Herzegovina')} ${t('Countries.bosnia_and_herzegovina')}` },
    { value: 'Bulgaria', label: `${getFlagEmoji('Bulgaria')} ${t('Countries.bulgaria')}` },
    { value: 'Croatia', label: `${getFlagEmoji('Croatia')} ${t('Countries.croatia')}` },
    { value: 'Cyprus', label: `${getFlagEmoji('Cyprus')} ${t('Countries.cyprus')}` },
    { value: 'Czech Republic', label: `${getFlagEmoji('Czech Republic')} ${t('Countries.czech_republic')}` },
    { value: 'Denmark', label: `${getFlagEmoji('Denmark')} ${t('Countries.denmark')}` },
    { value: 'Estonia', label: `${getFlagEmoji('Estonia')} ${t('Countries.estonia')}` },
    { value: 'Finland', label: `${getFlagEmoji('Finland')} ${t('Countries.finland')}` },
    { value: 'France', label: `${getFlagEmoji('France')} ${t('Countries.france')}` },
    { value: 'Germany', label: `${getFlagEmoji('Germany')} ${t('Countries.germany')}` },
    { value: 'Greece', label: `${getFlagEmoji('Greece')} ${t('Countries.greece')}` },
    { value: 'Hungary', label: `${getFlagEmoji('Hungary')} ${t('Countries.hungary')}` },
    { value: 'Iceland', label: `${getFlagEmoji('Iceland')} ${t('Countries.iceland')}` },
    { value: 'Ireland', label: `${getFlagEmoji('Ireland')} ${t('Countries.ireland')}` },
    { value: 'Italy', label: `${getFlagEmoji('Italy')} ${t('Countries.italy')}` },
    { value: 'Latvia', label: `${getFlagEmoji('Latvia')} ${t('Countries.latvia')}` },
    { value: 'Liechtenstein', label: `${getFlagEmoji('Liechtenstein')} ${t('Countries.liechtenstein')}` },
    { value: 'Lithuania', label: `${getFlagEmoji('Lithuania')} ${t('Countries.lithuania')}` },
    { value: 'Luxembourg', label: `${getFlagEmoji('Luxembourg')} ${t('Countries.luxembourg')}` },
    { value: 'Malta', label: `${getFlagEmoji('Malta')} ${t('Countries.malta')}` },
    { value: 'Moldova', label: `${getFlagEmoji('Moldova')} ${t('Countries.moldova')}` },
    { value: 'Monaco', label: `${getFlagEmoji('Monaco')} ${t('Countries.monaco')}` },
    { value: 'Montenegro', label: `${getFlagEmoji('Montenegro')} ${t('Countries.montenegro')}` },
    { value: 'Netherlands', label: `${getFlagEmoji('Netherlands')} ${t('Countries.netherlands')}` },
    { value: 'North Macedonia', label: `${getFlagEmoji('North Macedonia')} ${t('Countries.north_macedonia')}` },
    { value: 'Norway', label: `${getFlagEmoji('Norway')} ${t('Countries.norway')}` },
    { value: 'Poland', label: `${getFlagEmoji('Poland')} ${t('Countries.poland')}` },
    { value: 'Portugal', label: `${getFlagEmoji('Portugal')} ${t('Countries.portugal')}` },
    { value: 'Romania', label: `${getFlagEmoji('Romania')} ${t('Countries.romania')}` },
    { value: 'Russia', label: `${getFlagEmoji('Russia')} ${t('Countries.russia')}` },
    { value: 'San Marino', label: `${getFlagEmoji('San Marino')} ${t('Countries.san_marino')}` },
    { value: 'Serbia', label: `${getFlagEmoji('Serbia')} ${t('Countries.serbia')}` },
    { value: 'Slovakia', label: `${getFlagEmoji('Slovakia')} ${t('Countries.slovakia')}` },
    { value: 'Slovenia', label: `${getFlagEmoji('Slovenia')} ${t('Countries.slovenia')}` },
    { value: 'Spain', label: `${getFlagEmoji('Spain')} ${t('Countries.spain')}` },
    { value: 'Sweden', label: `${getFlagEmoji('Sweden')} ${t('Countries.sweden')}` },
    { value: 'Switzerland', label: `${getFlagEmoji('Switzerland')} ${t('Countries.switzerland')}` },
    { value: 'Ukraine', label: `${getFlagEmoji('Ukraine')} ${t('Countries.ukraine')}` },
    { value: 'United Kingdom', label: `${getFlagEmoji('United Kingdom')} ${t('Countries.united_kingdom')}` },
    { value: 'Vatican City', label: `${getFlagEmoji('Vatican City')} ${t('Countries.vatican_city')}` }
  ];

  useEffect(() => {
    if (!user) {
        setLoadingPlayers(false);
        setLoadingTeams(false);
        return;
    }

    const fetchData = async () => {
        setLoadingPlayers(true);
        setLoadingTeams(true);

        const [playersResult, teamsResult] = await Promise.all([
            getMarketPlayers(),
            getMarketTeams()
        ]);

        if (playersResult.success && playersResult.data) {
            const filtered = playersResult.data.filter(p => {
                if (userProfile?.blocked?.includes(p.id)) return false;
                if (p.blocked?.includes(user.uid)) return false;
                return true;
            });
            setPlayers(filtered);
        } else {
            toast({ title: "Error", description: `Could not load players: ${playersResult.message}`, variant: "destructive"});
        }
        setLoadingPlayers(false);

        if (teamsResult.success && teamsResult.data) {
            setTeams(teamsResult.data);
        } else {
            toast({ title: "Error", description: `Could not load teams: ${teamsResult.message}`, variant: "destructive"});
        }
        setLoadingTeams(false);
    };

    fetchData();
  }, [user, userProfile?.blocked, toast]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setCountryFilter('all');
    setRankFilter('all');
  };

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
        const gameMatch = p.primaryGame === primaryGame;
        const searchMatch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const roleMatch = roleFilter === 'all' || p.skills?.includes(roleFilter);
        const countryMatch = countryFilter === 'all' || p.country === countryFilter;
        const rankMatch = rankFilter === 'all' || p.rank === rankFilter;
        return gameMatch && searchMatch && roleMatch && countryMatch && rankMatch;
    });
  }, [players, primaryGame, searchQuery, roleFilter, countryFilter, rankFilter]);

  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
        const gameMatch = t.game === primaryGame;
        const searchMatch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const roleMatch = roleFilter === 'all' || t.recruitingRoles?.includes(roleFilter);
        const countryMatch = countryFilter === 'all' || t.country === countryFilter;
        const rankMatch = rankFilter === 'all' || (
            t.rankMin && t.rankMax && rankOrder[rankFilter] &&
            rankOrder[rankFilter] >= rankOrder[t.rankMin as keyof typeof rankOrder] &&
            rankOrder[rankFilter] <= rankOrder[t.rankMax as keyof typeof rankOrder]
        );
        return gameMatch && searchMatch && roleMatch && countryMatch && rankMatch;
    });
  }, [teams, primaryGame, searchQuery, roleFilter, countryFilter, rankFilter, rankOrder]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <Label htmlFor="search-market">{t('Market.search_label')}</Label>
                <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-market"
                        placeholder={t('Market.search_placeholder')}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
             <div>
                <Label htmlFor="rank-filter">{t('Market.rank_filter_label')}</Label>
                 <Select value={rankFilter} onValueChange={setRankFilter}>
                    <SelectTrigger id="rank-filter" className="mt-1">
                        <SelectValue placeholder={t('Market.all_ranks')} />
                    </SelectTrigger>
                    <SelectContent>
                        {valorantRanks.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="role-filter">{t('Market.role_filter_label')}</Label>
                 <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger id="role-filter" className="mt-1">
                        <SelectValue placeholder={t('Market.all_roles')} />
                    </SelectTrigger>
                    <SelectContent>
                        {valorantRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="country-filter">{t('Market.country_filter_label')}</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger id="country-filter" className="mt-1">
                        <SelectValue placeholder={t('Market.all_countries')} />
                    </SelectTrigger>
                    <SelectContent>
                        {europeanCountries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
         <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleResetFilters}>{t('Market.reset_button')}</Button>
        </div>
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teams">{t('Market.teams_tab')}</TabsTrigger>
          <TabsTrigger value="players">{t('Market.players_tab')}</TabsTrigger>
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
