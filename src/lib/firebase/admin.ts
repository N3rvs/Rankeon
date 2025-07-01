import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This function will be called from within Server Actions or API routes to ensure lazy initialization.
export function getAdminInstances() {
    if (admin.apps.length > 0 && admin.apps[0]) {
        const adminApp = admin.apps[0];
        return { adminAuth: adminApp.auth(), adminDb: adminApp.firestore() };
    }

    const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // The private key must be properly formatted. In .env, it should be enclosed in quotes.
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        console.error('Firebase Admin credentials missing from environment variables.');
        console.error('FIREBASE_ADMIN_PROJECT_ID:', process.env.FIREBASE_ADMIN_PROJECT_ID ? 'Loaded' : 'Missing');
        console.error('FIREBASE_ADMIN_CLIENT_EMAIL:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'Loaded' : 'Missing');
        console.error('FIREBASE_ADMIN_PRIVATE_KEY:', process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 'Loaded' : 'Missing');
        
        throw new Error(
            'Firebase Admin credentials are not set correctly. Please check server logs and your environment variables.'
        );
    }
    
    const adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    return { adminAuth: adminApp.auth(), adminDb: adminApp.firestore() };
}
