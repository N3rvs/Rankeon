// src/lib/actions/friends.ts
// Client-side actions that call Firebase Functions

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile } from '../types';
import { Timestamp } from 'firebase/firestore';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';


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
}

type FriendshipStatusActionResponse = {
    success: boolean;
    data?: GetFriendshipStatusResponse;
    message: string;
}

const functions = getFunctions(app, "europe-west1");


export async function getFriendshipStatus(targetUserId: string): Promise<FriendshipStatusActionResponse> {
  try {
    const getStatusFunc = httpsCallable< { targetUserId: string }, GetFriendshipStatusResponse>(functions, 'getFriendshipStatus');
    const result = await getStatusFunc({ targetUserId });
    return { success: true, data: result.data, message: "Status fetched successfully." };
  } catch (error: any)
  {
    console.error('Error fetching friendship status:', error);
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      const permissionError = new FirestorePermissionError({
        path: `/users/{userId}/friends`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'An unexpected error occurred while fetching friendship status.' };
  }
}

export async function sendFriendRequest(
  recipientId: string
): Promise<ActionResponse> {
  try {
    const sendRequest = httpsCallable(functions, 'sendFriendRequest');
    const result = await sendRequest({ to: recipientId });
    return (result.data as ActionResponse) || { success: true, message: 'Friend request sent.' };
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/friendRequests`,
        operation: 'create',
        requestResourceData: { to: recipientId },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
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
    const result = await respond({ requestId, accept });
    return (result.data as ActionResponse) || { success: true, message: `Request ${accept ? 'accepted' : 'rejected'}.` };
  } catch (error: any) {
    console.error('Error responding to friend request:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/friendRequests/${requestId}`,
        operation: 'update',
        requestResourceData: { accept },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function removeFriend(friendId: string): Promise<ActionResponse> {
  try {
    const remove = httpsCallable(functions, 'removeFriend');
    const result = await remove({ friendUid: friendId });
    return (result.data as ActionResponse) || { success: true, message: 'Friend removed.' };
  } catch (error: any) {
    console.error('Error removing friend:', error);
     if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/users/{userId}`,
        operation: 'update',
        requestResourceData: { friends: { 'array-remove': friendId } },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function blockUser(userId: string): Promise<ActionResponse> {
  try {
    const block = httpsCallable(functions, 'blockUser');
    const result = await block({ blockedUid: userId });
    return (result.data as ActionResponse) || { success: true, message: 'User blocked.' };
  } catch (error: any) {
    console.error('Error blocking user:', error);
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/users/{userId}`,
        operation: 'update',
        requestResourceData: { blocked: { 'array-union': userId } },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function unblockUser(userId: string): Promise<ActionResponse> {
  try {
    const unblock = httpsCallable(functions, 'unblockUser');
    const result = await unblock({ blockedUid: userId });
    return (result.data as ActionResponse) || { success: true, message: 'User unblocked.' };
  } catch (error: any) {
    console.error('Error unblocking user:', error);
     if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: `/users/{userId}`,
        operation: 'update',
        requestResourceData: { blocked: { 'array-remove': userId } },
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function getFriends(): Promise<{ success: boolean; data?: UserProfile[]; message: string }> {
  try {
    const getFriendsFunc = httpsCallable<void, any[]>(functions, 'getFriendProfiles');
    const result = await getFriendsFunc();
    // Deserialize timestamps
    const profiles = result.data.map(p => ({
      ...p,
      createdAt: p.createdAt ? Timestamp.fromDate(new Date(p.createdAt)) : undefined,
      banUntil: p.banUntil ? Timestamp.fromDate(new Date(p.banUntil)) : undefined,
      _claimsRefreshedAt: p._claimsRefreshedAt ? Timestamp.fromDate(new Date(p._claimsRefreshedAt)) : undefined,
    }));
    return { success: true, data: profiles as UserProfile[], message: 'Friends fetched.' };
  } catch (error: any) {
    console.error('Error getting friends:', error);
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      const permissionError = new FirestorePermissionError({
        path: '/users/{userId}/friends',
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
