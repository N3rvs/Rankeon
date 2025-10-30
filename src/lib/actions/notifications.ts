
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/client';
import { errorEmitter } from '../firebase/error-emitter';
import { FirestorePermissionError } from '../firebase/errors';

type ActionResponse = {
  success: boolean;
  message: string;
};

const functions = getFunctions(app, 'europe-west1');

// Util para mapear respuestas { ok: boolean } del backend a { success, message }
function mapOk(resp: any, okMsg: string): ActionResponse {
  // si el backend devuelve { ok: true }
  if (resp && typeof resp.ok === 'boolean') {
    return { success: !!resp.ok, message: okMsg };
  }
  // si el backend ya devuelve { success, message }
  if (resp && typeof resp.success === 'boolean') {
    return resp as ActionResponse;
  }
  // fallback
  return { success: true, message: okMsg };
}

export async function markNotificationsAsRead(
  notificationIds: string[]
): Promise<ActionResponse> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to mark as read.' };
  }

  try {
    // Backend espera: { ids: string[] }
    const markFunc = httpsCallable<{ ids: string[] }, any>(functions, 'markNotificationsAsRead');
    const { data } = await markFunc({ ids: notificationIds });
    return mapOk(data, 'Notifications marked as read.');
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'notifications',
            operation: 'update',
            requestResourceData: { read: true },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error marking notifications as read:', error);
    return { success: false, message: error?.message || 'An unexpected error occurred.' };
  }
}

export async function deleteNotifications(
  notificationIds: string[]
): Promise<ActionResponse> {
  if (!notificationIds || notificationIds.length === 0) {
    return { success: true, message: 'No notifications to delete.' };
  }

  try {
    // Backend espera: { ids: string[] }
    const deleteFunc = httpsCallable<{ ids: string[] }, any>(functions, 'deleteNotifications');
    const { data } = await deleteFunc({ ids: notificationIds });
    return mapOk(data, 'Notifications deleted.');
  } catch (error: any) {
     if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'notifications',
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    console.error('Error deleting notifications:', error);
    return { success: false, message: error?.message || 'An unexpected error occurred.' };
  }
}

/**
 * clearAllNotifications fue eliminado del proyecto (en deploy lo borraste).
 * Si aún lo usas en UI, puedes:
 *   1) Quitar su uso, o
 *   2) Mantener este “shim” que no llama nada en backend.
 */
export async function clearAllNotifications(): Promise<ActionResponse> {
  return {
    success: false,
    message: 'clearAllNotifications is no longer available on the server.',
  };
}
