import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized only once.
function initializeAdminApp(): admin.app.App {
  // Check if the default app is already initialized
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // The private key must have newlines correctly escaped in the .env file.
    // The replace function handles the common case where they are stored as '\\n'.
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as ServiceAccount;

  // A more robust check to ensure all parts of the service account are present.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Firebase Admin credentials check failed inside initializeAdminApp:');
    console.error('  - FIREBASE_ADMIN_PROJECT_ID:', serviceAccount.projectId ? 'FOUND' : 'MISSING');
    console.error('  - FIREBASE_ADMIN_CLIENT_EMAIL:', serviceAccount.clientEmail ? 'FOUND' : 'MISSING');
    console.error('  - FIREBASE_ADMIN_PRIVATE_KEY:', serviceAccount.privateKey ? 'FOUND' : 'MISSING');
    
    throw new Error(
      '❌ Firebase Admin credentials are missing or incomplete. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are all set in your .env file.'
    );
  }

  // Initialize the app
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// A lazy-loaded function to get the admin instances.
// This prevents initialization issues on module load by only initializing when called.
export function getAdminInstances() {
  const adminApp = initializeAdminApp();
  return {
    adminAuth: adminApp.auth(),
    adminDb: adminApp.firestore(),
  };
}
