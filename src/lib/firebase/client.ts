'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// ⬇️ CAMBIO: usa initializeFirestore en vez de getFirestore
import { initializeFirestore /* , memoryLocalCache */ } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
  type AppCheck,
} from 'firebase/app-check';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ------------------------------------
// Config
// ------------------------------------
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseURL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  (projectId ? `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app` : undefined);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL,
};

// ------------------------------------
// App + SDKs
// ------------------------------------
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// ⬇️ CAMBIO: inicialización “robusta” (evita el assert)
//    Si persiste, prueba la línea comentada con memoryLocalCache()
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  // localCache: memoryLocalCache(), // <- prueba temporal si aún falla
});

export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// ------------------------------------
// App Check (reCAPTCHA v3)
// ------------------------------------
let _appCheckStarted = false;
let _appCheckInstance: AppCheck | null = null;

export function ensureAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (_appCheckStarted) return _appCheckInstance;

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
      process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN; // <- fijo, sin "|| true"
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  if (!siteKey) {
    console.warn('[AppCheck] Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
    return null;
  }

  _appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  _appCheckStarted = true;
  return _appCheckInstance;
}

export async function ensureAppCheckToken(forceRefresh = false): Promise<string | null> {
  const ac = ensureAppCheck();
  if (!ac) return null;
  try {
    const { token } = await getToken(ac, forceRefresh);
    return token ?? null;
  } catch {
    return null;
  }
}

// Auto-inicio en navegador
ensureAppCheck();

// ------------------------------------
// Functions (EU)
// ------------------------------------
export function getFunctionsEU() {
  return getFunctions(app, 'europe-west1');
}

export function callable<I = unknown, O = unknown>(name: string) {
  const fn = httpsCallable<I, O>(getFunctionsEU(), name);
  return async (data: I) => {
    await ensureAppCheckToken(); // evita carreras
    return fn(data);
  };
}
