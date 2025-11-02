"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboxAdd = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const notifTypes = ["FRIEND_REQUEST", "FRIEND_ACCEPTED", "MESSAGE", "SYSTEM"];
const Input = zod_1.z.object({
    to: zod_1.z.string().min(1),
    type: zod_1.z.enum(notifTypes),
    extraData: zod_1.z.record(zod_1.z.any()).optional()
});
exports.inboxAdd = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { to, type, extraData } = Input.parse(req.data ?? {});
    const from = req.auth.uid;
    if (from === to)
        throw new https_1.HttpsError("failed-precondition", "No puedes notificarte a ti mismo.");
    const db = (0, firestore_1.getFirestore)();
    // ¿el destinatario me bloqueó?
    const blocked = await db.collection("blocks").doc(to).collection("list").doc(from).get();
    if (blocked.exists)
        throw new https_1.HttpsError("permission-denied", "El receptor te tiene bloqueado.");
    const ref = db.collection("notifications").doc(to).collection("items").doc();
    await ref.set({
        id: ref.id,
        to,
        from,
        type,
        extraData: extraData ?? {},
        createdAt: Date.now(),
        read: false
    });
    return { ok: true, id: ref.id };
});
//# sourceMappingURL=inboxAdd.js.map