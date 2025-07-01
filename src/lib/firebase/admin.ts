import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

/**
 * A singleton instance of the Firebase Admin app.
 * This prevents re-initialization on every server-side render in development.
 */
let adminApp: admin.app.App;

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 * This function is designed to be called "lazily" when admin instances are first needed.
 * It reads credentials from environment variables.
 * @returns The initialized Firebase Admin app instance.
 */
function initializeAdminApp(): admin.app.App {
  // This check prevents re-initializing the app on every hot-reload
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // The .replace() call is crucial for handling the private key when stored in a .env file.
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // This check is critical. If any of these are missing, initialization will fail.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      'Firebase Admin credentials are not set correctly. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are defined in your .env file.'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Provides access to Firebase Admin services (Auth, Firestore).
 * It ensures the SDK is initialized before returning the instances.
 * This is the single entry point for accessing admin services.
 */
export function getAdminInstances() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return {
    adminAuth: adminApp.auth(),
    adminDb: adminApp.firestore(),
  };
}
