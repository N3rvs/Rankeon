'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
// Config desde variables de entorno
// ------------------------------------
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseURL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  (projectId ? `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app` : undefined);
// Nota: ajusta la región del RTDB si tu instancia no es europe-west1.

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
// Singleton de app + SDKs
// ------------------------------------
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// ------------------------------------
// App Check (reCAPTCHA v3)
// ------------------------------------
let _appCheckStarted = false;
let _appCheckInstance: AppCheck | null = null;

/**
 * Arranca App Check en navegador. Idempotente.
 * Devuelve la instancia para poder usar getToken() si hiciera falta.
 */
export function ensureAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (_appCheckStarted) return _appCheckInstance;

  if (process.env.NODE_ENV !== 'production') {
    (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
      process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN ;
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

/**
 * (Opcional) Espera a que exista un token de App Check antes de llamadas críticas.
 * Útil para evitar carreras en el primer render.
 */
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

// Auto-inicio en el navegador
ensureAppCheck();

// ------------------------------------
// Helper de Functions en europe-west1
// ------------------------------------
export function getFunctionsEU() {
  return getFunctions(app, 'europe-west1');
}

/**
 * Helper para callables con región fija.
 * Ejemplo: const getMarketPlayers = callable<'input','output'>('getMarketPlayers');
 */
export function callable<I = unknown, O = unknown>(name: string) {
  const fn = httpsCallable<I, O>(getFunctionsEU(), name);
  return async (data: I) => {
    // (Opcional) asegura token antes de la primera llamada
    await ensureAppCheckToken();
    return fn(data);
  };
}
