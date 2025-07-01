import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

let adminApp: admin.app.App;

// This check prevents re-initializing the app on every hot-reload
if (admin.apps.length > 0 && admin.apps[0]) {
  adminApp = admin.apps[0];
} else {
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // The .replace() call is crucial for handling the private key when stored in a .env file.
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // This check is critical. If any of these are missing, initialization will fail.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Firebase Admin credentials are not set correctly in .env file.');
    throw new Error(
      'Firebase Admin credentials are not set correctly. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are defined in your .env file.'
    );
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth = adminApp.auth();
export const adminDb = adminApp.firestore();
