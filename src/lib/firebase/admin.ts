
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This function will be called from within Server Actions or API routes to ensure lazy initialization.
export function getAdminInstances() {
    if (admin.apps.length > 0 && admin.apps[0]) {
        const adminApp = admin.apps[0];
        return { adminAuth: adminApp.auth(), adminDb: adminApp.firestore() };
    }

    const serviceAccount: Partial<ServiceAccount> = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // The private key must be properly formatted. In .env, it should be enclosed in quotes.
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Explicitly check for each required credential and throw a helpful error.
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        const missingKeys = [];
        if (!serviceAccount.projectId) missingKeys.push('FIREBASE_ADMIN_PROJECT_ID');
        if (!serviceAccount.clientEmail) missingKeys.push('FIREBASE_ADMIN_CLIENT_EMAIL');
        if (!serviceAccount.privateKey) missingKeys.push('FIREBASE_ADMIN_PRIVATE_KEY');
        
        throw new Error(
            `Firebase Admin credentials missing. Please add the following keys to your .env file: ${missingKeys.join(', ')}`
        );
    }
    
    const adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });

    return { adminAuth: adminApp.auth(), adminDb: adminApp.firestore() };
}
