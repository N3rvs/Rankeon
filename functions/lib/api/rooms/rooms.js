"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomsListMessages = exports.roomsList = exports.roomsClose = exports.roomsSendMessage = exports.roomsLeave = exports.roomsJoin = exports.roomsCreate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const db = (0, firestore_1.getFirestore)();
const PAGE_SIZE = 50;
function assertAuth(req) {
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    return uid;
}
// ===== Schemas =====
const CreateRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(50),
    game: zod_1.z.string().min(1),
    server: zod_1.z.string().min(1),
    rank: zod_1.z.string().min(1),
    partySize: zod_1.z.string().min(1), // viene como string desde el cliente
});
const JoinSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1),
});
const SendMessageSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1).max(2000),
});
const ListRoomsSchema = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    game: zod_1.z.string().optional(),
    server: zod_1.z.string().optional(),
    rank: zod_1.z.string().optional(),
    ownerOnly: zod_1.z.boolean().optional(), // si true, lista mis salas
});
const ListMessagesSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1),
    cursor: zod_1.z.string().optional(),
});
// Helper: lectura consistente de sala
async function getRoomOrThrow(roomId) {
    const ref = db.doc(`rooms/${roomId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Room not found.");
    return { ref, data: snap.data() };
}
/** createGameRoom
 * Crea sala con el usuario como owner y primer miembro.
 */
exports.roomsCreate = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const input = CreateRoomSchema.parse(req.data ?? {});
    const capacity = Number.parseInt(input.partySize, 10) || 1;
    if (capacity < 1 || capacity > 20) {
        throw new https_1.HttpsError("invalid-argument", "partySize debe estar entre 1 y 20.");
    }
    // Evitar demasiadas salas abiertas por usuario
    const existing = await db
        .collection("rooms")
        .where("ownerId", "==", uid)
        .where("closed", "==", false)
        .count()
        .get();
    if (existing.data().count >= 20) {
        throw new https_1.HttpsError("resource-exhausted", "Límite de salas alcanzado.");
    }
    const ref = db.collection("rooms").doc();
    const now = Date.now();
    await ref.set({
        name: input.name,
        game: input.game,
        server: input.server,
        rank: input.rank,
        capacity,
        ownerId: uid,
        members: [uid],
        closed: false,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
    });
    return { success: true, roomId: ref.id };
});
/** joinRoom
 * Añade al usuario a la sala si hay espacio.
 */
exports.roomsJoin = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { roomId } = JoinSchema.parse(req.data ?? {});
    await db.runTransaction(async (tx) => {
        const ref = db.doc(`rooms/${roomId}`);
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = snap.data();
        if (room.closed)
            throw new https_1.HttpsError("failed-precondition", "Room is closed.");
        const members = room.members ?? [];
        const capacity = room.capacity ?? 1;
        if (members.includes(uid))
            return; // idempotente
        if (members.length >= capacity) {
            throw new https_1.HttpsError("failed-precondition", "Room is full.");
        }
        tx.update(ref, {
            members: firestore_1.FieldValue.arrayUnion(uid),
            updatedAt: Date.now(),
        });
    });
    return { success: true };
});
/** leaveRoom
 * Quita al usuario; si queda vacía, borra la sala y sus mensajes.
 */
exports.roomsLeave = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 60 }, async (req) => {
    const uid = assertAuth(req);
    const { roomId } = JoinSchema.parse(req.data ?? {});
    let becameEmpty = false;
    await db.runTransaction(async (tx) => {
        const ref = db.doc(`rooms/${roomId}`);
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Room not found.");
        const room = snap.data();
        const members = room.members ?? [];
        if (!members.includes(uid))
            return; // idempotente
        const newMembers = members.filter((m) => m !== uid);
        if (newMembers.length === 0) {
            tx.delete(ref);
            becameEmpty = true;
        }
        else {
            const newOwner = room.ownerId === uid ? newMembers[0] : room.ownerId;
            tx.update(ref, {
                members: newMembers,
                ownerId: newOwner,
                updatedAt: Date.now(),
            });
        }
    });
    // Borra subcolección messages si la sala quedó vacía
    if (becameEmpty) {
        const msgsRef = db.collection(`rooms/${roomId}/messages`);
        while (true) {
            const page = await msgsRef.orderBy(firestore_1.FieldPath.documentId()).limit(PAGE_SIZE).get();
            if (page.empty)
                break;
            const b = db.batch();
            page.docs.forEach((d) => b.delete(d.ref));
            await b.commit();
            if (page.size < PAGE_SIZE)
                break;
        }
    }
    return { success: true };
});
/** sendMessageToRoom
 * Sólo miembros pueden enviar. Guarda en rooms/{id}/messages.
 */
exports.roomsSendMessage = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { roomId, content } = SendMessageSchema.parse(req.data ?? {});
    const { ref, data: room } = await getRoomOrThrow(roomId);
    if (room.closed)
        throw new https_1.HttpsError("failed-precondition", "Room is closed.");
    const members = room.members ?? [];
    if (!members.includes(uid)) {
        throw new https_1.HttpsError("permission-denied", "No eres miembro de esta sala.");
    }
    const now = Date.now();
    const msgRef = ref.collection("messages").doc();
    await msgRef.set({
        senderId: uid,
        content,
        createdAt: now,
    });
    await ref.update({
        lastMessageAt: now,
        updatedAt: now,
    });
    return { success: true };
});
/** closeRoom
 * Cierra la sala (solo owner), ya no permite nuevos mensajes ni joins.
 */
exports.roomsClose = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { roomId } = JoinSchema.parse(req.data ?? {});
    const { ref, data: room } = await getRoomOrThrow(roomId);
    if (room.ownerId !== uid)
        throw new https_1.HttpsError("permission-denied", "Solo el owner puede cerrar la sala.");
    if (room.closed)
        return { success: true }; // idempotente
    await ref.update({ closed: true, updatedAt: Date.now() });
    return { success: true };
});
/** listRooms
 * Listado/paginación con filtros simples (game/server/rank) o solo mis salas.
 */
exports.roomsList = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { cursor, game, server, rank, ownerOnly } = ListRoomsSchema.parse(req.data ?? {});
    let q = db
        .collection("rooms")
        .where("closed", "==", false)
        .orderBy("lastMessageAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    if (ownerOnly) {
        q = db
            .collection("rooms")
            .where("ownerId", "==", uid)
            .orderBy("lastMessageAt", "desc")
            .orderBy(firestore_1.FieldPath.documentId(), "desc")
            .limit(PAGE_SIZE);
    }
    if (game)
        q = q.where("game", "==", game);
    if (server)
        q = q.where("server", "==", server);
    if (rank)
        q = q.where("rank", "==", rank);
    if (cursor) {
        const cur = await db.collection("rooms").doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
/** listRoomMessages
 * Paginación de mensajes (desc).
 */
exports.roomsListMessages = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { roomId, cursor } = ListMessagesSchema.parse(req.data ?? {});
    const { ref, data: room } = await getRoomOrThrow(roomId);
    const members = room.members ?? [];
    if (!members.includes(uid))
        throw new https_1.HttpsError("permission-denied", "No eres miembro de esta sala.");
    let q = ref
        .collection("messages")
        .orderBy("createdAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    if (cursor) {
        const cur = await ref.collection("messages").doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
//# sourceMappingURL=rooms.js.map