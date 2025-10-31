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
  // Mocking not_friends status. In a real scenario, this would call a backend function.
  // This is a placeholder since the corresponding backend function doesn't exist.
  return Promise.resolve({
    success: true,
    data: { status: 'not_friends' },
    message: 'Status mocked as not_friends.',
  });
}

export async function sendFriendRequest(
  targetUid: string
): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'friendRequestSend');
    const result = await func({ targetUid });
    return (result.data as ActionResponse) || { success: true, message: 'Friend request sent.' };
  } catch (error: any) {
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
      const func = httpsCallable(functions, 'friendRequestRespond');
      const result = await func({ requesterUid, accept });
      return (result.data as ActionResponse) || { success: true, message: `Request ${accept ? 'accepted' : 'rejected'}.` };
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}


export async function removeFriend(targetUid: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'friendRemove');
    const result = await func({ targetUid });
    return (result.data as ActionResponse) || { success: true, message: 'Friend removed.' };
  } catch (error: any) {
    console.error('Error removing friend:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function blockUser(targetUid: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'friendBlock');
    await func({ targetUid, block: true });
    return { success: true, message: 'User blocked.' };
  } catch (error: any) {
    console.error('Error blocking user:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function unblockUser(targetUid: string): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'friendBlock');
    await func({ targetUid, block: false });
    return { success: true, message: 'User unblocked.' };
  } catch (error: any) {
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
      'userListFriendsWithProfiles'
    );
    const result = await func();
    const profiles = (result.data.profiles || []).map((p) => ({
      ...p,
      createdAt: p.createdAt ? Timestamp.fromDate(new Date(p.createdAt)) : undefined,
    }));
    return {
      success: true,
      data: profiles as UserProfile[],
      message: 'Friends fetched.',
    };
  } catch (error: any) {
    console.error('Error getting friends:', error);
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      const permissionError = new FirestorePermissionError({
        path: '/friends/{userId}/list',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
