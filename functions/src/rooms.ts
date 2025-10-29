// functions/src/rooms.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const PAGE_SIZE = 50 as const;

function assertAuth(ctx: any) {
  const uid = ctx.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return uid as string;
}

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

// Helper: lectura consistente de sala
async function getRoomOrThrow(roomId: string) {
  const ref = db.doc(`rooms/${roomId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Room not found.');
  return { ref, data: snap.data() as any };
}

/** =========================================================
 * createGameRoom
 * Crea sala con el usuario como owner y primer miembro.
 * Devuelve { success, message, roomId }
 * ======================================================= */
export const createGameRoom = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const input = CreateRoomSchema.parse(req.data ?? {});
  const capacity = Number.parseInt(input.partySize, 10) || 1;

  if (capacity < 1 || capacity > 20) {
    throw new HttpsError('invalid-argument', 'partySize must be between 1 and 20.');
  }

  // (opcional) Evitar que el usuario tenga 20 salas abiertas
  const existing = await db
    .collection('rooms')
    .where('ownerId', '==', uid)
    .where('closed', '==', false)
    .count()
    .get();
  if (existing.data().count >= 20) {
    throw new HttpsError('resource-exhausted', 'Room limit reached.');
  }

  const ref = db.collection('rooms').doc();

  const roomDoc = {
    name: input.name,
    game: input.game,
    server: input.server,
    rank: input.rank,
    capacity,
    ownerId: uid,
    members: [uid] as string[],
    closed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(roomDoc);

  return {
    success: true,
    message: 'Sala creada con éxito.',
    roomId: ref.id,
  };
});

/** =========================================================
 * joinRoom
 * Añade al usuario a la sala si hay espacio.
 * Devuelve { success, message }
 * ======================================================= */
export const joinRoom = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { roomId } = JoinSchema.parse(req.data ?? {});

  await db.runTransaction(async (tx) => {
    const ref = db.doc(`rooms/${roomId}`);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Room not found.');

    const room = snap.data() as any;
    if (room.closed) throw new HttpsError('failed-precondition', 'Room is closed.');

    const members: string[] = room.members ?? [];
    const capacity: number = room.capacity ?? 1;

    if (members.includes(uid)) {
      // nada que hacer
      return;
    }
    if (members.length >= capacity) {
      throw new HttpsError('failed-precondition', 'Room is full.');
    }

    tx.update(ref, {
      members: admin.firestore.FieldValue.arrayUnion(uid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true, message: 'Joined room successfully' };
});

/** =========================================================
 * leaveRoom
 * Quita al usuario; si queda vacía, borra la sala y sus mensajes.
 * Devuelve { success, message }
 * ======================================================= */
export const leaveRoom = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { roomId } = JoinSchema.parse(req.data ?? {});

  await db.runTransaction(async (tx) => {
    const { ref, data: room } = await getRoomOrThrow(roomId);
    const members: string[] = room.members ?? [];
    if (!members.includes(uid)) {
      // ya no está dentro: OK idempotente
      return;
    }

    const newMembers = members.filter((m) => m !== uid);
    if (newMembers.length === 0) {
      // borrar sala y subcolección de mensajes (en lotes de PAGE_SIZE)
      tx.delete(ref);
      // Nota: no se puede borrar subcolección dentro de la misma transacción.
    } else {
      // si se va el owner, transferir propiedad al primer restante
      const newOwner = room.ownerId === uid ? newMembers[0] : room.ownerId;
      tx.update(ref, {
        members: newMembers,
        ownerId: newOwner,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  // Borrado de subcolección messages si la sala quedó vacía:
  // (fuera de la transacción)
  const roomSnap = await db.doc(`rooms/${roomId}`).get();
  if (!roomSnap.exists) {
    // borrar mensajes por lotes
    const msgsRef = db.collection(`rooms/${roomId}/messages`);
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    // simple paginado por lotes para no reventar timeouts
    // (si tienes muchas, conviene una Cloud Task/trigger)
    // aquí solo limpiamos hasta 1000 por seguridad
    for (let i = 0; i < 20; i++) {
      let q: FirebaseFirestore.Query = msgsRef.orderBy('__name__').limit(PAGE_SIZE);
      if (last) q = q.startAfter(last);
      const page = await q.get();
      if (page.empty) break;

      const batch = db.batch();
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      last = page.docs[page.docs.length - 1];
      if (page.size < PAGE_SIZE) break;
    }
  }

  return { success: true, message: 'Left room successfully' };
});

/** =========================================================
 * sendMessageToRoom
 * Sólo miembros pueden enviar. Guarda en rooms/{id}/messages.
 * Devuelve { success, message }
 * ======================================================= */
export const sendMessageToRoom = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { roomId, content } = SendMessageSchema.parse(req.data ?? {});

  const { ref, data: room } = await getRoomOrThrow(roomId);
  if (room.closed) throw new HttpsError('failed-precondition', 'Room is closed.');
  const members: string[] = room.members ?? [];
  if (!members.includes(uid)) throw new HttpsError('permission-denied', 'You are not a member of this room.');

  // (opcional) rate-limit básico: último mensaje del usuario hace X seg
  // Se puede mejorar con Redis/Firestore counter; aquí lo dejamos simple.

  const msgRef = ref.collection('messages').doc();
  await msgRef.set({
    senderId: uid,
    content,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // marca updatedAt en la sala para ordenar por actividad
  await ref.update({
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: 'Message sent.' };
});
