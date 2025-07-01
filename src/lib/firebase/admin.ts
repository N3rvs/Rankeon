import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This function will be called from within Server Actions to ensure lazy initialization.
export function getAdminInstances() {
    if (admin.apps.length > 0 && admin.apps[0]) {
        const adminApp = admin.apps[0];
        return { adminAuth: adminApp.auth(), adminDb: adminApp.firestore() };
    }

    const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error(
            'Firebase Admin credentials are not set correctly. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are defined in your .env file.'
        );
    }
    
    const adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    return { adminAuth: adminApp.auth(), adminDb: adminApp.firestore() };
}
