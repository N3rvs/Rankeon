'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken as getAppCheckToken,
} from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ---- App Check (solo navegador) ----
if (typeof window !== 'undefined') {
  const isDev = process.env.NODE_ENV !== 'production';
  const debugToken = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN || '';

  // Si definiste FIREBASE_APPCHECK_DEBUG_TOKEN en .env.local, úsalo.
  if (isDev && debugToken) {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  const siteKey =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || 'debug-site-key';

  try {
    const appCheck = initializeAppCheck(app, {
      // En dev, si hay debug token, App Check usará el proveedor de debug
      // (el siteKey no se usa pero debe pasarse un provider igualmente).
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    // (Opcional) Verifica que emite token
    getAppCheckToken(appCheck, true)
      .then((t) => {
        // Quita este log en prod
        console.log('AppCheck token OK (length):', t.token?.length);
      })
      .catch((e) => console.warn('AppCheck token error:', e));
  } catch {
    // ignorar si ya fue inicializado
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
