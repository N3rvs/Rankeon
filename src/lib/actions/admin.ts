'use server';
/**
 * @fileOverview Server actions for administrative tasks.
 *
 * - grantAdminRole - A function that assigns the 'admin' role to a specific user.
 */

import { getAdminInstances } from '@/lib/firebase/admin';

interface GrantAdminRoleInput {
  uid: string;
}

interface GrantAdminRoleOutput {
  message: string;
}

export async function grantAdminRole(input: GrantAdminRoleInput): Promise<GrantAdminRoleOutput> {
  const { uid } = input;

  if (!uid) {
    // This case should not be reached if called from the UI, but it's good practice.
    throw new Error('User ID was not provided.');
  }

  try {
    const { adminAuth, adminDb } = getAdminInstances();
    const user = await adminAuth.getUser(uid);
    const existingClaims = user.customClaims || {};

    // Set the custom claim and update the user's role in Firestore
    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role: 'admin' });
    await adminDb.collection("users").doc(uid).set({ role: 'admin' }, { merge: true });

    return { message: `Successfully assigned 'admin' role to user ${uid}` };
  } catch (error: any) {
    console.error("Error granting admin role:", error);
    // Re-throw the error with a more context-specific message.
    throw new Error(`Failed to assign admin role: ${error.message}`);
  }
}
