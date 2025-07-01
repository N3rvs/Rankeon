// src/lib/actions/friends.ts
// Client-side actions that call Firebase Functions

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, 'europe-west1');

export async function sendFriendRequest(
  recipientId: string
): Promise<ActionResponse> {
  try {
    const sendRequest = httpsCallable(functions, 'sendFriendRequest');
    await sendRequest({ to: recipientId });
    return { success: true, message: 'Friend request sent.' };
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function respondToFriendRequest({
  requestId,
  accept,
}: {
  requestId: string;
  accept: boolean;
}): Promise<ActionResponse> {
  try {
    const respond = httpsCallable(functions, 'respondToFriendRequest');
    await respond({ requestId, accept });
    return { success: true, message: `Request ${accept ? 'accepted' : 'rejected'}.` };
  } catch (error: any) {
    console.error('Error responding to friend request:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function removeFriend(friendId: string): Promise<ActionResponse> {
  try {
    const remove = httpsCallable(functions, 'removeFriend');
    await remove({ friendUid: friendId });
    return { success: true, message: 'Friend removed.' };
  } catch (error: any) {
    console.error('Error removing friend:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function blockUser(userId: string): Promise<ActionResponse> {
  try {
    const block = httpsCallable(functions, 'blockUser');
    await block({ blockedUid: userId });
    return { success: true, message: 'User blocked.' };
  } catch (error: any) {
    console.error('Error blocking user:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
