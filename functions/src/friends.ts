import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const PAGE_SIZE = 20;

// ---------- Helpers ----------

function assertAuth(ctx: any) {
  if (!ctx.auth)
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid;
}

function pairId(a: string, b: string) {
  return [a, b].sort().join('_');
}

// ---------- Schemas ----------

const SendFriendSchema = z.object({ to: z.string().min(1) });
const RespondSchema = z.object({ userId: z.string().min(1), accept: z.boolean() });
const CancelSchema = z.object({ userId: z.string().min(1) });
const RemoveSchema = z.object({ userId: z.string().min(1) });
const ListCursorSchema = z.object({ cursor: z.string().optional() });

// ---------- Enviar solicitud ----------

export const sendFriendRequest = onCall({ region: 'europe-west1' }, async (req: any) => {
  const uid = assertAuth(req);
  const { to } = SendFriendSchema.parse(req.data);
  if (uid === to) throw new HttpsError('failed-precondition', 'Cannot add yourself.');
  
  const frRef = db.doc(`friendRequests/${pairId(uid, to)}`);
  const fsRef = db.doc(`friendships/${pairId(uid, to)}`);
  
  await db.runTransaction(async (tx) => {
    const [fr, fs] = await Promise.all([tx.get(frRef), tx.get(fsRef)]);
    
    if (fs.exists) throw new HttpsError('already-exists', 'Already friends.');
    
    if (!fr.exists) {
      tx.set(frRef, {
        from: uid,
        to,
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }
    
    const s = (fr.data() as any).status;
    // Idempotencia: si sigue pendiente, no hagas nada.
    if (s === 'PENDING') return;

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

export const respondToFriendRequest = onCall({ region: 'europe-west1' }, async (req: any) => {
    const uid = assertAuth(req);
    const { userId, accept } = RespondSchema.parse(req.data);

    const frRef = db.doc(`friendRequests/${pairId(uid, userId)}`);
    const fsRef = db.doc(`friendships/${pairId(uid, userId)}`);

    await db.runTransaction(async (tx) => {
      const fr = await tx.get(frRef);
      if (!fr.exists) throw new HttpsError('not-found', 'Request not found');
      
      const data = fr.data() as any;
      if (data.status !== 'PENDING') return; // idempotente
      
      // Solo el destinatario real puede aceptar/rechazar
      if (data.to !== uid) {
        throw new HttpsError('permission-denied', 'Only the recipient can respond to this request.');
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

export const cancelFriendRequest = onCall({ region: 'europe-west1' }, async (req: any) => {
    const uid = assertAuth(req);
    const { userId } = CancelSchema.parse(req.data);

    const frRef = db.doc(`friendRequests/${pairId(uid, userId)}`);
    
    await db.runTransaction(async (tx) => {
      const fr = await tx.get(frRef);
      if (!fr.exists) return; // idempotente: nada que cancelar
      
      const data = fr.data() as any;
      if (data.status !== 'PENDING') return; // ya no está pendiente
      if (data.from !== uid) {
        throw new HttpsError('permission-denied', 'Only the sender can cancel the request.');
      }
      
      tx.update(frRef, {
        status: 'CANCELLED',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { ok: true };
});


// ---------- Eliminar amistad (cualquiera de los dos) ----------

export const removeFriend = onCall({ region: 'europe-west1' }, async (req: any) => {
    const uid = assertAuth(req);
    const { userId } = RemoveSchema.parse(req.data);

    const fsRef = db.doc(`friendships/${pairId(uid, userId)}`);
    const frRef = db.doc(`friendRequests/${pairId(uid, userId)}`);
    
    await db.runTransaction(async (tx) => {
      const fs = await tx.get(fsRef);
      const fr = await tx.get(frRef);
      
      // Si no hay friendship, no es error: idempotente
      if (fs.exists) tx.delete(fsRef);

      // Opcional: marca la última request como REMOVED para histórico
      if (fr.exists) {
        const s = (fr.data() as any).status;
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
export const listFriends = onCall({ region: 'europe-west1' }, async (req: any) => {
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
    if (cur.exists) q = q.startAfter(cur);
  }
  const res = await q.get();
  const items = res.docs.map((d) => ({ id: d.id, ...d.data() }));
  return {
    items,
    nextCursor:
      res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
  };
});

// ---------- Listar solicitudes (entrantes / salientes) ----------
export const listFriendRequests = onCall(
  { region: 'europe-west1' },
  async (req: any) => {
    const uid = assertAuth(req);
    const { direction, cursor } = z
      .object({
        direction: z.enum(['incoming', 'outgoing']).default('incoming'),
        cursor: z.string().optional(),
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
      if (cur.exists) q = q.startAfter(cur);
    }
    const res = await q.get();
    const items = res.docs.map((d) => ({ id: d.id, ...d.data() }));
    return {
      items,
      nextCursor:
        res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);
