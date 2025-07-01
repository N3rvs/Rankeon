'use client';

import { useState, useEffect } from 'react';
import type { GameRoom } from '@/lib/types';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dices } from 'lucide-react';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { GameRoomCard } from '@/components/rooms/game-room-card';

export default function RoomsPage() {
    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, 'gameRooms'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as GameRoom));
            setRooms(roomsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching game rooms: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loadingSkeletons = [...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
    ));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Salas de Juego</h1>
                    <p className="text-muted-foreground">Busca una sala o crea la tuya para empezar a jugar.</p>
                </div>
                <CreateRoomDialog />
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loadingSkeletons}
                </div>
            ) : rooms.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {rooms.map((room) => (
                        <GameRoomCard key={room.id} room={room} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center mt-8">
                    <Dices className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No hay salas de juego</h3>
                    <p className="mt-2 text-muted-foreground">
                        Sé el primero en crear una sala para que otros se unan.
                    </p>
                </div>
            )}
        </div>
    );
}
