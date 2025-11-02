// functions/src/_bootstrap.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp(); // credenciales implícitas en Cloud Functions
}

getFirestore().settings({ ignoreUndefinedProperties: true });
// sin exports: es solo para efectos secundarios
