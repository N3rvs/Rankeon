// src/lib/actions/notifications.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app);

export async function markAllAsRead(
  notificationIds: string[]
): Promise<ActionResponse> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to mark as read.' };
  }
  
  try {
    const markFunc = httpsCallable(functions, 'markNotificationsAsRead');
    const result = await markFunc({ notificationIds });
    return (result.data as ActionResponse);
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
    const clearFunc = httpsCallable(functions, 'clearNotifications');
    const result = await clearFunc({ notificationIds });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error clearing notification history:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
