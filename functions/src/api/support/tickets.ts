import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const db = getFirestore();
const PAGE_SIZE = 20 as const;

function assertAuth(req: any) {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  return req.auth.uid as string;
}
function isStaffRole(role: unknown) {
  return role === "owner" || role === "admin" || role === "moderator" || role === "support";
}
function isStaffReq(req: any) {
  const role = (req.auth?.token as any)?.role;
  return isStaffRole(role);
}

// ===== Schemas =====
const CreateTicketSchema = z.object({
  subject: z.string().min(1).max(160),
  description: z.string().min(10).max(2000),
});

const RespondSchema = z.object({
  ticketId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

const ResolveSchema = z.object({
  ticketId: z.string().min(1),
});

const ListTicketsSchema = z.object({
  cursor: z.string().optional(),
  status: z.enum(["open", "resolved"]).optional(),
});

const ListMessagesSchema = z.object({
  ticketId: z.string().min(1),
  cursor: z.string().optional(),
});

// Colecciones:
// tickets/{ticketId}
//   - { ownerId, subject, description, status, createdAt, updatedAt, lastMessageAt, lastMessageBy }
// tickets/{ticketId}/messages/{messageId}
//   - { authorId, content, createdAt, authorRole }

// ===== Crear ticket =====
export const supportCreateTicket = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
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
  }
);

// ===== Responder ticket =====
export const supportRespondTicket = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { ticketId, content } = RespondSchema.parse(req.data ?? {});

    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists) throw new HttpsError("not-found", "Ticket no encontrado.");

    const t = tSnap.data() as any;
    const owner = t.ownerId as string;

    // Permitir responder al owner y al staff
    if (uid !== owner && !isStaffReq(req)) {
      throw new HttpsError("permission-denied", "No puedes responder este ticket.");
    }
    // Si está resuelto, sólo staff puede reabrir al responder
    if (t.status === "resolved" && !isStaffReq(req)) {
      throw new HttpsError("failed-precondition", "El ticket está resuelto.");
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
  }
);

// ===== Resolver / cerrar ticket =====
export const supportResolveTicket = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { ticketId } = ResolveSchema.parse(req.data ?? {});

    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists) throw new HttpsError("not-found", "Ticket no encontrado.");

    const t = tSnap.data() as any;
    const owner = t.ownerId as string;

    // Puede cerrar el owner o el staff
    if (uid !== owner && !isStaffReq(req)) {
      throw new HttpsError("permission-denied", "No puedes cerrar este ticket.");
    }

    const now = Date.now();
    await tRef.update({
      status: "resolved",
      updatedAt: now,
      lastMessageAt: now,
      lastMessageBy: uid,
    });

    return { success: true };
  }
);

// ===== Listar mis tickets (usuario) =====
export const supportListMyTickets = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { cursor, status } = ListTicketsSchema.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection("tickets")
      .where("ownerId", "==", uid)
      .orderBy("lastMessageAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (status) q = q.where("status", "==", status);
    if (cursor) {
      const cur = await db.collection("tickets").doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    return {
      items: res.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);

// ===== Listar todos los tickets (staff) =====
export const supportListAllTickets = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    assertAuth(req);
    if (!isStaffReq(req)) throw new HttpsError("permission-denied", "Solo staff.");

    const { cursor, status } = ListTicketsSchema.parse(req.data ?? {});
    let q: FirebaseFirestore.Query = db
      .collection("tickets")
      .orderBy("lastMessageAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (status) q = q.where("status", "==", status);
    if (cursor) {
      const cur = await db.collection("tickets").doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    return {
      items: res.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);

// ===== Listar mensajes de un ticket (paginado) =====
export const supportListMessages = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { ticketId, cursor } = ListMessagesSchema.parse(req.data ?? {});

    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists) throw new HttpsError("not-found", "Ticket no encontrado.");

    const t = tSnap.data() as any;
    const owner = t.ownerId as string;
    if (uid !== owner && !isStaffReq(req)) {
      throw new HttpsError("permission-denied", "No puedes ver este ticket.");
    }

    let q: FirebaseFirestore.Query = tRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (cursor) {
      const cur = await tRef.collection("messages").doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    return {
      items: res.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);
