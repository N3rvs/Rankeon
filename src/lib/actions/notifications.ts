// src/lib/actions/notifications.ts
'use server';

import { getAdminInstances } from '@/lib/firebase/admin';

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function markAllAsRead(
  notificationIds: string[]
): Promise<ActionResponse> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to mark as read.' };
  }

  try {
    const { adminDb } = getAdminInstances();
    const batch = adminDb.batch();

    notificationIds.forEach((id) => {
      const notifRef = adminDb.collection('notifications').doc(id);
      batch.update(notifRef, { read: true });
    });

    await batch.commit();

    return { success: true, message: 'Notifications marked as read.' };
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
