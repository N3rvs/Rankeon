'use server';

import { getAdminInstances } from '@/lib/firebase/admin';

export async function grantAdminRole({
  uid,
}: {
  uid: string;
}): Promise<{ success: boolean; message: string }> {
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
    console.error('❌ Error granting admin role:', error);
    return {
      success: false,
      message: `Failed to assign admin role: ${error.message}`,
    };
  }
}
