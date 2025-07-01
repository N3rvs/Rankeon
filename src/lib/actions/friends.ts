// src/lib/actions/friends.ts
'use server';

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { getAdminInstances } from '@/lib/firebase/admin';
import type { UserProfile } from '../types';
import { auth } from '@/lib/firebase/client';
import { headers } from 'next/headers';

type ActionResponse = {
  success: boolean;
  message: string;
};

async function getCurrentUser(): Promise<{
  uid: string;
  profile: UserProfile;
}> {
  const { adminAuth, adminDb } = getAdminInstances();
  const authorization = headers().get('Authorization');
  if (!authorization) throw new Error('User not authenticated.');

  const token = authorization.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  const uid = decodedToken.uid;

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new Error('User profile not found.');

  return { uid, profile: userDoc.data() as UserProfile };
}

export async function sendFriendRequest(
  recipientId: string
): Promise<ActionResponse> {
  try {
    const { uid: fromId, profile: fromProfile } = await getCurrentUser();

    if (fromId === recipientId) {
      return { success: false, message: "You can't send a request to yourself." };
    }

    const { adminDb } = getAdminInstances();
    const recipientDoc = await adminDb.collection('users').doc(recipientId).get();
    if (!recipientDoc.exists) {
      return { success: false, message: 'Recipient user not found.' };
    }
    const recipientProfile = recipientDoc.data() as UserProfile;

    if (fromProfile.friends?.includes(recipientId)) {
      return { success: false, message: 'You are already friends.' };
    }

    // Check for existing pending request
    const requestsRef = adminDb.collection('friend_requests');
    const q = await requestsRef
      .where('participantIds', '==', [fromId, recipientId].sort())
      .where('status', '==', 'pending')
      .get();
      
    if (!q.empty) {
        return { success: false, message: "A friend request is already pending."};
    }

    const batch = adminDb.batch();

    const newRequestRef = requestsRef.doc();
    batch.set(newRequestRef, {
      fromId,
      toId: recipientId,
      participantIds: [fromId, recipientId].sort(),
      fromName: fromProfile.name,
      fromAvatarUrl: fromProfile.avatarUrl,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    const notificationRef = adminDb.collection('notifications').doc();
    batch.set(notificationRef, {
      userId: recipientId,
      type: 'friend_request_received',
      message: `${fromProfile.name} sent you a friend request.`,
      fromUser: {
        id: fromId,
        name: fromProfile.name,
        avatarUrl: fromProfile.avatarUrl,
      },
      relatedRequestId: newRequestRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath('/market');
    return { success: true, message: 'Friend request sent.' };
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function respondToFriendRequest({
  requestId,
  response,
}: {
  requestId: string;
  response: 'accepted' | 'rejected';
}): Promise<ActionResponse> {
  try {
    const { uid: responderId, profile: responderProfile } = await getCurrentUser();
    const { adminDb } = getAdminInstances();

    const requestRef = adminDb.collection('friend_requests').doc(requestId);
    
    await adminDb.runTransaction(async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists) throw new Error('Friend request not found.');

        const requestData = requestDoc.data()!;
        if (requestData.toId !== responderId) throw new Error('You are not authorized to respond to this request.');
        if (requestData.status !== 'pending') throw new Error('This request has already been responded to.');

        transaction.update(requestRef, { status: response });

        if (response === 'accepted') {
            const senderId = requestData.fromId;
            const senderRef = adminDb.collection('users').doc(senderId);
            const responderRef = adminDb.collection('users').doc(responderId);

            transaction.update(senderRef, { friends: arrayUnion(responderId) });
            transaction.update(responderRef, { friends: arrayUnion(senderId) });

            const notificationRef = adminDb.collection('notifications').doc();
            transaction.set(notificationRef, {
                userId: senderId,
                type: 'friend_request_accepted',
                message: `${responderProfile.name} accepted your friend request.`,
                fromUser: {
                    id: responderId,
                    name: responderProfile.name,
                    avatarUrl: responderProfile.avatarUrl,
                },
                read: false,
                createdAt: serverTimestamp(),
            });
        }
    });

    revalidatePath('/inbox');
    revalidatePath('/market');
    return { success: true, message: `Request ${response}.` };
  } catch (error: any) {
    console.error('Error responding to friend request:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function removeFriend(friendId: string): Promise<ActionResponse> {
  try {
    const { uid, profile } = await getCurrentUser();
    const { adminDb } = getAdminInstances();

    const batch = adminDb.batch();

    const currentUserRef = adminDb.collection('users').doc(uid);
    batch.update(currentUserRef, { friends: arrayRemove(friendId) });

    const friendRef = adminDb.collection('users').doc(friendId);
    batch.update(friendRef, { friends: arrayRemove(uid) });

    // Notify the removed friend
    const notificationRef = adminDb.collection('notifications').doc();
    batch.set(notificationRef, {
        userId: friendId,
        type: 'friend_removed',
        message: `${profile.name} removed you from their friends list.`,
        fromUser: {
            id: uid,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
        },
        read: false,
        createdAt: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath('/market');
    return { success: true, message: 'Friend removed.' };
  } catch (error: any) {
    console.error('Error removing friend:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
