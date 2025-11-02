"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userListPlayers = void 0;
const zod_1 = require("zod");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
require("../../lib/admin");
const Filters = zod_1.z.object({
    q: zod_1.z.string().max(64).optional(),
    country: zod_1.z.string().length(2).optional(),
    region: zod_1.z.string().max(8).optional(),
    rankMin: zod_1.z.number().int().optional(),
    rankMax: zod_1.z.number().int().optional(),
    role: zod_1.z.string().optional(), // busca jugadores que tengan este rol
    pageSize: zod_1.z.number().int().min(1).max(50).default(10),
    cursor: zod_1.z.object({ createdAt: zod_1.z.number(), id: zod_1.z.string() }).optional()
});
exports.userListPlayers = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const f = Filters.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    let q = db.collection("users")
        .where("isLookingForTeam", "==", true);
    if (f.country)
        q = q.where("country", "==", f.country);
    if (f.region)
        q = q.where("region", "==", f.region);
    if (f.rankMin !== undefined)
        q = q.where("rank", ">=", f.rankMin);
    if (f.rankMax !== undefined)
        q = q.where("rank", "<=", f.rankMax);
    if (f.role)
        q = q.where("gameRoles", "array-contains", f.role);
    q = q.orderBy("createdAt", "desc").orderBy("__name__", "desc");
    if (f.cursor)
        q = q.startAfter(f.cursor.createdAt, f.cursor.id);
    const snap = await q.limit(f.pageSize).get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (f.q) {
        const term = f.q.toLowerCase();
        items = items.filter((u) => (u.displayName_lc ?? u.displayName?.toLowerCase() ?? "").startsWith(term));
    }
    // <- fix sin .at()
    const last = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    const nextCursor = last ? { createdAt: last.get("createdAt"), id: last.id } : null;
    return { items, nextCursor };
});
//# sourceMappingURL=userListPlayers.js.map