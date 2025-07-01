// src/lib/actions/notifications.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/lib/firebase/client';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, 'europe-west1');

// This action is special because it needs the current user's ID, but is called from a client component.
// We get the UID via a hook inside the calling component and pass it here.
export async function markAllAsRead(
  notificationIds: string[]
): Promise<ActionResponse> {
  // We can't use useAuth() here directly, so the UID must be passed in.
  // The component calling this will get the UID.
  // This is a placeholder for the logic inside the component.
  const userId = auth.currentUser?.uid;
  if (!userId) {
     return { success: false, message: 'User not authenticated.' };
  }

  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to mark as read.' };
  }

  try {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, 'inbox', userId, 'notifications');
    notificationIds.forEach((id) => {
      batch.update(doc(notificationsRef, id), { read: true });
    });
    await batch.commit();

    return { success: true, message: 'Notifications marked as read.' };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function clearNotificationHistory(
  notificationIds: string[]
): Promise<ActionResponse> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to clear.' };
  }
  try {
    const clearFunc = httpsCallable(functions, 'deleteInboxNotification');
    const deletePromises = notificationIds.map((id) =>
      clearFunc({ notificationId: id })
    );
    await Promise.all(deletePromises);
    return { success: true, message: 'Notification history cleared.' };
  } catch (error: any) {
    console.error('Error clearing notification history:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
