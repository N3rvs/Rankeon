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
exports.unblockUser = exports.blockUser = exports.getInbox = exports.deleteNotifications = exports.markNotificationsAsRead = exports.addInboxNotification = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const PAGE_SIZE = 20;
const notifTypes = ['FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'MESSAGE', 'SYSTEM'];
function assertAuth(ctx) { if (!ctx.auth)
    throw new https_1.HttpsError('unauthenticated', 'You must be logged in.'); return ctx.auth.uid; }
const AddNotifSchema = zod_1.z.object({ to: zod_1.z.string().min(1), type: zod_1.z.enum(notifTypes), extraData: zod_1.z.record(zod_1.z.any()).optional() });
exports.addInboxNotification = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { to, type, extraData } = AddNotifSchema.parse(req.data);
    if (await db.doc(`blocks/${to}/targets/${uid}`).get().then(d => d.exists))
        throw new https_1.HttpsError('permission-denied', 'Recipient blocks you');
    const doc = db.collection('notifications').doc();
    await doc.set({ to, from: uid, type, extraData: extraData ?? {}, createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false });
    return { ok: true };
});
exports.markNotificationsAsRead = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { ids } = zod_1.z.object({ ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(100) }).parse(req.data);
    const snaps = await db.getAll(...ids.map(id => db.doc(`notifications/${id}`)));
    const batch = db.batch();
    snaps.forEach(s => { if (s.exists && s.data().to === uid)
        batch.update(s.ref, { read: true, readAt: admin.firestore.FieldValue.serverTimestamp() }); });
    await batch.commit();
    return { ok: true };
});
exports.deleteNotifications = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { ids } = zod_1.z.object({ ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(100) }).parse(req.data);
    const snaps = await db.getAll(...ids.map(id => db.doc(`notifications/${id}`)));
    const batch = db.batch();
    snaps.forEach(s => { if (s.exists && s.data().to === uid)
        batch.delete(s.ref); });
    await batch.commit();
    return { ok: true };
});
exports.getInbox = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { cursor } = zod_1.z.object({ cursor: zod_1.z.string().optional() }).parse(req.data ?? {});
    let q = db.collection('notifications').where('to', '==', uid).orderBy('createdAt', 'desc').orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(PAGE_SIZE);
    if (cursor) {
        const cur = await db.collection('notifications').doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return { items: res.docs.map(d => ({ id: d.id, ...d.data() })), nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null };
});
exports.blockUser = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId } = zod_1.z.object({ userId: zod_1.z.string().min(1) }).parse(req.data);
    await db.doc(`blocks/${uid}/targets/${userId}`).set({ by: uid, target: userId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true };
});
exports.unblockUser = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId } = zod_1.z.object({ userId: zod_1.z.string().min(1) }).parse(req.data);
    await db.doc(`blocks/${uid}/targets/${userId}`).delete();
    return { ok: true };
});
//# sourceMappingURL=notifications.js.map