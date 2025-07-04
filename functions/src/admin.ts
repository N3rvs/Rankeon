import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

export const grantFirstAdminRole = onCall(async ({ auth: requestAuth }) => {
    if (!requestAuth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const uid = requestAuth.uid;

    try {
        const listUsersResult = await auth.listUsers(1000);
        const existingAdmin = listUsersResult.users.find(
            (user) => user.customClaims?.role === 'admin'
        );

        if (existingAdmin) {
            throw new HttpsError('already-exists', 'An admin user already exists. This action can only be performed once.');
        }

        await auth.setCustomUserClaims(uid, { role: 'admin' });
        await db.collection('users').doc(uid).update({ role: 'admin' });

        return { success: true, message: 'Admin role assigned successfully. Please sign out and sign back in to apply the changes.' };
    } catch (error: any) {
        console.error('Error in grantFirstAdminRole:', error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', `An unexpected error occurred: ${error.message}`);
    }
});
