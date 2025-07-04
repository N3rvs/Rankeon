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
