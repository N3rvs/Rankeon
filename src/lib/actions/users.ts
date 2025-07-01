'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
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
