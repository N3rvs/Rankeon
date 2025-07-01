// src/lib/actions/admin.ts
'use server';

import { getAdminInstances } from '@/lib/firebase/admin';

export async function grantAdminRole({ uid }: { uid: string }) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();

    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    await adminDb.collection('users').doc(uid).set(
      { role: 'admin' },
      { merge: true }
    );

    return {
      message: `Admin role successfully assigned to user ${uid}.`,
    };
  } catch (error: any) {
    console.error('❌ Error granting admin role:', error);
    throw new Error(`Failed to assign admin role: ${error.message}`);
  }
}
