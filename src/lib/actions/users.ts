'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserRole } from '../types';

const functions = getFunctions(app);

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function updateUserRole({
  uid,
  role,
}: {
  uid: string;
  role: UserRole;
}): Promise<ActionResponse> {
  try {
    const updateUserRoleFunc = httpsCallable(functions, 'updateUserRole');
    const result = await updateUserRoleFunc({ uid, role });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function updateUserStatus({
  uid,
  disabled,
}: {
  uid: string;
  disabled: boolean;
}): Promise<ActionResponse> {
  try {
    const updateUserStatusFunc = httpsCallable(functions, 'updateUserStatus');
    const result = await updateUserStatusFunc({ uid, disabled });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function updateUserCertification({
  uid,
  isCertified,
}: {
  uid: string;
  isCertified: boolean;
}): Promise<ActionResponse> {
  try {
    const updateUserCertificationFunc = httpsCallable(functions, 'updateUserCertification');
    const result = await updateUserCertificationFunc({ uid, isCertified });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error updating user certification:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
