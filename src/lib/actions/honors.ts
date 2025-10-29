'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';

type ActionResponse = { 
    success: boolean; 
    message: string;
    id?: string;
};

// Ensure this type matches the one used in your components
export type HonorType = 'great_teammate' | 'leader' | 'good_communicator' | 'positive_attitude' | 'bad_behavior';

const functions = getFunctions(app, 'europe-west1');

/**
 * Gives an honor from the current user to a target user.
 * @param recipientId The UID of the user to receive the honor.
 * @param honorType The type of honor to give.
 */
export async function giveHonorToUser(
  recipientId: string,
  honorType: HonorType
): Promise<ActionResponse> {
  try {
    const giveHonor = httpsCallable<{ to: string; type: HonorType }, ActionResponse>(functions, 'giveHonor');
    const response = await giveHonor({ to: recipientId, type: honorType });
    return response.data;
  } catch (error: any) {
    console.error('Error giving honor:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

/**
 * Revokes the current user's given honor from a target user.
 * @param recipientId The UID of the user from whom to revoke the honor.
 */
export async function revokeHonorFromUser(
  recipientId: string
): Promise<ActionResponse> {
  try {
    // The backend `revokeHonor` function may only need the target `honorId`.
    // The client-side action here simplifies by just taking the recipient ID,
    // assuming the backend can look up the specific honor to revoke based on giver/receiver.
    // If the backend needs more specifics, this payload would need adjustment.
    const revokeHonor = httpsCallable<{ to: string }, ActionResponse>(functions, 'revokeHonor');
    const response = await revokeHonor({ to: recipientId });
    return response.data;
  } catch (error: any) {
    console.error('Error revoking honor:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
