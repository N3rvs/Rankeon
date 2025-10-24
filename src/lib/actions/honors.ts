// src/lib/actions/honors.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, 'europe-west1');

export async function giveHonorToUser(
  recipientId: string,
  honorType: string
): Promise<ActionResponse> {
  try {
    const giveHonorFunc = httpsCallable(functions, 'giveHonor');
    const result = await giveHonorFunc({ recipientId, honorType });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error giving honor:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function revokeHonorFromUser(
  recipientId: string
): Promise<ActionResponse> {
  try {
    const revokeHonorFunc = httpsCallable(functions, 'revokeHonor');
    const result = await revokeHonorFunc({ recipientId });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error revoking honor:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
