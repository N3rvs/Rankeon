// src/api/user/rtdbPresenceMirror.ts
import { onValueWritten } from "firebase-functions/v2/database";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";

if (!getApps().length) initializeApp();

export const rtdbPresenceMirror = onValueWritten(
  {
    ref: "/presence/{uid}",
    region: "europe-west1",
    // NOMBRE EXACTO de tu instancia RTDB:
    // en tu consola se ve como: squadup-mvp-default-rtdb.europe-west1.firebasedatabase.app
    // el "instance" es la parte antes del dominio:
    instance: "squadup-mvp-default-rtdb",
  },
  async (event) => {
    const { uid } = event.params as { uid: string };
    const status = event.data?.after?.val(); // online/offline, timestamp, etc.
    const db = getFirestore();
    await db.doc(`userStatus/${uid}`).set(
      {
        rtdbStatus: status ?? null,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }
);
