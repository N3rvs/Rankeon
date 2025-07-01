// src/lib/firebase/admin.ts
'use server';

import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

function initializeAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccount: ServiceAccount = {
    type: 'service_account',
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Admin env vars:', {
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKeySnippet: serviceAccount.privateKey?.slice(0, 10),
    });
    throw new Error('Firebase Admin credentials are not set correctly.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getAdminInstances() {
  const app = initializeAdminApp();
  return {
    adminAuth: app.auth(),
    adminDb: app.firestore(),
  };
}
