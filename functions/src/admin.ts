
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

export const grantFirstAdminRole = onCall(async ({ auth: requestAuth }) => {
    if (!requestAuth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const uid = requestAuth.uid;
    const configRef = db.doc('_metadata/app_config');

    try {
        await db.runTransaction(async (transaction) => {
            const configDoc = await transaction.get(configRef);
            if (configDoc.exists && configDoc.data()?.firstAdminGranted) {
                throw new HttpsError('already-exists', 'An admin user already exists. This action can only be performed once.');
            }
            // Mark that the admin role has been granted, so this can't run again.
            transaction.set(configRef, { firstAdminGranted: true, grantedAt: admin.firestore.FieldValue.serverTimestamp() });
        });

        // If the transaction succeeded, proceed to grant the role.
        // Step 1: Set the secure custom claim. This is the source of truth for permissions.
        await auth.setCustomUserClaims(uid, { role: 'admin' });
        // Step 2: Update the user's document in Firestore for client-side display.
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
