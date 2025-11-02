"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboxMarkRead = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const Input = zod_1.z.object({ ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(100) });
exports.inboxMarkRead = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { ids } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const base = db.collection("notifications").doc(req.auth.uid).collection("items");
    const snaps = await db.getAll(...ids.map(id => base.doc(id)));
    const batch = db.batch();
    snaps.forEach(s => { if (s.exists)
        batch.update(s.ref, { read: true, readAt: Date.now() }); });
    await batch.commit();
    return { ok: true };
});
//# sourceMappingURL=inboxMarkRead.js.map