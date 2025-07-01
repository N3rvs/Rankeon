// src/lib/actions/messages.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminInstances } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type { UserProfile } from '../types';

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

export async function deleteMessage({
  conversationId,
  messageId,
}: {
  conversationId: string;
  messageId: string;
}): Promise<ActionResponse> {
  try {
    const { uid } = await getCurrentUser();
    const { adminDb } = getAdminInstances();

    const messageRef = adminDb.doc(
      `conversations/${conversationId}/messages/${messageId}`
    );
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return { success: false, message: 'Message not found.' };
    }

    if (messageDoc.data()?.senderId !== uid) {
      return {
        success: false,
        message: 'You can only delete your own messages.',
      };
    }

    // Delete the message
    await messageRef.delete();

    // Check if the deleted message was the conversation's last message
    const conversationRef = adminDb.doc(`conversations/${conversationId}`);
    const conversationDoc = await conversationRef.get();
    const conversationData = conversationDoc.data();

    if (conversationData?.lastMessage?.id === messageId) {
      // Find the new latest message to update the conversation preview
      const messagesQuery = conversationRef
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(1);
      const latestMessagesSnap = await messagesQuery.get();

      let newLastMessage = null;
      if (!latestMessagesSnap.empty) {
        const latestMessageDoc = latestMessagesSnap.docs[0];
        const latestMessageData = latestMessageDoc.data();
        newLastMessage = {
          id: latestMessageDoc.id,
          text: latestMessageData.text,
          senderId: latestMessageData.senderId,
          timestamp: latestMessageData.timestamp,
        };
      }
      
      await conversationRef.update({ lastMessage: newLastMessage });
    }
    
    revalidatePath(`/messages`);
    return { success: true, message: 'Message deleted.' };
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
