'use server';

import { z } from 'zod';
import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

const CreateRoomSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(50),
  game: z.string().min(1, { message: 'Por favor, introduce un juego.' }),
  server: z.string().min(1, { message: 'Por favor, selecciona un servidor.' }),
});

type ActionResponse = {
  success: boolean;
  message: string;
  roomId?: string;
};

export async function createRoom(
  values: z.infer<typeof CreateRoomSchema>,
  token: string | null
): Promise<ActionResponse> {
  if (!token) {
    return { success: false, message: 'Falta el token de autenticación.' };
  }

  const { adminAuth, adminDb } = getAdminInstances();
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    const validatedFields = CreateRoomSchema.safeParse(values);

    if (!validatedFields.success) {
      return { success: false, message: 'Datos del formulario no válidos.' };
    }
    
    const { name, game, server } = validatedFields.data;
    
    const newRoomRef = adminDb.collection('gameRooms').doc();
    
    await newRoomRef.set({
      id: newRoomRef.id,
      name,
      game,
      server,
      createdBy: uid,
      discordChannelId: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/rooms');

    return { success: true, message: 'Sala creada con éxito.', roomId: newRoomRef.id };
  } catch (error: any) {
    console.error('Error al crear la sala:', error);
    if (error.code === 'auth/id-token-expired') {
        return { success: false, message: 'La sesión ha expirado. Por favor, inicia sesión de nuevo.' };
    }
    return { success: false, message: 'No se pudo crear la sala. Por favor, inténtalo de nuevo.' };
  }
}
