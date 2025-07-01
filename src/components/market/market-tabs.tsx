'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Team, UserProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function MarketTabs() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [isMessaging, setIsMessaging] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
        setPlayers([]);
        setTeams([]);
        setLoadingPlayers(false);
        setLoadingTeams(false);
        return;
    };

    setLoadingPlayers(true);
    const playersQuery = query(collection(db, 'users'), where('lookingForTeam', '==', true));
    const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setPlayers(playersData.filter(p => p.id !== user.uid)); 
      setLoadingPlayers(false);
    }, (error) => {
      console.error("Error fetching players:", error);
      setLoadingPlayers(false);
    });

    setLoadingTeams(true);
    const teamsQuery = query(collection(db, 'teams'), where('lookingForPlayers', '==', true));
    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoadingTeams(false);
    }, (error) => {
      console.error("Error fetching teams:", error);
      setLoadingTeams(false);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, [user]);

  const handleMessagePlayer = async (player: UserProfile) => {
    if (!user || !userProfile) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to message a player.', variant: 'destructive' });
        return;
    }
    setIsMessaging(player.id);
    
    try {
      const conversationId = [user.uid, player.id].sort().join('_');
      const conversationRef = doc(db, 'conversations', conversationId);
      const docSnap = await getDoc(conversationRef);

      if (!docSnap.exists()) {
        await setDoc(conversationRef, {
          participantIds: [user.uid, player.id],
          participants: {
            [user.uid]: {
              name: userProfile.name,
              avatarUrl: userProfile.avatarUrl,
            },
            [player.id]: {
              name: player.name,
              avatarUrl: player.avatarUrl,
            }
          },
          lastMessage: null,
        });
      }
      
      router.push('/messages');

    } catch (error) {
      console.error("Error starting conversation: ", error);
      toast({ title: 'Error', description: 'Could not start a conversation. Please try again.', variant: 'destructive' });
    } finally {
      setIsMessaging(null);
    }
  };

  const handleContactTeam = async (team: Team) => {
    // Messaging a team is a more complex feature. 
    // It could involve messaging the owner, or a shared team inbox.
    // This is out of scope for the current task.
    toast({
        title: 'Feature Not Implemented',
        description: `Contacting team "${team.name}" is not available yet.`,
    });
  };

  const loadingSkeletons = [...Array(4)].map((_, i) => (
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

  return (
    <Tabs defaultValue="players">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="players">Players for Hire</TabsTrigger>
        <TabsTrigger value="teams">Teams Recruiting</TabsTrigger>
      </TabsList>
      <TabsContent value="players">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {loadingPlayers ? loadingSkeletons : players.length > 0 ? players.map((player) => (
            <Card key={player.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={player.avatarUrl} alt={player.name} data-ai-hint="player avatar"/>
                  <AvatarFallback>{player.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-headline">{player.name}</CardTitle>
                  <CardDescription>
                    Looking for a team in {player.games?.join(', ')}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {player.bio || "No bio provided."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {player.skills && player.skills.length > 0 ? player.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  )) : <p className="text-sm text-muted-foreground">No skills listed.</p>}
                </div>
              </CardContent>
              <CardFooter>
                 <Button
                    className="w-full"
                    onClick={() => handleMessagePlayer(player)}
                    disabled={isMessaging === player.id}
                  >
                    {isMessaging === player.id ? 'Starting chat...' : <><MessageSquare className="mr-2 h-4 w-4" /> Message</>}
                </Button>
              </CardFooter>
            </Card>
          )) : (
            <div className="text-muted-foreground col-span-full mt-4 text-center">No players are currently looking for a team.</div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="teams">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {loadingTeams ? loadingSkeletons : teams.length > 0 ? teams.map((team) => (
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
  );
}