'use server';

import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '../types';

export async function updateUserRole({
  uid,
  role,
}: {
  uid: string;
  role: string;
}): Promise<{ success: boolean; message: string }> {
  const validRoles: UserRole[] = ['admin', 'moderator', 'founder', 'coach', 'player'];

  if (!uid || !role || !validRoles.includes(role as UserRole)) {
    return { success: false, message: 'Invalid arguments.' };
  }
  
  try {
    const { adminAuth, adminDb } = getAdminInstances();
    const userToUpdate = await adminAuth.getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role });
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true });

    revalidatePath('/profile'); // Invalidate cache for the profile page
    revalidatePath('/admin');
    
    return { success: true, message: `Role "${role}" assigned to user ${uid}` };
  } catch (error: any) {
    console.error('❌ Error updating role:', error);
    return { success: false, message: `Failed to update role: ${error.message}` };
  }
}

export async function updateUserStatus({
  uid,
  disabled,
}: {
  uid: string;
  disabled: boolean;
}): Promise<{ success: boolean; message: string }> {
  if (!uid) {
    return { success: false, message: 'User ID is required.' };
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();
    
    await adminAuth.updateUser(uid, { disabled });
    await adminDb.collection('users').doc(uid).update({ disabled });

    revalidatePath('/admin');

    return {
      success: true,
      message: `User ${disabled ? 'banned' : 'unbanned'} successfully.`,
    };
  } catch (error: any) {
    console.error('❌ Error updating user status:', error);
    return { success: false, message: `Failed to update user status: ${error.message}` };
  }
}

export async function updateUserCertification({
  uid,
  isCertified,
}: {
  uid: string;
  isCertified: boolean;
}): Promise<{ success: boolean; message: string }> {
  if (!uid) {
    return { success: false, message: 'User ID is required.' };
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();
    const userToUpdate = await adminAuth.getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
    await adminDb.collection('users').doc(uid).update({ isCertifiedStreamer: isCertified });

    revalidatePath('/admin');
    
    return {
      success: true,
      message: `User certification status updated successfully.`,
    };
  } catch (error: any) {
    console.error('❌ Error updating user certification:', error);
    return { success: false, message: `Failed to update certification: ${error.message}` };
  }
}
