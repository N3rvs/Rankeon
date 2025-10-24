
// src/lib/actions/notifications.ts
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

type ActionResponse = {
  success: boolean;
  message: string;
};
const functions = getFunctions(app, 'europe-west1');

export async function markNotificationsAsRead(
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
    console.error('Error marking notifications as read:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function deleteNotifications(
  notificationIds: string[]
): Promise<ActionResponse> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to delete.' };
  }
  try {
    const deleteFunc = httpsCallable(functions, 'deleteNotifications');
    const result = await deleteFunc({ notificationIds });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error deleting notifications:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}

export async function clearAllNotifications(): Promise<ActionResponse> {
  try {
    const clearFunc = httpsCallable(functions, 'clearAllNotifications');
    const result = await clearFunc();
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error clearing all notifications:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.',
    };
  }
}
