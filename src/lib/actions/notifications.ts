// src/lib/actions/notifications.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/lib/firebase/client';
import { doc, writeBatch } from 'firebase/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, 'europe-west1');

export async function markAllAsRead(
  notificationIds: string[],
  userId: string
): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to mark as read.' };
  }

  try {
    const batch = writeBatch(db);
    notificationIds.forEach((id) => {
      const notifRef = doc(db, 'inbox', userId, 'notifications', id);
      batch.update(notifRef, { read: true });
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

export async function clearNotificationHistory(): Promise<ActionResponse> {
  try {
    // This will call the 'clearNotificationHistory' Cloud Function.
    // The function is expected to not take any arguments and use the caller's auth context.
    const clearFunc = httpsCallable(functions, 'clearNotificationHistory');
    await clearFunc();
    return { success: true, message: 'Notification history cleared.' };
  } catch (error: any) {
    console.error('Error clearing notification history:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}