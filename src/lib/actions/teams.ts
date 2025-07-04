// src/lib/actions/teams.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app);

// Schema for creating a team
export const CreateTeamSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50),
  game: z.string().min(1, 'El juego es obligatorio.'),
  description: z.string().max(500, 'La descripción es muy larga.').optional(),
});
export type CreateTeamData = z.infer<typeof CreateTeamSchema>;

// Schema for updating a team
export const UpdateTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.').max(50),
  description: z.string().max(500, 'La descripción es muy larga.').optional(),
  lookingForPlayers: z.boolean(),
});
export type UpdateTeamData = z.infer<typeof UpdateTeamSchema>;

// Schema for deleting a team
const DeleteTeamSchema = z.object({
  teamId: z.string().min(1, "Se requiere el ID del equipo."),
});

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

export async function updateTeam(values: UpdateTeamData): Promise<ActionResponse> {
  try {
    const validatedFields = UpdateTeamSchema.safeParse(values);
    if (!validatedFields.success) {
      return { success: false, message: 'Datos de actualización no válidos.' };
    }

    const updateTeamFunc = httpsCallable<UpdateTeamData, ActionResponse>(functions, 'updateTeam');
    const result = await updateTeamFunc(validatedFields.data);
    
    return result.data;
  } catch (error: any) {
    console.error('Error al llamar a la función updateTeam:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function deleteTeam(values: { teamId: string }): Promise<ActionResponse> {
    try {
        const validatedFields = DeleteTeamSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'ID de equipo no válido.' };
        }

        const deleteTeamFunc = httpsCallable(functions, 'deleteTeam');
        const result = await deleteTeamFunc(validatedFields.data);

        return result.data as ActionResponse;
    } catch (error: any) {
        console.error('Error al llamar a la función deleteTeam:', error);
        return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
    }
}
