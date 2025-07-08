
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, UserRole, UserStatus } from '../types';
import { Timestamp } from 'firebase/firestore';

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
  duration, // in hours
}: {
  uid: string;
  disabled: boolean;
  duration?: number;
}): Promise<ActionResponse> {
  try {
    const updateUserStatusFunc = httpsCallable(functions, 'updateUserStatus');
    const result = await updateUserStatusFunc({ uid, disabled, duration });
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

export async function updateUserPresence(status: UserStatus): Promise<ActionResponse> {
  try {
    const updateUserPresenceFunc = httpsCallable(functions, 'updateUserPresence');
    const result = await updateUserPresenceFunc({ status });
    return (result.data as ActionResponse);
  } catch (error: any) {
    console.error('Error updating user presence:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getManagedUsers(): Promise<{ success: boolean; data?: UserProfile[]; message: string; }> {
    try {
        const getManagedUsersFunc = httpsCallable<void, any[]>(functions, 'getManagedUsers');
        const result = await getManagedUsersFunc();
        // The function returns Timestamps as ISO strings, we need to convert them back
        const users = result.data.map(u => ({
            ...u,
            createdAt: u.createdAt ? Timestamp.fromDate(new Date(u.createdAt)) : undefined,
            banUntil: u.banUntil ? Timestamp.fromDate(new Date(u.banUntil)) : undefined,
        }));
        return { success: true, data: users as UserProfile[], message: 'Users fetched.' };
    } catch (error: any) {
        console.error('Error getting managed users:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
