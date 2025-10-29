// functions/src/honors.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const PAGE_SIZE = 20 as const;

// ---------- helpers ----------
function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}
const toISO = (v: any) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return null;
};

// ---------- schemas ----------
const honorTypes = ['MVP', 'FAIR_PLAY', 'LEADERSHIP'] as const;

const GiveSchema = z.object({
  to: z.string().min(1),
  type: z.enum(honorTypes),
  reason: z.string().min(3).max(200).optional(),
});

const RevokeSchema = z.object({
  honorId: z.string().min(1),
});

const PageInputSchema = z.object({
  lastId: z.string().nullable().optional(),
});

// ============================================================
// giveHonor
// ============================================================
export const giveHonor = onCall({ region: 'europe-west1' }, async (req) => {
  const from = assertAuth(req);
  const { to, type, reason } = GiveSchema.parse(req.data ?? {});
  if (from === to) throw new HttpsError('failed-precondition', 'Cannot honor yourself');

  // límite diario: 5 por emisor
  const since = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const given24h = await db
    .collection('honors')
    .where('from', '==', from)
    .where('createdAt', '>=', since)
    .count()
    .get();

  if (given24h.data().count >= 5) {
    throw new HttpsError('resource-exhausted', 'Daily honor limit reached');
  }

  // crea honor + incrementa agregados en una transacción
  const honorRef = db.collection('honors').doc();
  const userRef = db.doc(`users/${to}`);
  const statRef = db.doc(`honorStats/${to}`);

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError('not-found', 'Recipient user not found');

    tx.set(honorRef, {
      from,
      to,
      type,
      reason: reason ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(
      statRef,
      {
        uid: to,
        total: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      userRef,
      {
        totalHonors: admin.firestore.FieldValue.increment(1),
        _honorUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { id: honorRef.id };
});

// ============================================================
// revokeHonor
// ============================================================
export const revokeHonor = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { honorId } = RevokeSchema.parse(req.data ?? {});

  const honorRef = db.doc(`honors/${honorId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(honorRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Honor not found');
    const data = snap.data() as any;

    if (data.from !== uid) throw new HttpsError('permission-denied', 'Cannot revoke others honors');

    const to = data.to as string;
    const userRef = db.doc(`users/${to}`);
    const statRef = db.doc(`honorStats/${to}`);

    tx.delete(honorRef);

    tx.set(
      statRef,
      {
        uid: to,
        total: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      userRef,
      {
        totalHonors: admin.firestore.FieldValue.increment(-1),
        _honorUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { ok: true };
});

// ============================================================
/** getHonorRankings
 * Devuelve { rankings, nextLastId } para tu UI.
 * Fuente: honorStats/{uid} (agregado), y se enriquece con datos del perfil.
 */
export const getHonorRankings = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    const { lastId } = PageInputSchema.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection('honorStats')
      .orderBy('total', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE);

    if (lastId) {
      const cur = await db.collection('honorStats').doc(lastId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();

    // junta perfiles
    const userRefs = res.docs.map((d) => db.doc(`users/${d.id}`));
    const users = userRefs.length ? await db.getAll(...userRefs) : [];

    const userById = new Map(users.filter((s) => s.exists).map((s) => [s.id, s.data() as any]));

    const rankings = res.docs.map((d) => {
      const stat = d.data() as any;
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
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getHonorRankings error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});
