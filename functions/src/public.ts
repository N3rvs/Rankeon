import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const PAGE_SIZE = 20 as const;

// ---------- Helpers ----------
function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}

const toISO = (v: any) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate().toISOString(); // Firestore Timestamp
  if (v instanceof Date) return v.toISOString();
  return null;
};

// ---------- Schemas ----------
const PageInputSchema = z.object({
  lastId: z.string().nullable().optional(),
});

/**
 * ============= getFeaturedScrims =============
 * Frontend espera: array plano de scrims.
 */
export const getFeaturedScrims = onCall({ region: 'europe-west1' }, async (_req) => {
  try {
    const snap = await db
      .collection('scrims')
      .where('featured', '==', true)
      .orderBy('date', 'desc')
      .limit(PAGE_SIZE)
      .get();

    const items = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        ...x,
        date: toISO(x.date),
        createdAt: toISO(x.createdAt),
        updatedAt: toISO(x.updatedAt),
      };
    });

    return items; // array plano
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getFeaturedScrims error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});

/**
 * ============= getScrimRankings =============
 * Frontend espera: { rankings, nextLastId }
 */
export const getScrimRankings = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    const { lastId } = PageInputSchema.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection('teams')
      .orderBy('elo', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE);

    if (lastId) {
      const cur = await db.collection('teams').doc(lastId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    const rankings = res.docs.map((d) => {
      const x = d.data() as any;
      const played = Number(x.scrimsPlayed ?? x.played ?? 0);
      const won = Number(x.scrimsWon ?? x.won ?? 0);
      const winRate = played > 0 ? won / played : 0;

      return {
        id: d.id,
        name: x.name ?? '',
        logoUrl: x.logoUrl ?? null,
        elo: x.elo ?? 0,
        played,
        won,
        winRate,
        createdAt: toISO(x.createdAt),
        updatedAt: toISO(x.updatedAt),
      };
    });

    const nextLastId = res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null;
    return { rankings, nextLastId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getScrimRankings error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});

/**
 * ============= getTournamentRankings =============
 * Frontend espera: { tournaments, nextLastId }
 */
export const getTournamentRankings = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    const { lastId } = PageInputSchema.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection('tournaments')
      .orderBy('rating', 'desc') // cambia a 'elo' u otro si tu modelo no tiene 'rating'
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE);

    if (lastId) {
      const cur = await db.collection('tournaments').doc(lastId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    const tournaments = res.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        name: x.name ?? '',
        game: x.game ?? null,
        rating: x.rating ?? x.elo ?? 0,
        participants: x.participants ?? x.participantsCount ?? 0,
        startDate: toISO(x.startDate),
        createdAt: toISO(x.createdAt),
        updatedAt: toISO(x.updatedAt),
      };
    });

    const nextLastId = res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null;
    return { tournaments, nextLastId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getTournamentRankings error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});

/**
 * ============= getManagedUsers =============
 * Frontend espera: { users, nextLastId }
 * Requiere admin/moderator.
 */
export const getManagedUsers = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    // const _uid = assertAuth(req);
    const role = (req.auth!.token as any)?.role;
    if (role !== 'admin' && role !== 'moderator') {
      throw new HttpsError('permission-denied', 'Admin/Mod only');
    }

    const { lastId } = PageInputSchema.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE);

    if (lastId) {
      const cur = await db.collection('users').doc(lastId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    const users = res.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        name: x.name ?? x.displayName ?? '',
        avatarUrl: x.avatarUrl ?? x.photoURL ?? null,
        role: x.role ?? (x.customClaims?.role ?? 'player'),
        disabled: !!x.disabled,
        isCertifiedStreamer: !!x.isCertifiedStreamer,
        createdAt: toISO(x.createdAt),
        banUntil: toISO(x.banUntil),
        _claimsRefreshedAt: toISO(x._claimsRefreshedAt),
      };
    });

    const nextLastId = res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null;
    return { users, nextLastId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getManagedUsers error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});

/**
 * ============= getFriendProfiles =============
 * Frontend espera: array plano de perfiles de amigos del usuario autenticado.
 * Usa colección 'friendships/{a_b}' con campo 'users: [a,b]'.
 */
export const getFriendProfiles = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    const uid = assertAuth(req);

    const fs = await db
      .collection('friendships')
      .where('users', 'array-contains', uid)
      .limit(200)
      .get();

    const friendIds = new Set<string>();
    fs.docs.forEach((d) => {
      const arr: string[] = (d.data() as any).users ?? [];
      arr.forEach((u) => {
        if (u !== uid) friendIds.add(u);
      });
    });

    if (friendIds.size === 0) return [];

    const userRefs = Array.from(friendIds).map((id) => db.doc(`users/${id}`));
    const snaps = await db.getAll(...userRefs);

    const profiles = snaps
      .filter((s) => s.exists)
      .map((s) => {
        const x = s.data() as any;
        return {
          id: s.id,
          name: x.name ?? x.displayName ?? '',
          avatarUrl: x.avatarUrl ?? x.photoURL ?? null,
          role: x.role ?? (x.customClaims?.role ?? 'player'),
          isCertifiedStreamer: !!x.isCertifiedStreamer,
          createdAt: toISO(x.createdAt),
          banUntil: toISO(x.banUntil),
          _claimsRefreshedAt: toISO(x._claimsRefreshedAt),
        };
      });

    return profiles; // array plano
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getFriendProfiles error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});

/**
 * ============= getMarketPlayers =============
 * Frontend espera: { players, nextLastId } o array? → tu action espera { players, nextLastId }.
 * Si no usas flags de “mercado”, simplemente listamos usuarios más recientes.
 */
export const getMarketPlayers = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    const input = z.object({ lastId: z.string().nullable().optional() }).parse(req.data ?? {});
    let q: FirebaseFirestore.Query = db
      .collection('users')
      // si tienes un flag como isOnMarket / lft / marketOpen, descomenta:
      // .where('isOnMarket', '==', true)
      .orderBy('createdAt', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE);

    if (input.lastId) {
      const cur = await db.collection('users').doc(input.lastId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    const players = res.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        name: x.name ?? x.displayName ?? '',
        avatarUrl: x.avatarUrl ?? x.photoURL ?? null,
        isCertifiedStreamer: !!x.isCertifiedStreamer,
        createdAt: toISO(x.createdAt),
      };
    });

    const nextLastId = res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null;
    return { players, nextLastId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getMarketPlayers error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});

/**
 * ============= getMarketTeams =============
 */
export const getMarketTeams = onCall({ region: 'europe-west1' }, async (req) => {
  try {
    const input = z.object({ lastId: z.string().nullable().optional() }).parse(req.data ?? {});
    let q: FirebaseFirestore.Query = db
      .collection('teams')
      // si tienes flag isRecruiting / marketOpen, puedes filtrar:
      // .where('isRecruiting', '==', true)
      .orderBy('createdAt', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(PAGE_SIZE);

    if (input.lastId) {
      const cur = await db.collection('teams').doc(input.lastId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    const teams = res.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        name: x.name ?? '',
        logoUrl: x.logoUrl ?? null,
        createdAt: toISO(x.createdAt),
      };
    });

    const nextLastId = res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null;
    return { teams, nextLastId };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('getMarketTeams error:', err);
    throw new HttpsError('internal', err.message ?? 'Unexpected error');
  }
});
