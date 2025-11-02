"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRemove = void 0;
// friendRemove.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
require("../../lib/admin");
exports.friendRemove = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { targetUid } = (req.data ?? {});
    if (!targetUid)
        throw new https_1.HttpsError("invalid-argument", "targetUid requerido.");
    const db = (0, firestore_1.getFirestore)();
    await Promise.all([
        db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).delete(),
        db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).delete(),
    ]);
    return { success: true };
});
//# sourceMappingURL=friendRemove.js.map