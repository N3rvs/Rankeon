
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

type ActionResponse = {
  ok: boolean;
  id?: string;
  message?: string;
  success: boolean;
};

export type HonorType =
  | 'MVP'
  | 'FAIR_PLAY'
  | 'LEADERSHIP'
  | 'TOXIC'
  | 'GRIEFING'
  | 'AFK';


const functions = getFunctions(app, 'europe-west1');

export async function giveHonorToUser(
  recipientId: string,
  honorType: string
): Promise<{success: boolean, message: string}> {
  try {
    const giveHonor = httpsCallable<
      { to: string; type: string },
      ActionResponse
    >(functions, 'giveHonor');
    
    const response = await giveHonor({ to: recipientId, type: honorType });

    if (response.data.ok || response.data.success) {
        return { success: true, message: "Honor awarded." };
    }
    return { success: false, message: response.data.message || "Failed to award honor."};

  } catch (error: any) {
    if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'honors',
            operation: 'create',
            requestResourceData: { to: recipientId, type: honorType }
        }));
    }
    console.error('Error giving honor:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function revokeHonorFromUser(
  honorId: string
): Promise<{success: boolean, message: string}> {
  try {
    const revokeHonor = httpsCallable<{ honorId: string }, ActionResponse>(
      functions,
      'revokeHonor'
    );
    
    const response = await revokeHonor({ honorId });
    
    if (response.data.ok || response.data.success) {
        return { success: true, message: "Honor revoked." };
    }
    return { success: false, message: response.data.message || "Failed to revoke honor."};

  } catch (error: any) {
    if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `honors/${honorId}`,
            operation: 'delete',
        }));
    }
    console.error('Error revoking honor:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
