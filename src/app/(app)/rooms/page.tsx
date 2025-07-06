'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { GameRoom } from '@/lib/types';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { GameRoomCard } from '@/components/rooms/game-room-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dices, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GameRoomsPage() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const roomsQuery = query(collection(db, 'gameRooms'), orderBy('createdAt', 'desc'));
    const unsubscribe: Unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameRoom));
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching game rooms:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const filteredRooms = rooms.filter(room => room.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Dices />
            Salas de Juego
          </h1>
          <p className="text-muted-foreground">
            Encuentra un grupo para jugar o crea tu propia sala.
          </p>
        </div>
        <CreateRoomDialog />
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar sala por nombre..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map(room => (
            <GameRoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>No se encontraron salas de juego.</p>
          <p className="text-sm">¿Por qué no creas una?</p>
        </div>
      )}
    </div>
  );
}
