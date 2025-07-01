import * as admin from 'firebase-admin';

export function getAdminInstances() {
  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Firebase Admin credentials are not set in the .env file or are incomplete. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are all present.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
  }

  return {
    adminAuth: admin.auth(),
    adminDb: admin.firestore(),
  };
}
