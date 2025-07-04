import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

export function getAdminInstances() {
  // Prevent re-initialization by checking if an app is already initialized.
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      '\n'
    );

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_ADMIN_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_ADMIN_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY');
      throw new Error(
        `Missing Firebase Admin environment variables: ${missing.join(', ')}`
      );
    }

    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey,
    } as ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // Return instances from the default app.
  const adminAuth = admin.auth();
  const adminDb = admin.firestore();

  return { adminAuth, adminDb };
}
