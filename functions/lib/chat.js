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
exports.unblockUser = exports.blockUser = exports.deleteChatHistory = exports.markChatRead = exports.getChatMessages = exports.getChats = exports.sendMessageToFriend = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const FV = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;
const PAGE_SIZE = 20;
// ---------- Helpers ----------
function assertAuth(ctx) {
    if (!ctx.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
function dmPairId(a, b) {
    return [a, b].sort().join('_');
}
async function isBlocked(sender, recipient) {
    const block = await db.doc(`blocks/${recipient}/targets/${sender}`).get();
    return block.exists;
}
// (Opcional) exigir amistad para DM:
const REQUIRE_FRIENDSHIP = false;
async function assertAreFriends(a, b) {
    if (!REQUIRE_FRIENDSHIP)
        return;
    const fid = dmPairId(a, b);
    const fsRef = db.doc(`friendships/${fid}`);
    const fs = await fsRef.get();
    if (!fs.exists)
        throw new https_1.HttpsError('permission-denied', 'You can only DM friends.');
}
// ---------- Schemas ----------
const MessageSchema = zod_1.z.object({
    to: zod_1.z.string().min(1), // receptor del DM
    text: zod_1.z.string().trim().min(1).max(4000), // contenido
    clientId: zod_1.z.string().min(8).max(64), // idempotencia
});
const GetChatsSchema = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
});
const GetMessagesSchema = zod_1.z.object({
    chatId: zod_1.z.string().min(1),
    cursor: zod_1.z.string().optional(),
});
const DeleteChatHistorySchema = zod_1.z.object({
    chatId: zod_1.z.string().min(1),
});
const MarkReadSchema = zod_1.z.object({
    chatId: zod_1.z.string().min(1),
});
const BlockSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
});
// ---------- Enviar DM ----------
exports.sendMessageToFriend = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { to, text, clientId } = MessageSchema.parse(req.data);
    if (uid === to)
        throw new https_1.HttpsError('failed-precondition', 'Cannot DM yourself.');
    if (await isBlocked(uid, to))
        throw new https_1.HttpsError('permission-denied', 'User has blocked you.');
    await assertAreFriends(uid, to);
    const pairId = dmPairId(uid, to);
    const chatRef = db.doc(`chats/${pairId}`);
    const msgsRef = chatRef.collection('messages');
    const idempRef = db.doc(`idempotency/${uid}_dm_${clientId}`);
    await db.runTransaction(async (tx) => {
        const [idoc, cdoc] = await Promise.all([tx.get(idempRef), tx.get(chatRef)]);
        if (idoc.exists)
            return; // ya procesado
        if (!cdoc.exists) {
            tx.set(chatRef, {
                id: pairId,
                type: 'dm',
                members: [uid, to],
                createdAt: Timestamp.now(),
                lastMessageAt: Timestamp.now(),
                lastMessageText: text.slice(0, 200),
                unread: { [to]: 1, [uid]: 0 }, // contador por miembro
                lastReadAt: { [uid]: Timestamp.now() }, // el emisor lo tiene leído
            });
        }
        const msgRef = msgsRef.doc();
        tx.set(msgRef, {
            id: msgRef.id,
            from: uid,
            to,
            text,
            createdAt: Timestamp.now(),
        });
        tx.set(idempRef, { at: Timestamp.now(), msgId: msgRef.id });
        // actualizar metadatos del chat
        tx.set(chatRef, {
            lastMessageAt: Timestamp.now(),
            lastMessageText: text.slice(0, 200),
            // incrementa unread del receptor y asegura mapa
            unread: {
                [to]: FV.increment(1),
                [uid]: 0,
            },
        }, { merge: true });
    });
    return { ok: true };
});
// ---------- Listar chats (con paginación) ----------
exports.getChats = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { cursor } = GetChatsSchema.parse(req.data ?? {});
    let q = db
        .collection('chats')
        .where('members', 'array-contains', uid)
        .orderBy('lastMessageAt', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
        .limit(PAGE_SIZE);
    if (cursor) {
        const cur = await db.collection('chats').doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
// ---------- Obtener mensajes de un chat (paginación) ----------
exports.getChatMessages = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { chatId, cursor } = GetMessagesSchema.parse(req.data ?? {});
    const chatRef = db.doc(`chats/${chatId}`);
    const chat = await chatRef.get();
    if (!chat.exists)
        throw new https_1.HttpsError('not-found', 'Chat not found');
    const members = chat.data()?.members ?? [];
    if (!members.includes(uid))
        throw new https_1.HttpsError('permission-denied', 'Not a member of this chat.');
    let q = chatRef
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
        .limit(PAGE_SIZE);
    if (cursor) {
        const cur = await chatRef.collection('messages').doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
// ---------- Marcar chat como leído ----------
exports.markChatRead = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { chatId } = MarkReadSchema.parse(req.data ?? {});
    const chatRef = db.doc(`chats/${chatId}`);
    const chat = await chatRef.get();
    if (!chat.exists)
        throw new https_1.HttpsError('not-found', 'Chat not found');
    const data = chat.data();
    const members = data?.members ?? [];
    if (!members.includes(uid))
        throw new https_1.HttpsError('permission-denied', 'Not a member.');
    await chatRef.set({
        unread: { [uid]: 0 },
        lastReadAt: { [uid]: Timestamp.now() },
    }, { merge: true });
    return { ok: true };
});
// ---------- Borrar historial (suave: limpia mensajes + resetea metadatos) ----------
exports.deleteChatHistory = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { chatId } = DeleteChatHistorySchema.parse(req.data);
    const chatRef = db.doc(`chats/${chatId}`);
    const chat = await chatRef.get();
    if (!chat.exists)
        throw new https_1.HttpsError('not-found', 'Chat not found');
    const members = chat.data().members || [];
    if (!members.includes(uid))
        throw new https_1.HttpsError('permission-denied', 'Not a member');
    // Borrado en lotes de mensajes
    const batchSize = 400;
    while (true) {
        const snap = await chatRef.collection('messages').orderBy(admin.firestore.FieldPath.documentId()).limit(batchSize).get();
        if (snap.empty)
            break;
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        if (snap.size < batchSize)
            break;
    }
    // Reset de metadatos del chat (mantiene la sala DM)
    await chatRef.set({
        lastMessageText: null,
        lastMessageAt: Timestamp.now(),
        unread: members.reduce((acc, m) => ((acc[m] = 0), acc), {}),
        lastReadAt: members.reduce((acc, m) => ((acc[m] = Timestamp.now()), acc), {}),
    }, { merge: true });
    return { ok: true };
});
// ---------- Bloquear / Desbloquear ----------
exports.blockUser = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId } = BlockSchema.parse(req.data ?? {});
    if (uid === userId)
        throw new https_1.HttpsError('failed-precondition', 'Cannot block yourself.');
    const ref = db.doc(`blocks/${uid}/targets/${userId}`);
    await ref.set({ at: Timestamp.now() });
    return { ok: true };
});
exports.unblockUser = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { userId } = BlockSchema.parse(req.data ?? {});
    const ref = db.doc(`blocks/${uid}/targets/${userId}`);
    await ref.delete();
    return { ok: true };
});
//# sourceMappingURL=chat.js.map