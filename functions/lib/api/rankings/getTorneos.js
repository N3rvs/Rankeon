"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clasificacionesGetTorneos = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const Input = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    pageSize: zod_1.z.number().int().min(1).max(50).default(20),
    // opcional: solo finalizados
    onlyFinished: zod_1.z.boolean().optional()
});
exports.clasificacionesGetTorneos = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    try {
        const { cursor, pageSize, onlyFinished } = Input.parse(req.data ?? {});
        const db = (0, firestore_1.getFirestore)();
        let q = db.collection("tournaments")
            // ajusta si tu modelo usa "elo" o "rating"
            .orderBy("rating", "desc")
            .orderBy(firestore_1.FieldPath.documentId(), "desc")
            .limit(pageSize);
        if (onlyFinished)
            q = q.where("status", "==", "finished");
        if (cursor) {
            const cur = await db.collection("tournaments").doc(cursor).get();
            if (cur.exists)
                q = q.startAfter(cur);
        }
        const res = await q.get();
        const tournaments = res.docs.map(d => {
            const x = d.data();
            return {
                id: d.id,
                name: x.name ?? "",
                game: x.game ?? null,
                rating: x.rating ?? x.elo ?? 0,
                participants: x.participants ?? x.participantsCount ?? 0,
                startDate: x.startDate ?? null,
                status: x.status ?? null,
                createdAt: x.createdAt ?? null,
                updatedAt: x.updatedAt ?? null,
            };
        });
        const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;
        return { tournaments, nextCursor };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", e?.message ?? "Unexpected error");
    }
});
//# sourceMappingURL=getTorneos.js.map