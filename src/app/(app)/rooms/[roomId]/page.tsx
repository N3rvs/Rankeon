'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import type { GameRoom, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  UserPlus,
  LogOut,
  Globe,
  Shield,
  Users2,
  Crown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { joinRoom, leaveRoom } from '@/lib/actions/rooms';
import { formatDistanceToNow } from 'date-fns';
import { RoomChat } from '@/components/rooms/room-chat';

function ParticipantCard({
  profile,
  isCreator,
}: {
  profile: UserProfile;
  isCreator: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={profile.avatarUrl} data-ai-hint="person avatar" />
          <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{profile.name}</span>
      </div>
      {isCreator && <Crown className="h-5 w-5 text-amber-400" />}
    </div>
  );
}

export default function RoomDetailPage() {
  const { roomId } = useParams() as { roomId: string };
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, 'gameRooms', roomId);
    const unsubscribe = onSnapshot(
      roomRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const roomData = { id: docSnap.id, ...docSnap.data() } as GameRoom;
          setRoom(roomData);

          if (roomData.participants && roomData.participants.length > 0) {
            const profiles = await Promise.all(
              roomData.participants.map(async (uid) => {
                const userDoc = await getDoc(doc(db, 'users', uid));
                return userDoc.exists()
                  ? ({ id: userDoc.id, ...userDoc.data() } as UserProfile)
                  : null;
              })
            );
            setParticipants(profiles.filter(Boolean) as UserProfile[]);
          } else {
            setParticipants([]);
          }
        } else {
          setRoom(null);
          toast({
            title: 'Error',
            description: 'La sala ya no existe.',
            variant: 'destructive',
          });
          router.push('/rooms');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching room:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId, router, toast]);

  const handleJoinLeave = () => {
    startTransition(async () => {
      const action = isUserInRoom ? leaveRoom : joinRoom;
      const result = await action(roomId);
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const isUserInRoom = room?.participants.includes(user?.uid ?? '');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return null; // Redirecting is handled in the effect
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a las salas
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">
                {room.name}
              </CardTitle>
              <CardDescription>
                Creado{' '}
                {room.createdAt
                  ? formatDistanceToNow(room.createdAt.toDate(), {
                      addSuffix: true,
                    })
                  : 'hace un momento'}
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                {room.rank && (
                  <Badge variant="outline">
                    <Shield className="mr-2 h-4 w-4" /> {room.rank}
                  </Badge>
                )}
                {room.partySize && (
                  <Badge variant="outline">
                    <Users2 className="mr-2 h-4 w-4" /> {room.partySize}
                  </Badge>
                )}
                {room.server && (
                  <Badge variant="outline">
                    <Globe className="mr-2 h-4 w-4" /> {room.server}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-xl font-semibold font-headline mb-4 flex items-center gap-2">
                <Users />
                Participantes ({participants.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participants.map((p) => (
                  <ParticipantCard
                    key={p.id}
                    profile={p}
                    isCreator={p.id === room.createdBy}
                  />
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleJoinLeave}
                disabled={isPending}
                variant={isUserInRoom ? 'destructive' : 'default'}
              >
                {isUserInRoom ? (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    {isPending ? 'Saliendo...' : 'Salir de la Sala'}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isPending ? 'Uniéndose...' : 'Unirse a la Sala'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <RoomChat roomId={roomId} participants={participants} />
        </div>
      </div>
    </div>
  );
}
