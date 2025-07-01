// src/lib/actions/notifications.ts
// Client-side utility to mark notifications as read.
import { db } from '@/lib/firebase/client';
import { doc, writeBatch } from 'firebase/firestore';

type ActionResponse = {
  success: boolean;
  message: string;
};

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
      const notifRef = doc(db, 'notifications', id);
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
