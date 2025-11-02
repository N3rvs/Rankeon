"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rtdbPresenceMirror = void 0;
// src/api/user/rtdbPresenceMirror.ts
const database_1 = require("firebase-functions/v2/database");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
exports.rtdbPresenceMirror = (0, database_1.onValueWritten)({
    ref: "/presence/{uid}",
    region: "europe-west1",
    // NOMBRE EXACTO de tu instancia RTDB:
    // en tu consola se ve como: squadup-mvp-default-rtdb.europe-west1.firebasedatabase.app
    // el "instance" es la parte antes del dominio:
    instance: "squadup-mvp-default-rtdb",
}, async (event) => {
    const { uid } = event.params;
    const status = event.data?.after?.val(); // online/offline, timestamp, etc.
    const db = (0, firestore_1.getFirestore)();
    await db.doc(`userStatus/${uid}`).set({
        rtdbStatus: status ?? null,
        updatedAt: Date.now(),
    }, { merge: true });
});
//# sourceMappingURL=rtdbPresenceMirror.js.map