
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

// Initialize the app only if it hasn't been initialized yet.
// This module-level check prevents re-initialization errors in development
// due to Next.js hot-reloading.
if (!admin.apps.length) {
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
    
    adminAuth = adminApp.auth();
    adminDb = adminApp.firestore();
} else {
    // If the app is already initialized, just get the instances.
    const adminApp = admin.apps[0]!;
    adminAuth = adminApp.auth();
    adminDb = adminApp.firestore();
}

// This function can now simply return the cached instances.
export function getAdminInstances() {
    return { adminAuth, adminDb };
}
