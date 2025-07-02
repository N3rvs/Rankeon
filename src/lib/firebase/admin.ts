import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

// Prevent re-initialization
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_ADMIN_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_ADMIN_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY');
    throw new Error(`Missing Firebase Admin environment variables: ${missing.join(', ')}`);
  }

  const serviceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  const adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
  });

  adminAuth = adminApp.auth();
  adminDb = adminApp.firestore();
} else {
  const adminApp = admin.apps[0]!;
  adminAuth = adminApp.auth();
  adminDb = adminApp.firestore();
}

export function getAdminInstances() {
  return { adminAuth, adminDb };
}
