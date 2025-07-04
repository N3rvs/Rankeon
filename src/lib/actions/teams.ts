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

export async function createTeam(
  values: CreateTeamValues,
): Promise<ActionResponse> {
  const functions = getFunctions(app);
  try {
    const validatedFields = CreateTeamSchema.safeParse(values);
    if (!validatedFields.success) {
      const errorMessages = validatedFields.error.errors.map(e => e.message).join(', ');
      return { success: false, message: `Invalid form data: ${errorMessages}` };
    }

    const createTeamFunc = httpsCallable<CreateTeamValues, ActionResponse>(functions, 'createTeam');
    const result = await createTeamFunc(validatedFields.data);
    
    return result.data;

  } catch (error: any) {
    console.error('Error calling createTeam function:', error);
    return { success: false, message: error.message || 'Could not create team. Please try again.' };
  }
}

export async function kickUserFromTeam(
  teamId: string,
  targetUid: string
): Promise<ActionResponse> {
  const functions = getFunctions(app);
  try {
    const kickUserFunc = httpsCallable<
      { teamId: string; targetUid: string },
      ActionResponse
    >(functions, 'kickUserFromTeam');
    const result = await kickUserFunc({ teamId, targetUid });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error calling kickUserFromTeam function:', error);
    return { success: false, message: error.message || 'Could not kick user.' };
  }
}

export async function changeUserRole(
  teamId: string,
  targetUid: string,
  newRole: 'member' | 'coach'
): Promise<ActionResponse> {
  const functions = getFunctions(app);
  try {
    const changeRoleFunc = httpsCallable(functions, 'changeUserRole');
    const result = await changeRoleFunc({ teamId, targetUid, newRole });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error calling changeUserRole function:', error);
    return {
      success: false,
      message: error.message || 'Could not change role.',
    };
  }
}
