"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userListFriendsWithProfiles = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const Input = zod_1.z.object({ cursor: zod_1.z.string().optional(), pageSize: zod_1.z.number().int().min(1).max(50).default(100) });
exports.userListFriendsWithProfiles = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { cursor, pageSize } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const base = db.collection("friends").doc(req.auth.uid).collection("list");
    let q = base.where("status", "==", "accepted")
        .orderBy("createdAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(pageSize);
    if (cursor) {
        const cur = await base.doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const snap = await q.get();
    const ids = snap.docs.map(d => d.id);
    const userRefs = ids.map(id => db.collection("users").doc(id));
    const users = userRefs.length ? await db.getAll(...userRefs) : [];
    const profiles = users.filter(s => s.exists).map(s => {
        const u = s.data();
        return {
            id: s.id,
            name: u.displayName ?? u.name ?? "",
            avatarUrl: u.photoURL ?? u.avatarUrl ?? null,
            country: u.country ?? null,
            presence: u.presence ?? "offline",
            createdAt: u.createdAt ?? null,
        };
    });
    const nextCursor = snap.size === pageSize ? snap.docs[snap.docs.length - 1].id : null;
    return { profiles, nextCursor };
});
//# sourceMappingURL=getFriendProfiles.js.map