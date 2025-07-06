'use client';

import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Dices } from 'lucide-react';

export default function RoomsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Salas de Juego
          </h1>
          <p className="text-muted-foreground">
            Encuentra un grupo o crea el tuyo para jugar ahora.
          </p>
        </div>
        <CreateRoomDialog />
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[400px]">
        <Dices className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No hay salas de juego activas</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Sé el primero en crear una para que otros se unan.
        </p>
      </div>
    </div>
  );
}
