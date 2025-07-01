'use server';
/**
 * @fileOverview A one-time server action to grant admin privileges to a user.
 *
 * - grantAdminRole - A function that assigns the 'admin' role to a specific user.
 * - GrantAdminRoleInput - The input type for the grantAdminRole function.
 * - GrantAdminRoleOutput - The return type for the grantAdminRole function.
 */

import { getAdminInstances } from '@/lib/firebase/admin-sdk';
import { z } from 'zod';

const GrantAdminRoleInputSchema = z.object({
  uid: z.string().describe('The UID of the user to make an admin.'),
});
export type GrantAdminRoleInput = z.infer<typeof GrantAdminRoleInputSchema>;

const GrantAdminRoleOutputSchema = z.object({
  message: z.string(),
});
export type GrantAdminRoleOutput = z.infer<typeof GrantAdminRoleOutputSchema>;

export async function grantAdminRole(input: GrantAdminRoleInput): Promise<GrantAdminRoleOutput> {
  // Directly implement the logic here as a standard Server Action
  // This avoids potential context issues with Genkit flows and environment variables
  const { uid } = GrantAdminRoleInputSchema.parse(input);

  try {
    const { adminAuth, adminDb } = getAdminInstances();
    const user = await adminAuth.getUser(uid);
    const existingClaims = user.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role: 'admin' });
    await adminDb.collection("users").doc(uid).set({ role: 'admin' }, { merge: true });

    return { message: `Successfully assigned 'admin' role to user ${uid}` };
  } catch (error: any) {
    console.error("Error granting admin role:", error);
    throw new Error(`Failed to assign admin role: ${error.message}`);
  }
}
