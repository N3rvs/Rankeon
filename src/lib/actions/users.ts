'use server';

import { getAdminInstances } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '../types';

export async function assignAdminRole({ uid }: { uid: string }): Promise<{ success: boolean; message: string }> {
  if (!uid) {
    return { success: false, message: 'User ID is required.' };
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();
    // Ensure the user exists before trying to set claims
    await adminAuth.getUser(uid);
    
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });
    await adminDb.collection('users').doc(uid).set({ role: 'admin' }, { merge: true });
    
    return {
      success: true,
      message: `Admin role successfully assigned to user ${uid}.`,
    };

  } catch (error: any) {
    console.error('❌ Error in assignAdminRole:', error);
    // The error from getAdminInstances is already descriptive.
    return { success: false, message: `Failed to assign admin role: ${error.message}` };
  }
}

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
    
    return { success: true, message: `Role "${role}" assigned to user ${uid}` };
  } catch (error: any) {
    console.error('❌ Error updating role:', error);
    return { success: false, message: `Failed to update role: ${error.message}` };
  }
}
