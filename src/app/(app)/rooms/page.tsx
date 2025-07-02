
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { GameRoom } from '@/lib/types';
import { collection, query, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dices, Globe, Shield, Users2 } from 'lucide-react';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { GameRoomCard } from '@/components/rooms/game-room-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';

const valorantServers = [
    { value: 'all', label: 'Todos los Servidores' },
    { value: 'Frankfurt', label: 'Alemania' },
    { value: 'London', label: 'Londres' },
    { value: 'Madrid', label: 'España' },
    { value: 'Paris', label: 'Francia' },
];

const valorantRanks = [
    { value: 'all', label: 'Todos los Rangos' },
    { value: 'Plata', label: 'Plata' },
    { value: 'Oro', label: 'Oro' },
    { value: 'Platino', label: 'Platino' },
    { value: 'Ascendente', label: 'Ascendente' },
    { value: 'Inmortal', label: 'Inmortal' },
];

const partySizes = [
    { value: 'all', label: 'Cualquier Tamaño' },
    { value: 'Dúo', label: 'Dúo (2)' },
    { value: 'Trío', label: 'Trío (3)' },
    { value: 'Full Stack', label: 'Full Stack (5)' },
];

export default function RoomsPage() {
    const { user } = useAuth();
    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [serverFilter, setServerFilter] = useState('all');
    const [rankFilter, setRankFilter] = useState('all');
    const [partySizeFilter, setPartySizeFilter] = useState('all');

    useEffect(() => {
        let unsubscribe: Unsubscribe | undefined;

        if (user) {
            setLoading(true);
            const q = query(
                collection(db, 'gameRooms'),
                orderBy('createdAt', 'desc')
            );

            unsubscribe = onSnapshot(q, (snapshot) => {
                const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as GameRoom));
                setRooms(roomsData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching game rooms: ", error);
                setLoading(false);
            });
        } else {
            setLoading(false);
            setRooms([]);
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user]);

    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const serverMatch = serverFilter === 'all' || room.server === serverFilter;
            const rankMatch = rankFilter === 'all' || room.rank === rankFilter;
            const partySizeMatch = partySizeFilter === 'all' || room.partySize === partySizeFilter;
            return serverMatch && rankMatch && partySizeMatch;
        });
    }, [rooms, serverFilter, rankFilter, partySizeFilter]);

    const loadingSkeletons = [...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-lg" />
    ));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Salas de Juego</h1>
                    <p className="text-muted-foreground">Busca una sala o crea la tuya para empezar a jugar.</p>
                </div>
                <CreateRoomDialog />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-lg bg-card">
                 <Select value={serverFilter} onValueChange={setServerFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                        <Globe className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filtrar por servidor" />
                    </SelectTrigger>
                    <SelectContent>
                        {valorantServers.map(server => (
                            <SelectItem key={server.value} value={server.value}>{server.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={rankFilter} onValueChange={setRankFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <Shield className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filtrar por rango" />
                    </SelectTrigger>
                    <SelectContent>
                        {valorantRanks.map(rank => (
                            <SelectItem key={rank.value} value={rank.value}>{rank.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={partySizeFilter} onValueChange={setPartySizeFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <Users2 className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filtrar por grupo" />
                    </SelectTrigger>
                    <SelectContent>
                        {partySizes.map(size => (
                            <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loadingSkeletons}
                </div>
            ) : filteredRooms.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRooms.map((room) => (
                        <GameRoomCard key={room.id} room={room} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center mt-8 col-span-full">
                    <Dices className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No se encontraron salas</h3>
                    <p className="mt-2 text-muted-foreground">
                       No hay salas disponibles con los filtros seleccionados. ¡Intenta con otros o crea una!
                    </p>
                </div>
            )}
        </div>
    );
}
