'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/client';
import type { UserProfile, UserRole, UserStatus } from '../types';
import { Timestamp } from 'firebase/firestore';

const functions = getFunctions(app, "europe-west1");

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
    const func = httpsCallable<{uid: string; role: UserRole}, ActionResponse>(functions, 'setGlobalRole');
    const result = await func({ uid, role });
    return result.data;
  } catch (error: any) {
    console.error('Error al actualizar el rol del usuario:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function updateUserStatus({
  uid,
  disabled,
  duration,
}: {
  uid: string;
  disabled: boolean;
  duration?: number;
}): Promise<ActionResponse> {
  try {
    const func = httpsCallable(functions, 'adminUpdateUserStatus');
    const result = await func({ uid, disabled, duration });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error al actualizar el estado del usuario:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
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
    const func = httpsCallable(functions, 'updateUserCertification');
    const result = await func({ uid, isCertified });
    return result.data as ActionResponse;
  } catch (error: any) {
    console.error('Error al actualizar la certificación del usuario:', error);
    return { success: false, message: error.message || 'Ocurrió un error inesperado.' };
  }
}



export async function updateUserPresence(status: UserStatus): Promise<ActionResponse> {
  try {
    const func = httpsCallable<{status: UserStatus}, ActionResponse>(functions, 'updateUserPresence');
    const result = await func({ status });
    return result.data;
  } catch (error: any) {
    console.error('Error updating user presence:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getManagedUsers(): Promise<{ success: boolean; data?: UserProfile[]; message: string }> {
  try {
    const fn = httpsCallable<void, { users: any[] }>(functions, 'getManagedUsers');
    const { data } = await fn();
    const users = data.users.map((u: any) => ({
      ...u,
      createdAt: u.createdAt ? Timestamp.fromDate(new Date(u.createdAt)) : undefined,
      banUntil: u.banUntil ? Timestamp.fromDate(new Date(u.banUntil)) : undefined,
      _claimsRefreshedAt: u._claimsRefreshedAt ? Timestamp.fromDate(new Date(u._claimsRefreshedAt)) : undefined,
    }));
    return { success: true, data: users as UserProfile[], message: 'Users fetched.' };
  } catch (error: any) {
    console.error('Error getting managed users:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
