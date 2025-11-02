"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clasificacionesGetScrims = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const Input = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    pageSize: zod_1.z.number().int().min(1).max(50).default(20),
});
exports.clasificacionesGetScrims = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    try {
        const { cursor, pageSize } = Input.parse(req.data ?? {});
        const db = (0, firestore_1.getFirestore)();
        let q = db.collection("teams")
            .orderBy("elo", "desc")
            .orderBy(firestore_1.FieldPath.documentId(), "desc")
            .limit(pageSize);
        if (cursor) {
            const cur = await db.collection("teams").doc(cursor).get();
            if (cur.exists)
                q = q.startAfter(cur);
        }
        const res = await q.get();
        const rankings = res.docs.map(d => {
            const x = d.data();
            const played = Number(x.scrimsPlayed ?? x.played ?? 0);
            const won = Number(x.scrimsWon ?? x.won ?? 0);
            const winRate = played > 0 ? won / played : 0;
            return {
                id: d.id,
                name: x.name ?? "",
                logoUrl: x.logoUrl ?? null,
                elo: x.elo ?? 0,
                played, won, winRate,
                createdAt: x.createdAt ?? null,
                updatedAt: x.updatedAt ?? null,
            };
        });
        const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;
        return { rankings, nextCursor };
    }
    catch (e) {
        throw new https_1.HttpsError("internal", e?.message ?? "Unexpected error");
    }
});
//# sourceMappingURL=getScrims.js.map