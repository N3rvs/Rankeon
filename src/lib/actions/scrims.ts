
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app);

type ActionResponse = {
  success: boolean;
  message: string;
  scrimId?: string;
};

export const CreateScrimSchema = z.object({
  teamId: z.string(),
  date: z.date({ required_error: 'Please select a date.' }),
  format: z.enum(['bo1', 'bo3', 'bo5'], { required_error: 'Please select a format.' }),
  type: z.enum(['scrim', 'tryout'], { required_error: 'Please select a type.' }),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters.').optional(),
});
export type CreateScrimData = z.infer<typeof CreateScrimSchema>;

export async function createScrimAction(values: CreateScrimData): Promise<ActionResponse> {
  try {
    const validatedData = CreateScrimSchema.omit({ teamId: true }).safeParse(values);
    if (!validatedData.success) {
      return { success: false, message: "Invalid form data." };
    }
    const dataToSend = {
      ...validatedData.data,
      teamId: values.teamId,
      date: values.date.toISOString(),
    };
    const createScrimFunc = httpsCallable(functions, 'createScrim');
    const result = await createScrimFunc(dataToSend);
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error creating scrim:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function acceptScrimAction(scrimId: string, acceptingTeamId: string): Promise<ActionResponse> {
  try {
    const acceptScrimFunc = httpsCallable(functions, 'acceptScrim');
    const result = await acceptScrimFunc({ scrimId, acceptingTeamId });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error accepting scrim:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function cancelScrimAction(scrimId: string): Promise<ActionResponse> {
  try {
    const cancelScrimFunc = httpsCallable(functions, 'cancelScrim');
    const result = await cancelScrimFunc({ scrimId });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error canceling scrim:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
