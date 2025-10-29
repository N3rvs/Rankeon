"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHonorRankings = exports.revokeHonor = exports.giveHonor = void 0;
// functions/src/honors.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const PAGE_SIZE = 20;
// ---------- helpers ----------
function assertAuth(ctx) {
    if (!ctx.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
const toISO = (v) => {
    if (!v)
        return null;
    if (typeof v?.toDate === 'function')
        return v.toDate().toISOString();
    if (v instanceof Date)
        return v.toISOString();
    return null;
};
// ---------- schemas ----------
const honorTypes = ['MVP', 'FAIR_PLAY', 'LEADERSHIP'];
const GiveSchema = zod_1.z.object({
    to: zod_1.z.string().min(1),
    type: zod_1.z.enum(honorTypes),
    reason: zod_1.z.string().min(3).max(200).optional(),
});
const RevokeSchema = zod_1.z.object({
    honorId: zod_1.z.string().min(1),
});
const PageInputSchema = zod_1.z.object({
    lastId: zod_1.z.string().nullable().optional(),
});
// ============================================================
// giveHonor
// ============================================================
exports.giveHonor = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const from = assertAuth(req);
    const { to, type, reason } = GiveSchema.parse(req.data ?? {});
    if (from === to)
        throw new https_1.HttpsError('failed-precondition', 'Cannot honor yourself');
    // límite diario: 5 por emisor
    const since = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const given24h = await db
        .collection('honors')
        .where('from', '==', from)
        .where('createdAt', '>=', since)
        .count()
        .get();
    if (given24h.data().count >= 5) {
        throw new https_1.HttpsError('resource-exhausted', 'Daily honor limit reached');
    }
    // crea honor + incrementa agregados en una transacción
    const honorRef = db.collection('honors').doc();
    const userRef = db.doc(`users/${to}`);
    const statRef = db.doc(`honorStats/${to}`);
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists)
            throw new https_1.HttpsError('not-found', 'Recipient user not found');
        tx.set(honorRef, {
            from,
            to,
            type,
            reason: reason ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(statRef, {
            uid: to,
            total: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(userRef, {
            totalHonors: admin.firestore.FieldValue.increment(1),
            _honorUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { id: honorRef.id };
});
// ============================================================
// revokeHonor
// ============================================================
exports.revokeHonor = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { honorId } = RevokeSchema.parse(req.data ?? {});
    const honorRef = db.doc(`honors/${honorId}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(honorRef);
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'Honor not found');
        const data = snap.data();
        if (data.from !== uid)
            throw new https_1.HttpsError('permission-denied', 'Cannot revoke others honors');
        const to = data.to;
        const userRef = db.doc(`users/${to}`);
        const statRef = db.doc(`honorStats/${to}`);
        tx.delete(honorRef);
        tx.set(statRef, {
            uid: to,
            total: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(userRef, {
            totalHonors: admin.firestore.FieldValue.increment(-1),
            _honorUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
});
// ============================================================
/** getHonorRankings
 * Devuelve { rankings, nextLastId } para tu UI.
 * Fuente: honorStats/{uid} (agregado), y se enriquece con datos del perfil.
 */
exports.getHonorRankings = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    try {
        const { lastId } = PageInputSchema.parse(req.data ?? {});
        let q = db
            .collection('honorStats')
            .orderBy('total', 'desc')
            .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
            .limit(PAGE_SIZE);
        if (lastId) {
            const cur = await db.collection('honorStats').doc(lastId).get();
            if (cur.exists)
                q = q.startAfter(cur);
        }
        const res = await q.get();
        // junta perfiles
        const userRefs = res.docs.map((d) => db.doc(`users/${d.id}`));
        const users = userRefs.length ? await db.getAll(...userRefs) : [];
        const userById = new Map(users.filter((s) => s.exists).map((s) => [s.id, s.data()]));
        const rankings = res.docs.map((d) => {
            const stat = d.data();
            const u = userById.get(d.id) ?? {};
            return {
                id: d.id,
                name: u.name ?? u.displayName ?? '',
                avatarUrl: u.avatarUrl ?? u.photoURL ?? null,
                isCertifiedStreamer: !!u.isCertifiedStreamer,
                totalHonors: Number(stat.total ?? u.totalHonors ?? 0),
                createdAt: toISO(u.createdAt),
            };
        });
        const nextLastId = res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null;
        return { rankings, nextLastId };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        console.error('getHonorRankings error:', err);
        throw new https_1.HttpsError('internal', err.message ?? 'Unexpected error');
    }
});
//# sourceMappingURL=honors.js.map