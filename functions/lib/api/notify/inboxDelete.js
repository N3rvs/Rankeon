"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboxDelete = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const _options_1 = require("../_options");
const db = (0, firestore_1.getFirestore)();
const Input = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(100),
});
exports.inboxDelete = (0, https_1.onCall)(_options_1.w4, async (req) => {
    // auth requerida
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const { ids } = Input.parse(req.data ?? {});
    // Trae todos los docs y borra solo los que pertenecen al usuario
    const snaps = await db.getAll(...ids.map((id) => db.doc(`notifications/${id}`)));
    const batch = db.batch();
    for (const s of snaps) {
        if (!s.exists)
            continue;
        const to = s.data()?.to;
        if (to === uid)
            batch.delete(s.ref);
    }
    await batch.commit();
    return { success: true, message: "Notificaciones eliminadas." };
});
//# sourceMappingURL=inboxDelete.js.map