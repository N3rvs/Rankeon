
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
  where,
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
import { Eye, Globe } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-9 w-28 ml-auto" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Player</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            loadingSkeletons
          ) : players.length > 0 ? (
            players.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                  <Link
                    href={`/users/${player.id}`}
                    className="flex items-center gap-4 group"
                  >
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
                      <p className="text-sm text-muted-foreground">
                        {player.country || 'Location not set'}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {player.skills && player.skills.length > 0 ? (
                      player.skills
                        .slice(0, 3)
                        .map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        No skills listed
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <FriendshipButton targetUser={player} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No players are currently looking for a team.
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
}: {
  teams: Team[];
  loading: boolean;
}) {
  const loadingSkeletons = [...Array(5)].map((_, i) => (
    <TableRow key={i}>
      <TableCell className="w-1/3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-9 w-24 ml-auto" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Team</TableHead>
            <TableHead>Recruiting</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            loadingSkeletons
          ) : teams.length > 0 ? (
            teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={team.avatarUrl}
                        alt={team.name}
                        data-ai-hint="team logo"
                      />
                      <AvatarFallback>{team.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      {team.country && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3 w-3" />
                          {team.country}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {team.recruitingRoles &&
                    team.recruitingRoles.length > 0 ? (
                      team.recruitingRoles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Any role
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/teams/${team.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No teams are currently recruiting.
              </TableCell>
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
  const [countryFilter, setCountryFilter] = useState('all');
  
  const primaryGame = userProfile?.primaryGame || 'Valorant';

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (user && userProfile) {
      setLoadingPlayers(true);
      const playersQuery = query(
        collection(db, 'users'), 
        where('lookingForTeam', '==', true),
        where('primaryGame', '==', primaryGame)
      );
      unsubscribe = onSnapshot(playersQuery, (snapshot) => {
        const playersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UserProfile));
        const filteredPlayers = playersData.filter((p) => {
          if (p.id === user.uid) return false;
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
  }, [user, userProfile, primaryGame]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    setLoadingTeams(true);
    const teamsQuery = query(
      collection(db, 'teams'), 
      where('lookingForPlayers', '==', true),
      where('game', '==', primaryGame)
    );
    unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoadingTeams(false);
    }, (error) => {
      console.error('Error fetching teams:', error);
      setLoadingTeams(false);
    });
    return () => unsubscribe?.();
  }, [primaryGame]);

  const countries = useMemo(() => {
    const playerCountries = players.map(p => p.country).filter((c): c is string => !!c);
    const teamCountries = teams.map(t => t.country).filter((c): c is string => !!c);
    return [...new Set([...playerCountries, ...teamCountries])].sort();
  }, [players, teams]);

  const filteredPlayers = useMemo(() => {
    if (countryFilter === 'all') return players;
    return players.filter(p => p.country === countryFilter);
  }, [players, countryFilter]);

  const filteredTeams = useMemo(() => {
    if (countryFilter === 'all') return teams;
    return teams.filter(t => t.country === countryFilter);
  }, [teams, countryFilter]);

  return (
    <Tabs defaultValue="players" className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="players">Players Looking for Team</TabsTrigger>
          <TabsTrigger value="teams">Teams Looking for Players</TabsTrigger>
        </TabsList>
        <div className="w-full sm:w-auto sm:max-w-xs">
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger>
              <Globe className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <TabsContent value="players">
        <Card>
          <CardContent className="p-0 sm:p-6">
            <PlayerTable players={filteredPlayers} loading={loadingPlayers} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="teams">
        <Card>
          <CardContent className="p-0 sm:p-6">
            <TeamTable teams={filteredTeams} loading={loadingTeams} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
