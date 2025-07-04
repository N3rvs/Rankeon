// src/components/market/market-tabs.tsx
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
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { FriendshipButton } from '../friends/friendship-button';

export function MarketTabs() {
  const { user, userProfile } = useAuth();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    let unsubscribePlayers: Unsubscribe | undefined;

    if (user && userProfile) {
        setLoadingPlayers(true);
        const playersQuery = query(collection(db, 'users'), where('lookingForTeam', '==', true));
        unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
          const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
          
          const filteredPlayers = playersData.filter(p => {
              // 1. Don't show myself
              if (p.id === user.uid) return false;
              // 2. Don't show people I have blocked
              if (userProfile.blocked?.includes(p.id)) return false;
              // 3. Don't show people who have blocked me
              if (p.blocked?.includes(user.uid)) return false;
              return true;
          });

          setPlayers(filteredPlayers); 
          setLoadingPlayers(false);
        }, (error) => {
          console.error("Error fetching players:", error);
          setLoadingPlayers(false);
        });

    } else {
        setPlayers([]);
        setLoadingPlayers(false);
    }
    
    return () => {
      if (unsubscribePlayers) unsubscribePlayers();
    };
  }, [user, userProfile]);

  const playerLoadingSkeletons = [...Array(5)].map((_, i) => (
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
          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
          <TableCell><Skeleton className="h-6 w-32" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
      </TableRow>
  ));

  return (
    <Card>
        <CardContent className="pt-6">
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
                        {loadingPlayers ? playerLoadingSkeletons : players.length > 0 ? players.map((player) => (
                            <TableRow key={player.id}>
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={player.avatarUrl} alt={player.name} data-ai-hint="player avatar"/>
                                            <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{player.name}</p>
                                            <p className="text-sm text-muted-foreground">{player.country || 'Location not set'}</p>
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
                                        {player.skills && player.skills.length > 0 ? player.skills.slice(0, 3).map((skill) => (
                                            <Badge key={skill} variant="secondary">{skill}</Badge>
                                        )) : <span className="text-muted-foreground text-sm">No skills listed</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <FriendshipButton targetUser={player} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No players are currently looking for a team.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
}
