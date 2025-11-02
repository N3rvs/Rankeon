"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportListMessages = exports.supportListAllTickets = exports.supportListMyTickets = exports.supportResolveTicket = exports.supportRespondTicket = exports.supportCreateTicket = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const db = (0, firestore_1.getFirestore)();
const PAGE_SIZE = 20;
function assertAuth(req) {
    if (!req.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    return req.auth.uid;
}
function isStaffRole(role) {
    return role === "owner" || role === "admin" || role === "moderator" || role === "support";
}
function isStaffReq(req) {
    const role = req.auth?.token?.role;
    return isStaffRole(role);
}
// ===== Schemas =====
const CreateTicketSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1).max(160),
    description: zod_1.z.string().min(10).max(2000),
});
const RespondSchema = zod_1.z.object({
    ticketId: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1).max(4000),
});
const ResolveSchema = zod_1.z.object({
    ticketId: zod_1.z.string().min(1),
});
const ListTicketsSchema = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    status: zod_1.z.enum(["open", "resolved"]).optional(),
});
const ListMessagesSchema = zod_1.z.object({
    ticketId: zod_1.z.string().min(1),
    cursor: zod_1.z.string().optional(),
});
// Colecciones:
// tickets/{ticketId}
//   - { ownerId, subject, description, status, createdAt, updatedAt, lastMessageAt, lastMessageBy }
// tickets/{ticketId}/messages/{messageId}
//   - { authorId, content, createdAt, authorRole }
// ===== Crear ticket =====
exports.supportCreateTicket = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const data = CreateTicketSchema.parse(req.data ?? {});
    const ticketRef = db.collection("tickets").doc();
    const now = Date.now();
    await ticketRef.set({
        ownerId: uid,
        subject: data.subject,
        description: data.description,
        status: "open", // open | resolved
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        lastMessageBy: uid,
    });
    // primer mensaje (para hilo)
    const msgRef = ticketRef.collection("messages").doc();
    await msgRef.set({
        authorId: uid,
        authorRole: "user",
        content: data.description,
        createdAt: now,
    });
    return { success: true, ticketId: ticketRef.id };
});
// ===== Responder ticket =====
exports.supportRespondTicket = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { ticketId, content } = RespondSchema.parse(req.data ?? {});
    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        throw new https_1.HttpsError("not-found", "Ticket no encontrado.");
    const t = tSnap.data();
    const owner = t.ownerId;
    // Permitir responder al owner y al staff
    if (uid !== owner && !isStaffReq(req)) {
        throw new https_1.HttpsError("permission-denied", "No puedes responder este ticket.");
    }
    // Si está resuelto, sólo staff puede reabrir al responder
    if (t.status === "resolved" && !isStaffReq(req)) {
        throw new https_1.HttpsError("failed-precondition", "El ticket está resuelto.");
    }
    const now = Date.now();
    const msgRef = tRef.collection("messages").doc();
    await msgRef.set({
        authorId: uid,
        authorRole: uid === owner ? "user" : "staff",
        content,
        createdAt: now,
    });
    await tRef.update({
        updatedAt: now,
        lastMessageAt: now,
        lastMessageBy: uid,
        status: uid === owner && t.status === "resolved" ? "open" : t.status,
    });
    return { success: true };
});
// ===== Resolver / cerrar ticket =====
exports.supportResolveTicket = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { ticketId } = ResolveSchema.parse(req.data ?? {});
    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        throw new https_1.HttpsError("not-found", "Ticket no encontrado.");
    const t = tSnap.data();
    const owner = t.ownerId;
    // Puede cerrar el owner o el staff
    if (uid !== owner && !isStaffReq(req)) {
        throw new https_1.HttpsError("permission-denied", "No puedes cerrar este ticket.");
    }
    const now = Date.now();
    await tRef.update({
        status: "resolved",
        updatedAt: now,
        lastMessageAt: now,
        lastMessageBy: uid,
    });
    return { success: true };
});
// ===== Listar mis tickets (usuario) =====
exports.supportListMyTickets = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { cursor, status } = ListTicketsSchema.parse(req.data ?? {});
    let q = db
        .collection("tickets")
        .where("ownerId", "==", uid)
        .orderBy("lastMessageAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    if (status)
        q = q.where("status", "==", status);
    if (cursor) {
        const cur = await db.collection("tickets").doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
// ===== Listar todos los tickets (staff) =====
exports.supportListAllTickets = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    assertAuth(req);
    if (!isStaffReq(req))
        throw new https_1.HttpsError("permission-denied", "Solo staff.");
    const { cursor, status } = ListTicketsSchema.parse(req.data ?? {});
    let q = db
        .collection("tickets")
        .orderBy("lastMessageAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    if (status)
        q = q.where("status", "==", status);
    if (cursor) {
        const cur = await db.collection("tickets").doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
// ===== Listar mensajes de un ticket (paginado) =====
exports.supportListMessages = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { ticketId, cursor } = ListMessagesSchema.parse(req.data ?? {});
    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        throw new https_1.HttpsError("not-found", "Ticket no encontrado.");
    const t = tSnap.data();
    const owner = t.ownerId;
    if (uid !== owner && !isStaffReq(req)) {
        throw new https_1.HttpsError("permission-denied", "No puedes ver este ticket.");
    }
    let q = tRef
        .collection("messages")
        .orderBy("createdAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    if (cursor) {
        const cur = await tRef.collection("messages").doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
//# sourceMappingURL=tickets.js.map