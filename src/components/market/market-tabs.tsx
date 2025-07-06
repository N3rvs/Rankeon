
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
import { useState, useEffect } from 'react';
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

function PlayerTable() {
  const { user, userProfile } = useAuth();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user && userProfile) {
      setLoading(true);
      const playersQuery = query(
        collection(db, 'users'),
        where('lookingForTeam', '==', true)
      );
      unsubscribe = onSnapshot(
        playersQuery,
        (snapshot) => {
          const playersData = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as UserProfile)
          );

          const filteredPlayers = playersData.filter((p) => {
            if (p.id === user.uid) return false;
            if (userProfile.blocked?.includes(p.id)) return false;
            if (p.blocked?.includes(user.uid)) return false;
            return true;
          });

          setPlayers(filteredPlayers);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching players:', error);
          setLoading(false);
        }
      );
    } else {
      setPlayers([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, userProfile]);

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
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-20 ml-auto" />
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Player</TableHead>
            <TableHead>Primary Game</TableHead>
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
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={player.avatarUrl}
                        alt={player.name}
                        data-ai-hint="player avatar"
                      />
                      <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{player.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {player.country || 'Location not set'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {player.games && player.games.length > 0 ? (
                    <Badge variant="outline">{player.games[0]}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
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
                  <div className="flex items-center justify-end gap-2">
                    <FriendshipButton targetUser={player} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No players are currently looking for a team.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamTable() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    setLoading(true);
    const teamsQuery = query(
      collection(db, 'teams'),
      where('lookingForPlayers', '==', true)
    );
    unsubscribe = onSnapshot(
      teamsQuery,
      (snapshot) => {
        const teamsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Team)
        );
        setTeams(teamsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching teams:', error);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
            <TableHead>Game</TableHead>
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
                  <Badge variant="outline">{team.game}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {team.recruitingRoles && team.recruitingRoles.length > 0 ? (
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
              <TableCell colSpan={4} className="h-24 text-center">
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
  return (
    <Tabs defaultValue="players" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="players">Players Looking for Team</TabsTrigger>
        <TabsTrigger value="teams">Teams Looking for Players</TabsTrigger>
      </TabsList>
      <TabsContent value="players">
        <Card>
          <CardContent className="pt-6">
            <PlayerTable />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="teams">
        <Card>
          <CardContent className="pt-6">
            <TeamTable />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
