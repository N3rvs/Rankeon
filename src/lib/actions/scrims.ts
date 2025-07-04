// src/lib/actions/scrims.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app);

const CreateScrimSchema = z.object({
  teamId: z.string().min(1, 'You must select a team.'),
  date: z.date(),
  format: z.enum(['bo1', 'bo3', 'bo5']),
  type: z.enum(['scrim', 'tryout']),
  notes: z.string().max(200).optional(),
});

export type CreateScrimData = z.infer<typeof CreateScrimSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
  scrimId?: string;
};

export async function createScrim(values: CreateScrimData): Promise<ActionResponse> {
  try {
    const validatedFields = CreateScrimSchema.safeParse(values);
    if (!validatedFields.success) {
      return { success: false, message: 'Invalid form data.' };
    }
    
    const dataToSend = {
      ...validatedFields.data,
      date: validatedFields.data.date.toISOString(),
    };
    
    const createScrimFunc = httpsCallable(functions, 'createScrim');
    const result = await createScrimFunc(dataToSend);
    
    return (result.data as ActionResponse) || { success: true, message: 'Scrim created.'};
  } catch (error: any) {
    console.error('Error creating scrim:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function acceptScrim(scrimId: string, acceptingTeamId: string): Promise<ActionResponse> {
    try {
        const acceptScrimFunc = httpsCallable(functions, 'acceptScrim');
        const result = await acceptScrimFunc({ scrimId, acceptingTeamId });
        return (result.data as ActionResponse) || { success: true, message: 'Scrim accepted.'};
    } catch (error: any) {
        console.error('Error accepting scrim:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function cancelScrim(scrimId: string): Promise<ActionResponse> {
    try {
        const cancelScrimFunc = httpsCallable(functions, 'cancelScrim');
        const result = await cancelScrimFunc({ scrimId });
        return (result.data as ActionResponse) || { success: true, message: 'Scrim cancelled.'};
    } catch (error: any) {
        console.error('Error cancelling scrim:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}