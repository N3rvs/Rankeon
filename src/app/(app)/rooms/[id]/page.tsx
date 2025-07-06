'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { GameRoom, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Dices, Gamepad2, Globe, LogIn, LogOut, Shield, Users2, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { joinRoom, leaveRoom } from '@/lib/actions/rooms';
import { RoomChat } from '@/components/rooms/room-chat';

function RoomDetailsCard({ room, creator }: { room: GameRoom, creator: UserProfile | null }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const isParticipant = user ? room.participants.includes(user.uid) : false;

    const handleJoinLeave = () => {
        startTransition(async () => {
            const action = isParticipant ? leaveRoom : joinRoom;
            const result = await action(room.id);
            if (result.success) {
                toast({
                    title: isParticipant ? 'Saliste de la sala' : 'Te uniste a la sala',
                    description: result.message,
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-2xl">
                    <Dices /> {room.name}
                </CardTitle>
                <CardDescription>
                    {creator ? `Sala creada por ${creator.name}` : 'Cargando...'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" /> {room.game}</span>
                    <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> {room.rank}</span>
                    <span className="flex items-center gap-2"><Users2 className="h-4 w-4" /> {room.partySize}</span>
                    <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> {room.server}</span>
                </div>
                 <Button onClick={handleJoinLeave} disabled={isPending} className="w-full">
                    {isParticipant ? (
                        <><LogOut className="mr-2 h-4 w-4" /> Salir de la Sala</>
                    ) : (
                        <><LogIn className="mr-2 h-4 w-4" /> Unirse a la Sala</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

function ParticipantsCard({ participants }: { participants: UserProfile[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-xl">
                    <Users2 /> Participantes ({participants.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {participants.map(p => (
                    <Link href={`/users/${p.id}`} key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                        <Avatar>
                            <AvatarImage src={p.avatarUrl} alt={p.name} data-ai-hint="person avatar" />
                            <AvatarFallback>{p.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.name}</span>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}


export default function RoomDetailPage() {
    const params = useParams();
    const roomId = params.id as string;
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [room, setRoom] = useState<GameRoom | null>(null);
    const [participants, setParticipants] = useState<UserProfile[]>([]);
    const [creator, setCreator] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) return;

        const roomRef = doc(db, 'gameRooms', roomId);
        const unsubscribe = onSnapshot(roomRef, async (roomSnap) => {
            if (roomSnap.exists()) {
                const roomData = { id: roomSnap.id, ...roomSnap.data() } as GameRoom;
                setRoom(roomData);

                const participantPromises = roomData.participants.map(uid => getDoc(doc(db, 'users', uid)));
                const participantDocs = await Promise.all(participantPromises);
                const participantProfiles = participantDocs
                    .filter(snap => snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() } as UserProfile));
                
                setParticipants(participantProfiles);

                const creatorProfile = participantProfiles.find(p => p.id === roomData.createdBy);
                setCreator(creatorProfile || null);

                setLoading(false);
            } else {
                setRoom(null);
                setLoading(false);
                router.push('/rooms');
            }
        });

        return () => unsubscribe();
    }, [roomId, router]);

    if (loading || authLoading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="lg:col-span-2">
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </div>
            </div>
        );
    }
    
    if (!room) {
         return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Sala no encontrada</h2>
                <p className="text-muted-foreground">La sala que buscas no existe o ha sido eliminada.</p>
                <Button asChild className="mt-4">
                    <Link href="/rooms"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a las salas</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/rooms"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a las Salas de Juego</Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                   <RoomDetailsCard room={room} creator={creator} />
                   <ParticipantsCard participants={participants} />
                </div>
                <div className="lg:col-span-2">
                    <RoomChat roomId={room.id} participants={participants} />
                </div>
            </div>
        </div>
    );
}
