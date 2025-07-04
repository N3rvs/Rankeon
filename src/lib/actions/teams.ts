// src/lib/actions/teams.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app);

// Schema for form validation on the client
export const CreateTeamSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50),
  game: z.string().min(1, 'El juego es obligatorio.'),
  description: z.string().max(500, 'La descripción es muy larga.').optional(),
});

export type CreateTeamData = z.infer<typeof CreateTeamSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
  teamId?: string;
};

export async function createTeam(values: CreateTeamData): Promise<ActionResponse> {
  try {
    const validatedFields = CreateTeamSchema.safeParse(values);
    if (!validatedFields.success) {
      return { success: false, message: 'Datos del formulario no válidos.' };
    }

    const createTeamFunc = httpsCallable<CreateTeamData, ActionResponse>(functions, 'createTeam');
    const result = await createTeamFunc(validatedFields.data);
    
    return result.data;
  } catch (error: any) {
    console.error('Error al llamar a la función createTeam:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}
