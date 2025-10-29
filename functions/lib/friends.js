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
exports.listFriendRequests = exports.listFriends = exports.removeFriend = exports.cancelFriendRequest = exports.respondToFriendRequest = exports.sendFriendRequest = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const PAGE_SIZE = 20;
// ---------- Helpers ----------
function assertAuth(ctx) {
    if (!ctx.auth)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
function pairId(a, b) {
    return [a, b].sort().join('_');
}
// ---------- Schemas ----------
const SendFriendSchema = zod_1.z.object({ to: zod_1.z.string().min(1) });
const RespondSchema = zod_1.z.object({ userId: zod_1.z.string().min(1), accept: zod_1.z.boolean() });
const CancelSchema = zod_1.z.object({ userId: zod_1.z.string().min(1) });
const RemoveSchema = zod_1.z.object({ userId: zod_1.z.string().min(1) });
const ListCursorSchema = zod_1.z.object({ cursor: zod_1.z.string().optional() });
// ---------- Enviar solicitud ----------
exports.sendFriendRequest = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { to } = SendFriendSchema.parse(req.data);
    if (uid === to)
        throw new https_1.HttpsError('failed-precondition', 'Cannot add yourself.');
    const frRef = db.doc(`friendRequests/${pairId(uid, to)}`);
    const fsRef = db.doc(`friendships/${pairId(uid, to)}`);
    await db.runTransaction(async (tx) => {
        const [fr, fs] = await Promise.all([tx.get(frRef), tx.get(fsRef)]);
        if (fs.exists)
            throw new https_1.HttpsError('already-exists', 'Already friends.');
        if (!fr.exists) {
            tx.set(frRef, {
                from: uid,
                to,
                status: 'PENDING',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        const s = fr.data().status;
        // Idempotencia: si sigue pendiente, no hagas nada.
        if (s === 'PENDING')
            return;
        // Si estaba REJECTED o CANCELLED o REMOVED, reabrir como PENDING desde uid->to
        tx.update(frRef, {
            from: uid,
            to,
            status: 'PENDING',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
// ---------- Responder solicitud (solo destinatario) ----------
exports.respondToFriendRequest = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId, accept } = RespondSchema.parse(req.data);
    const frRef = db.doc(`friendRequests/${pairId(uid, userId)}`);
    const fsRef = db.doc(`friendships/${pairId(uid, userId)}`);
    await db.runTransaction(async (tx) => {
        const fr = await tx.get(frRef);
        if (!fr.exists)
            throw new https_1.HttpsError('not-found', 'Request not found');
        const data = fr.data();
        if (data.status !== 'PENDING')
            return; // idempotente
        // Solo el destinatario real puede aceptar/rechazar
        if (data.to !== uid) {
            throw new https_1.HttpsError('permission-denied', 'Only the recipient can respond to this request.');
        }
        if (!accept) {
            tx.update(frRef, {
                status: 'REJECTED',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        tx.set(fsRef, {
            users: [data.from, data.to],
            since: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(frRef, {
            status: 'ACCEPTED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
// ---------- Cancelar solicitud (solo el remitente mientras está PENDING) ----------
exports.cancelFriendRequest = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId } = CancelSchema.parse(req.data);
    const frRef = db.doc(`friendRequests/${pairId(uid, userId)}`);
    await db.runTransaction(async (tx) => {
        const fr = await tx.get(frRef);
        if (!fr.exists)
            return; // idempotente: nada que cancelar
        const data = fr.data();
        if (data.status !== 'PENDING')
            return; // ya no está pendiente
        if (data.from !== uid) {
            throw new https_1.HttpsError('permission-denied', 'Only the sender can cancel the request.');
        }
        tx.update(frRef, {
            status: 'CANCELLED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
// ---------- Eliminar amistad (cualquiera de los dos) ----------
exports.removeFriend = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId } = RemoveSchema.parse(req.data);
    const fsRef = db.doc(`friendships/${pairId(uid, userId)}`);
    const frRef = db.doc(`friendRequests/${pairId(uid, userId)}`);
    await db.runTransaction(async (tx) => {
        const fs = await tx.get(fsRef);
        const fr = await tx.get(frRef);
        // Si no hay friendship, no es error: idempotente
        if (fs.exists)
            tx.delete(fsRef);
        // Opcional: marca la última request como REMOVED para histórico
        if (fr.exists) {
            const s = fr.data().status;
            if (s === 'ACCEPTED') {
                tx.update(frRef, {
                    status: 'REMOVED',
                    removedBy: uid,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    });
    return { ok: true };
});
// ---------- Listar amigos ----------
exports.listFriends = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { cursor } = ListCursorSchema.parse(req.data ?? {});
    let q = db
        .collection('friendships')
        .where('users', 'array-contains', uid)
        .orderBy('since', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
        .limit(PAGE_SIZE);
    if (cursor) {
        const cur = await db.collection('friendships').doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    const items = res.docs.map((d) => ({ id: d.id, ...d.data() }));
    return {
        items,
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
// ---------- Listar solicitudes (entrantes / salientes) ----------
exports.listFriendRequests = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { direction, cursor } = zod_1.z
        .object({
        direction: zod_1.z.enum(['incoming', 'outgoing']).default('incoming'),
        cursor: zod_1.z.string().optional(),
    })
        .parse(req.data ?? {});
    let q = db
        .collection('friendRequests')
        .where(direction === 'incoming' ? 'to' : 'from', '==', uid)
        .orderBy('createdAt', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
        .limit(PAGE_SIZE);
    if (cursor) {
        const cur = await db.collection('friendRequests').doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    const items = res.docs.map((d) => ({ id: d.id, ...d.data() }));
    return {
        items,
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
//# sourceMappingURL=friends.js.map