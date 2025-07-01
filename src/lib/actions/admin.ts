'use server';

import { getAdminInstances } from '@/lib/firebase/admin';

export async function grantAdminRole({ uid }: { uid: string }) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();
    
    // Set custom claim for role-based access
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    // Also update the user's document in Firestore to keep the data in sync
    await adminDb.collection('users').doc(uid).set({
      role: 'admin'
    }, { merge: true });
    
    return { message: `Admin role successfully assigned to user ${uid}.` };
  } catch (error: any) {
    console.error('Error granting admin role:', error);
    throw new Error(`Failed to assign admin role: ${error.message}`);
  }
}
