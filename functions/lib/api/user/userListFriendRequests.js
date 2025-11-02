"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userListFriendRequests = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const Input = zod_1.z.object({
    direction: zod_1.z.enum(["incoming", "outgoing"]).default("incoming"),
    cursor: zod_1.z.string().optional(),
    pageSize: zod_1.z.number().int().min(1).max(50).default(20),
});
exports.userListFriendRequests = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { direction, cursor, pageSize } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    // En nuestro modelo, ambas vistas leen de /friends/{uid}/list
    // Para distinguir incoming/outgoing puedes guardar un campo "fromUid" cuando creas el pending.
    const base = db.collection("friends").doc(req.auth.uid).collection("list");
    let q = base.where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(pageSize);
    if (cursor) {
        const cur = await base.doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const snap = await q.get();
    // Filtra en memoria por dirección si guardas { fromUid }
    const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(it => direction === "incoming" ? it.fromUid !== req.auth.uid : it.fromUid === req.auth.uid);
    const nextCursor = snap.size === pageSize ? snap.docs[snap.docs.length - 1].id : null;
    return { items, nextCursor };
});
//# sourceMappingURL=userListFriendRequests.js.map