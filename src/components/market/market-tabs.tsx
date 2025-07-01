import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { mockTeams, mockUsers } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MessageSquare } from 'lucide-react';

export function MarketTabs() {
  return (
    <Tabs defaultValue="players">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="players">Players for Hire</TabsTrigger>
        <TabsTrigger value="teams">Teams Recruiting</TabsTrigger>
      </TabsList>
      <TabsContent value="players">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {mockUsers.filter(u => u.lookingForTeam).map((player) => (
            <Card key={player.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={player.avatarUrl} alt={player.name} data-ai-hint="player avatar"/>
                  <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-headline">{player.name}</CardTitle>
                  <CardDescription>
                    Looking for a team in {player.games.join(', ')}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {player.bio}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {player.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                 <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" /> Message
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="teams">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {mockTeams.filter(t => t.lookingForPlayers).map((team) => (
            <Card key={team.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={team.avatarUrl} alt={team.name} data-ai-hint="team logo"/>
                  <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
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
                    {team.recruitingRoles.map((role) => (
                        <Badge key={role} variant="outline">{role}</Badge>
                    ))}
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" /> Contact Team
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
