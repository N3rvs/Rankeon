
'use client';

import { useState, useEffect } from 'react';
import type { GameRoom, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, Globe, Shield, Users2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Spinner } from '../ui/spinner';

interface GameRoomCardProps {
  room: GameRoom;
}

export function GameRoomCard({ room }: GameRoomCardProps) {
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreator = async () => {
      setLoading(true);
      try {
        const creatorDoc = await getDoc(doc(db, 'users', room.createdBy));
        if (creatorDoc.exists()) {
          setCreator({ id: creatorDoc.id, ...creatorDoc.data() } as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching room creator:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCreator();
  }, [room.createdBy]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">{room.name}</CardTitle>
                <CardDescription>Para {room.game}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                 {room.discordChannelId && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                                    <CheckCircle2 className="h-3 w-3 mr-1.5"/>
                                    Discord
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Canal de Discord creado</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
         <div className="flex flex-wrap gap-2">
            {room.rank && (
                <Badge variant="outline">
                    <Shield className="h-3 w-3 mr-1.5" />
                    {room.rank}
                </Badge>
            )}
            {room.partySize && (
                <Badge variant="outline">
                    <Users2 className="h-3 w-3 mr-1.5" />
                    {room.partySize}
                </Badge>
            )}
             {room.server && (
                <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1.5" />
                    {room.server}
                </Badge>
            )}
        </div>
        {loading ? (
            <div className="flex items-center justify-center h-10">
                <Spinner />
            </div>
        ) : creator ? (
             <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={creator.avatarUrl} alt={creator.name} data-ai-hint="person avatar" />
                    <AvatarFallback>{creator.name?.slice(0, 2) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-medium">{creator.name}</p>
                    <p className="text-xs text-muted-foreground">
                        Creado {room.createdAt ? formatDistanceToNow(room.createdAt.toDate(), { addSuffix: true }) : 'hace un momento'}
                    </p>
                </div>
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">No se pudo cargar el creador.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/rooms/${room.id}`}>
            <Eye className="mr-2 h-4 w-4" /> Ver Sala
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
