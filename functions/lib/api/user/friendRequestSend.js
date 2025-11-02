"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRequestSend = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
require("../../lib/admin");
exports.friendRequestSend = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { targetUid } = (req.data ?? {});
    if (!targetUid)
        throw new https_1.HttpsError("invalid-argument", "targetUid requerido.");
    if (targetUid === req.auth.uid)
        throw new https_1.HttpsError("failed-precondition", "No puedes auto-agregarte.");
    const db = (0, firestore_1.getFirestore)();
    // bloqueos
    const blockA = await db.collection("blocks").doc(targetUid).collection("list").doc(req.auth.uid).get();
    if (blockA.exists)
        throw new https_1.HttpsError("permission-denied", "El usuario te bloqueó.");
    // ya son amigos?
    const [a, b] = await Promise.all([
        db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).get(),
        db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).get(),
    ]);
    const yaAmigos = (a.exists && a.get("status") === "accepted") ||
        (b.exists && b.get("status") === "accepted");
    if (yaAmigos)
        return { success: true, message: "Ya son amigos." };
    const now = Date.now();
    await Promise.all([
        db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).set({ status: "pending", createdAt: now }, { merge: true }),
        db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).set({ status: "pending", createdAt: now }, { merge: true }),
    ]);
    return { success: true };
});
//# sourceMappingURL=friendRequestSend.js.map