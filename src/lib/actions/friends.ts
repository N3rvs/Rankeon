// src/lib/actions/friends.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile } from '../types';
import { Timestamp } from 'firebase/firestore';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

const functions = getFunctions(app, 'europe-west1');

type ActionResponse = {
  success: boolean;
  message: string;
};

export type FriendshipStatus =
  | 'loading'
  | 'not_friends'
  | 'request_sent'
  | 'request_received'
  | 'friends'
  | 'self';

type GetFriendshipStatusResponse = {
  status: FriendshipStatus;
  requestId?: string | null;
};

type FriendshipStatusActionResponse = {
  success: boolean;
  data?: GetFriendshipStatusResponse;
  message: string;
};

export async function getFriendshipStatus(
  targetUserId: string
): Promise<FriendshipStatusActionResponse> {
    try {
        const func = httpsCallable< { targetUserId: string }, GetFriendshipStatusResponse>(functions, 'getFriendshipStatus');
        const result = await func({ targetUserId });
        return { success: true, data: result.data, message: 'Status fetched' };
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'friendships',
                operation: 'get',
            }));
        }
        console.error("Error fetching friendship status:", error);
        return { success: false, message: error.message || 'Could not fetch status.' };
    }
}

export async function sendFriendRequest(
  toUserId: string
): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'sendFriendRequest');
    const result = await func({ toUserId });
    return (result.data as ActionResponse) || { success: true, message: 'Friend request sent.' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'friendRequests',
            operation: 'create',
            requestResourceData: { to: toUserId }
        }));
    }
    console.error('Error sending friend request:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function respondToFriendRequest({
  requesterUid,
  accept,
}: {
  requesterUid: string;
  accept: boolean;
}): Promise<ActionResponse> {
    try {
      const func = httpsCallable(functions, 'respondToFriendRequest');
      // The backend expects `userId` which is the other user's ID
      const result = await func({ userId: requesterUid, accept });
      return (result.data as ActionResponse) || { success: true, message: `Request ${accept ? 'accepted' : 'rejected'}.` };
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `friendships`,
            operation: 'create',
        }));
      }
      console.error('Error responding to friend request:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}


export async function removeFriend(targetUid: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'removeFriend');
    const result = await func({ userId: targetUid });
    return (result.data as ActionResponse) || { success: true, message: 'Friend removed.' };
  } catch (error: any) {
     if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `friendships`,
            operation: 'delete',
        }));
      }
    console.error('Error removing friend:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function blockUser(targetUid: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'blockUser');
    await func({ userId: targetUid });
    return { success: true, message: 'User blocked.' };
  } catch (error: any) {
     if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `blocks/{uid}/targets/${targetUid}`,
            operation: 'create',
        }));
      }
    console.error('Error blocking user:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function unblockUser(targetUid: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'unblockUser');
    await func({ userId: targetUid });
    return { success: true, message: 'User unblocked.' };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `blocks/{uid}/targets/${targetUid}`,
            operation: 'delete',
        }));
      }
    console.error('Error unblocking user:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getFriends(): Promise<{
  success: boolean;
  data?: UserProfile[];
  message: string;
}> {
  try {
    const func = httpsCallable<void, { profiles: any[], nextCursor: string | null }>(
      functions,
      'getFriendProfiles'
    );
    const result = await func();
    const profiles = (result.data as any).map((p: any) => ({
      ...p,
      createdAt: p.createdAt ? Timestamp.fromDate(new Date(p.createdAt)) : undefined,
    }));
    return {
      success: true,
      data: profiles as UserProfile[],
      message: 'Friends fetched.',
    };
  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'friendships',
        operation: 'list',
      }));
    }
    console.error('Error getting friends:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
