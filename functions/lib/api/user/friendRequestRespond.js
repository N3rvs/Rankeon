"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRequestRespond = void 0;
// friendRequestRespond.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.friendRequestRespond = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { requesterUid, accept } = (req.data ?? {});
    if (!requesterUid || accept === undefined)
        throw new https_1.HttpsError("invalid-argument", "Datos requeridos.");
    const db = (0, firestore_1.getFirestore)();
    const myDoc = await db.collection("friends").doc(req.auth.uid).collection("list").doc(requesterUid).get();
    if (!myDoc.exists || myDoc.get("status") !== "pending")
        throw new https_1.HttpsError("failed-precondition", "No hay solicitud.");
    const status = accept ? "accepted" : undefined;
    const batch = db.batch();
    if (accept) {
        batch.set(db.collection("friends").doc(req.auth.uid).collection("list").doc(requesterUid), { status, createdAt: Date.now() }, { merge: true });
        batch.set(db.collection("friends").doc(requesterUid).collection("list").doc(req.auth.uid), { status, createdAt: Date.now() }, { merge: true });
    }
    else {
        batch.delete(db.collection("friends").doc(req.auth.uid).collection("list").doc(requesterUid));
        batch.delete(db.collection("friends").doc(requesterUid).collection("list").doc(req.auth.uid));
    }
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=friendRequestRespond.js.map