// src/lib/actions/scrims.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { app } from '../firebase/client';

const functions = getFunctions(app, "europe-west1");

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
  rankMin: z.string().optional(),
  rankMax: z.string().optional(),
  notes: z.string().max(100, "Notes cannot exceed 100 characters.").optional(),
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

export async function challengeScrimAction(scrimId: string, challengingTeamId: string): Promise<ActionResponse> {
  try {
    const challengeScrimFunc = httpsCallable(functions, 'challengeScrim');
    const result = await challengeScrimFunc({ scrimId, challengingTeamId });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error challenging scrim:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function respondToScrimChallengeAction(scrimId: string, accept: boolean): Promise<ActionResponse> {
    try {
        const respondFunc = httpsCallable(functions, 'respondToScrimChallenge');
        const result = await respondFunc({ scrimId, accept });
        return result.data as ActionResponse;
    } catch (error: any) {
        console.error('Error responding to scrim challenge:', error);
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

export async function reportScrimResultAction(scrimId: string, winnerId: string): Promise<ActionResponse> {
    try {
        const reportResultFunc = httpsCallable(functions, 'reportScrimResult');
        const result = await reportResultFunc({ scrimId, winnerId });
        return result.data as ActionResponse;
    } catch (error: any) {
        console.error('Error reporting scrim result:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
