"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendBlock = void 0;
// friendBlock.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.friendBlock = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { targetUid, block } = (req.data ?? {});
    if (!targetUid || block === undefined)
        throw new https_1.HttpsError("invalid-argument", "Datos requeridos.");
    const db = (0, firestore_1.getFirestore)();
    const ref = db.collection("blocks").doc(req.auth.uid).collection("list").doc(targetUid);
    if (block) {
        await ref.set({ createdAt: Date.now() });
        // opcional: elimina amistad si existía
        await Promise.all([
            db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).delete(),
            db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).delete(),
        ]);
    }
    else {
        await ref.delete();
    }
    return { success: true };
});
//# sourceMappingURL=friendBlock.js.map