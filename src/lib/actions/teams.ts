'use client';

import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

const CreateTeamSchema = z.object({
  name: z.string().min(3, { message: 'El nombre del equipo debe tener al menos 3 caracteres.' }).max(50),
  game: z.string().min(1, { message: 'Por favor, introduce un juego.' }),
  description: z.string().max(300).optional(),
});

type CreateTeamValues = z.infer<typeof CreateTeamSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
  teamId?: string;
};

const functions = getFunctions(app);

export async function createTeam(
  values: CreateTeamValues,
): Promise<ActionResponse> {
  try {
    const validatedFields = CreateTeamSchema.safeParse(values);
    if (!validatedFields.success) {
      const errorMessages = validatedFields.error.errors.map(e => e.message).join(', ');
      return { success: false, message: `Datos de formulario inválidos: ${errorMessages}` };
    }

    const createTeamFunc = httpsCallable<CreateTeamValues, ActionResponse>(functions, 'createTeam');
    const result = await createTeamFunc(validatedFields.data);
    
    return result.data;

  } catch (error: any) {
    console.error('Error al llamar la función createTeam:', error);
    return { success: false, message: error.message || 'No se pudo crear el equipo. Por favor, inténtalo de nuevo.' };
  }
}

export async function deleteTeam(teamId: string): Promise<ActionResponse> {
    try {
        const deleteTeamFunc = httpsCallable(functions, 'deleteTeam');
        const result = await deleteTeamFunc({ teamId });
        return result.data as ActionResponse;
    } catch (error: any) {
        console.error('Error al llamar la función deleteTeam:', error);
        return { success: false, message: error.message || 'No se pudo eliminar el equipo.' };
    }
}

export async function kickUserFromTeam(
  teamId: string,
  targetUid: string
): Promise<ActionResponse> {
  try {
    const kickUserFunc = httpsCallable<
      { teamId: string; targetUid: string },
      ActionResponse
    >(functions, 'kickUserFromTeam');
    const result = await kickUserFunc({ teamId, targetUid });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error al llamar la función kickUserFromTeam:', error);
    return { success: false, message: error.message || 'No se pudo expulsar al usuario.' };
  }
}

export async function changeUserRole(
  teamId: string,
  targetUid: string,
  newRole: 'member' | 'coach'
): Promise<ActionResponse> {
  try {
    const changeRoleFunc = httpsCallable(functions, 'changeUserRole');
    const result = await changeRoleFunc({ teamId, targetUid, newRole });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error al llamar la función changeUserRole:', error);
    return {
      success: false,
      message: error.message || 'No se pudo cambiar el rol.',
    };
  }
}
