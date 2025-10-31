import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../lib/admin";

const db = getFirestore();
const PAGE_SIZE = 50 as const;

function assertAuth(req: any) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  return uid as string;
}

// ===== Schemas =====
const CreateRoomSchema = z.object({
  name: z.string().min(3).max(50),
  game: z.string().min(1),
  server: z.string().min(1),
  rank: z.string().min(1),
  partySize: z.string().min(1), // viene como string desde el cliente
});

const JoinSchema = z.object({
  roomId: z.string().min(1),
});

const SendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

const ListRoomsSchema = z.object({
  cursor: z.string().optional(),
  game: z.string().optional(),
  server: z.string().optional(),
  rank: z.string().optional(),
  ownerOnly: z.boolean().optional(), // si true, lista mis salas
});

const ListMessagesSchema = z.object({
  roomId: z.string().min(1),
  cursor: z.string().optional(),
});

// Helper: lectura consistente de sala
async function getRoomOrThrow(roomId: string) {
  const ref = db.doc(`rooms/${roomId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Room not found.");
  return { ref, data: snap.data() as any };
}

/** createGameRoom
 * Crea sala con el usuario como owner y primer miembro.
 */
export const roomsCreate = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const input = CreateRoomSchema.parse(req.data ?? {});
    const capacity = Number.parseInt(input.partySize, 10) || 1;

    if (capacity < 1 || capacity > 20) {
      throw new HttpsError("invalid-argument", "partySize debe estar entre 1 y 20.");
    }

    // Evitar demasiadas salas abiertas por usuario
    const existing = await db
      .collection("rooms")
      .where("ownerId", "==", uid)
      .where("closed", "==", false)
      .count()
      .get();
    if (existing.data().count >= 20) {
      throw new HttpsError("resource-exhausted", "Límite de salas alcanzado.");
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
      members: [uid] as string[],
      closed: false,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });

    return { success: true, roomId: ref.id };
  }
);

/** joinRoom
 * Añade al usuario a la sala si hay espacio.
 */
export const roomsJoin = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { roomId } = JoinSchema.parse(req.data ?? {});

    await db.runTransaction(async (tx) => {
      const ref = db.doc(`rooms/${roomId}`);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError("not-found", "Room not found.");

      const room = snap.data() as any;
      if (room.closed) throw new HttpsError("failed-precondition", "Room is closed.");

      const members: string[] = room.members ?? [];
      const capacity: number = room.capacity ?? 1;

      if (members.includes(uid)) return; // idempotente
      if (members.length >= capacity) {
        throw new HttpsError("failed-precondition", "Room is full.");
      }

      tx.update(ref, {
        members: FieldValue.arrayUnion(uid),
        updatedAt: Date.now(),
      });
    });

    return { success: true };
  }
);

/** leaveRoom
 * Quita al usuario; si queda vacía, borra la sala y sus mensajes.
 */
export const roomsLeave = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 60 },
  async (req) => {
    const uid = assertAuth(req);
    const { roomId } = JoinSchema.parse(req.data ?? {});

    let becameEmpty = false;

    await db.runTransaction(async (tx) => {
      const ref = db.doc(`rooms/${roomId}`);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError("not-found", "Room not found.");

      const room = snap.data() as any;
      const members: string[] = room.members ?? [];
      if (!members.includes(uid)) return; // idempotente

      const newMembers = members.filter((m) => m !== uid);
      if (newMembers.length === 0) {
        tx.delete(ref);
        becameEmpty = true;
      } else {
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
        const page = await msgsRef.orderBy(FieldPath.documentId()).limit(PAGE_SIZE).get();
        if (page.empty) break;
        const b = db.batch();
        page.docs.forEach((d) => b.delete(d.ref));
        await b.commit();
        if (page.size < PAGE_SIZE) break;
      }
    }

    return { success: true };
  }
);

/** sendMessageToRoom
 * Sólo miembros pueden enviar. Guarda en rooms/{id}/messages.
 */
export const roomsSendMessage = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { roomId, content } = SendMessageSchema.parse(req.data ?? {});

    const { ref, data: room } = await getRoomOrThrow(roomId);
    if (room.closed) throw new HttpsError("failed-precondition", "Room is closed.");
    const members: string[] = room.members ?? [];
    if (!members.includes(uid)) {
      throw new HttpsError("permission-denied", "No eres miembro de esta sala.");
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
  }
);

/** closeRoom
 * Cierra la sala (solo owner), ya no permite nuevos mensajes ni joins.
 */
export const roomsClose = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { roomId } = JoinSchema.parse(req.data ?? {});
    const { ref, data: room } = await getRoomOrThrow(roomId);
    if (room.ownerId !== uid) throw new HttpsError("permission-denied", "Solo el owner puede cerrar la sala.");
    if (room.closed) return { success: true }; // idempotente
    await ref.update({ closed: true, updatedAt: Date.now() });
    return { success: true };
  }
);

/** listRooms
 * Listado/paginación con filtros simples (game/server/rank) o solo mis salas.
 */
export const roomsList = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { cursor, game, server, rank, ownerOnly } = ListRoomsSchema.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection("rooms")
      .where("closed", "==", false)
      .orderBy("lastMessageAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (ownerOnly) {
      q = db
        .collection("rooms")
        .where("ownerId", "==", uid)
        .orderBy("lastMessageAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    }

    if (game) q = q.where("game", "==", game);
    if (server) q = q.where("server", "==", server);
    if (rank) q = q.where("rank", "==", rank);

    if (cursor) {
      const cur = await db.collection("rooms").doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    return {
      items: res.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);

/** listRoomMessages
 * Paginación de mensajes (desc).
 */
export const roomsListMessages = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { roomId, cursor } = ListMessagesSchema.parse(req.data ?? {});
    const { ref, data: room } = await getRoomOrThrow(roomId);

    const members: string[] = room.members ?? [];
    if (!members.includes(uid)) throw new HttpsError("permission-denied", "No eres miembro de esta sala.");

    let q: FirebaseFirestore.Query = ref
      .collection("messages")
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (cursor) {
      const cur = await ref.collection("messages").doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    return {
      items: res.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);
