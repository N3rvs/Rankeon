"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboxList = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const Input = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    pageSize: zod_1.z.number().int().min(1).max(50).default(20)
});
exports.inboxList = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { cursor, pageSize } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const base = db.collection("notifications").doc(req.auth.uid).collection("items");
    let q = base.orderBy("createdAt", "desc").orderBy(firestore_1.FieldPath.documentId(), "desc").limit(pageSize);
    if (cursor) {
        const cur = await base.doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    const items = res.docs.map(d => ({ id: d.id, ...d.data() }));
    const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;
    return { items, nextCursor };
});
//# sourceMappingURL=inboxList.js.map