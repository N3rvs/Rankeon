'use server';

import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

import { z } from 'zod';
import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

const CreateTeamSchema = z.object({
  name: z.string().min(3, { message: 'El nombre del equipo debe tener al menos 3 caracteres.' }).max(50),
  game: z.string().min(1, { message: 'Por favor, introduce un juego.' }),
  description: z.string().max(300).optional(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  teamId?: string;
};

export async function createTeam(
  values: z.infer<typeof CreateTeamSchema>,
  token: string | null
): Promise<ActionResponse> {
  if (!token) {
    return { success: false, message: 'Falta el token de autenticación.' };
  }

  const { adminAuth, adminDb } = getAdminInstances();
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    const validatedFields = CreateTeamSchema.safeParse(values);

    if (!validatedFields.success) {
      const errorMessages = validatedFields.error.errors.map(e => e.message).join(', ');
      return { success: false, message: `Datos del formulario no válidos: ${errorMessages}` };
    }
    
    const { name, game, description } = validatedFields.data;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userProfile = userDoc.data();

    if (!userProfile) {
      return { success: false, message: 'No se encontró el perfil del usuario.' };
    }

    const allowedRoles = ['admin', 'moderator', 'founder'];
    if (!allowedRoles.includes(userProfile.role)) {
      return { success: false, message: 'No tienes permiso para crear un equipo.' };
    }
    
    const newTeamRef = adminDb.collection('teams').doc();
    
    await newTeamRef.set({
      id: newTeamRef.id,
      name,
      game,
      description: description || '',
      avatarUrl: `https://placehold.co/100x100.png`,
      ownerId: uid,
      memberIds: [uid],
      lookingForPlayers: false,
      recruitingRoles: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/teams');

    return { success: true, message: '¡Equipo creado con éxito!', teamId: newTeamRef.id };
  } catch (error: any) {
    console.error('Error al crear el equipo:', error);
    if (error.code === 'auth/id-token-expired') {
        return { success: false, message: 'La sesión ha expirado. Por favor, inicia sesión de nuevo.' };
    }
    return { success: false, message: 'No se pudo crear el equipo. Por favor, inténtalo de nuevo.' };
  }
}
