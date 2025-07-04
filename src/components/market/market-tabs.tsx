// src/components/market/market-tabs.tsx
'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { Button } from '../ui/button';
import { MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, UserProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FriendshipButton } from '../friends/friendship-button';
import { SendMessageDialog } from '../messages/send-message-dialog';

export function MarketTabs() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<UserProfile | null>(null);

  useEffect(() => {
    let unsubscribePlayers: Unsubscribe | undefined;
    let unsubscribeTeams: Unsubscribe | undefined;

    if (user) {
        setLoadingPlayers(true);
        const playersQuery = query(collection(db, 'users'), where('lookingForTeam', '==', true));
        unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
          const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
          setPlayers(playersData.filter(p => p.id !== user.uid)); 
          setLoadingPlayers(false);
        }, (error) => {
          console.error("Error fetching players:", error);
          setLoadingPlayers(false);
        });

        setLoadingTeams(true);
        const teamsQuery = query(collection(db, 'teams'), where('lookingForPlayers', '==', true));
        unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
          const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          setTeams(teamsData);
          setLoadingTeams(false);
        }, (error) => {
          console.error("Error fetching teams:", error);
          setLoadingTeams(false);
        });
    } else {
        setPlayers([]);
        setTeams([]);
        setLoadingPlayers(false);
        setLoadingTeams(false);
    }
    
    return () => {
      if (unsubscribePlayers) unsubscribePlayers();
      if (unsubscribeTeams) unsubscribeTeams();
    };
  }, [user]);

  const handleMessagePlayer = (player: UserProfile) => {
    if (!user || !userProfile) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to message a player.', variant: 'destructive' });
        return;
    }
    setSelectedPlayer(player);
    setIsMessageDialogOpen(true);
  };

  const handleContactTeam = async (team: Team) => {
    toast({
        title: 'Feature Not Implemented',
        description: `Contacting team "${team.name}" is not available yet.`,
    });
  };

  const teamLoadingSkeletons = [...Array(4)].map((_, i) => (
      <Card key={i}>
          <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[200px]" />
              </div>
          </CardHeader>
          <CardContent>
              <Skeleton className="h-10 w-full" />
              <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
              </div>
          </CardContent>
          <CardFooter>
              <Skeleton className="h-10 w-full" />
          </CardFooter>
      </Card>
  ));

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
    <>
      {selectedPlayer && (
        <SendMessageDialog
          recipient={selectedPlayer}
          open={isMessageDialogOpen}
          onOpenChange={setIsMessageDialogOpen}
        />
      )}
      <Tabs defaultValue="players">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="players">Players for Hire</TabsTrigger>
          <TabsTrigger value="teams">Teams Recruiting</TabsTrigger>
        </TabsList>
        <TabsContent value="players" className="mt-4">
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
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => handleMessagePlayer(player)}
                                              >
                                                  <MessageSquare className="h-4 w-4" />
                                                  <span className="sr-only">Message Player</span>
                                              </Button>
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
        </TabsContent>
        <TabsContent value="teams">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
            {loadingTeams ? teamLoadingSkeletons : teams.length > 0 ? teams.map((team) => (
              <Card key={team.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo"/>
                    <AvatarFallback>{team.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="font-headline">{team.name}</CardTitle>
                    <CardDescription>
                      Recruiting for {team.game}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {team.description}
                  </p>
                  <div className="mt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">LOOKING FOR</p>
                      <div className="flex flex-wrap gap-2">
                      {team.recruitingRoles?.map((role) => (
                          <Badge key={role} variant="outline">{role}</Badge>
                      ))}
                      </div>
                  </div>
                </CardContent>
                <CardFooter>
                   <Button className="w-full" onClick={() => handleContactTeam(team)}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Contact Team
                  </Button>
                </CardFooter>
              </Card>
            )) : (
               <div className="text-muted-foreground col-span-full mt-4 text-center">No teams are currently recruiting.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
