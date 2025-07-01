import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Check if the credentials are all present.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    // This provides a much clearer error message.
    throw new Error('Firebase Admin credentials are not set in the .env file or are incomplete. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are all present.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
