// functions/src/public.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const DEFAULT_PAGE_SIZE = 20;

/* --------------------------- Utilidades de error --------------------------- */

function mapErrorToHttpsError(ctx: string, err: any): never {
  const msg = String(err?.message ?? err ?? 'Unexpected error');
  console.error(`[${ctx}] ERROR:`, msg, err);

  // Índice compuesto faltante (Firestore suele lanzar FAILED_PRECONDITION)
  if (msg.includes('FAILED_PRECONDITION') || msg.toLowerCase().includes('index')) {
    throw new HttpsError(
      'failed-precondition',
      'Falta un índice compuesto para esta consulta de Firestore. Crea el índice sugerido en la consola.'
    );
  }

  // Reglas denegaron acceso
  if (msg.includes('Missing or insufficient permissions')) {
    throw new HttpsError('permission-denied', 'Las reglas de Firestore denegaron la lectura.');
  }

  // Argumento inválido
  if (msg.includes('invalid-argument')) {
    throw new HttpsError('invalid-argument', msg);
  }

  throw new HttpsError('internal', msg);
}

/* -------------------------- Featured Scrims (Top N) ------------------------ */

export const getFeaturedScrims = onCall({ enforceAppCheck: false }, async () => {
  try {
    const snap = await db
      .collection('scrims')
      .where('status', '==', 'confirmed')
      .orderBy('date', 'desc')
      .limit(10)
      .get();

    const scrims = snap.docs.map((d) => {
      const s = d.data();
      return {
        ...s,
        id: d.id,
        date: s.date?.toDate().toISOString(),
        createdAt: s.createdAt?.toDate().toISOString(),
      };
    });

    return scrims;
  } catch (err) {
    return mapErrorToHttpsError('getFeaturedScrims', err);
  }
});

/* --------------------------- Market: Players (UI) -------------------------- */

export const getMarketPlayers = onCall(async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('users')
      .where('lookingForTeam', '==', true)
      .orderBy('name')
      .limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('users').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();

    const players = snap.docs.map((d) => {
      const u = d.data();
      return {
        id: d.id,
        name: u.name || '',
        avatarUrl: u.avatarUrl || '',
        primaryGame: u.primaryGame || '',
        skills: u.skills || [],
        rank: u.rank || '',
        country: u.country || '',
        lookingForTeam: u.lookingForTeam || false,
        teamId: u.teamId ?? null,
        blocked: u.blocked || [],
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return { players, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    return mapErrorToHttpsError('getMarketPlayers', err);
  }
});


/* ---------------------------- Market: Teams (UI) --------------------------- */

export const getMarketTeams = onCall(async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('teams')
      .where('lookingForPlayers', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('teams').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();

    const teams = snap.docs.map((d) => {
      const t = d.data();
      return {
        ...t,
        id: d.id,
        createdAt: t.createdAt?.toDate().toISOString(),
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return { teams, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    return mapErrorToHttpsError('getMarketTeams', err);
  }
});

/* --------------------------- Honor Rankings (UI) --------------------------- */
/* Nota: requiere campo denormalizado `totalHonors` en users */

export const getHonorRankings = onCall(async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('users')
      .where('totalHonors', '>', 0)
      .orderBy('totalHonors', 'desc')
      .limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('users').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();

    const rankings = snap.docs.map((d) => {
      const u = d.data();
      return {
        id: d.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        totalHonors: u.totalHonors || 0,
        isCertifiedStreamer: u.isCertifiedStreamer || false,
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return { rankings, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    return mapErrorToHttpsError('getHonorRankings', err);
  }
});

/* --------------------------- Scrim Rankings (UI) --------------------------- */
/* Requiere índices compuestos para: stats.scrimsPlayed (ASC),
   winRate (DESC), stats.scrimsWon (DESC) */

export const getScrimRankings = onCall(async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('teams')
      .where('stats.scrimsPlayed', '>', 0)
      .orderBy('stats.scrimsPlayed')
      .orderBy('winRate', 'desc')
      .orderBy('stats.scrimsWon', 'desc')
      .limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('teams').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();

    const rankings = snap.docs.map((d) => {
      const t = d.data();
      const played = t.stats?.scrimsPlayed || 0;
      const won = t.stats?.scrimsWon || 0;
      const winRate = t.winRate || 0;
      return {
        id: d.id,
        ...t,
        winRate,
        played,
        won,
        createdAt: t.createdAt?.toDate().toISOString(),
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return { rankings, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    return mapErrorToHttpsError('getScrimRankings', err);
  }
});

/* ----------------------- Tournament Rankings (UI) -------------------------- */

export const getTournamentRankings = onCall(async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('tournaments')
      .where('status', '==', 'completed')
      .where('winnerId', '!=', null)
      .orderBy('winnerId') // necesario para '!='
      .orderBy('startDate', 'desc')
      .limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('tournaments').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();

    const tournaments = snap.docs.map((d) => {
      const t = d.data();
      return {
        ...t,
        id: d.id,
        startDate: t.startDate?.toDate().toISOString(),
        createdAt: t.createdAt?.toDate().toISOString(),
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return { tournaments, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    return mapErrorToHttpsError('getTournamentRankings', err);
  }
});

/* --------------------------- Managed Users (UI) ---------------------------- */

export const getManagedUsers = onCall(async ({ auth: callerAuth, data }) => {
  try {
    if (!callerAuth)
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { role } = callerAuth.token as any;
    if (role !== 'admin' && role !== 'moderator') {
      throw new HttpsError('permission-denied', 'You do not have permission to access user data.');
    }

    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db.collection('users').orderBy('name').limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('users').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();

    const users = snap.docs.map((d) => {
      const u = d.data();
      return {
        ...u,
        id: d.id,
        createdAt: u.createdAt?.toDate().toISOString() || null,
        banUntil: u.banUntil?.toDate().toISOString() || null,
        _claimsRefreshedAt: u._claimsRefreshedAt?.toDate().toISOString() || null,
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    return { users, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    return mapErrorToHttpsError('getManagedUsers', err);
  }
});

/* ----------------------------- Team Members (UI) --------------------------- */

export const getTeamMembers = onCall(async (request) => {
  try {
    const { teamId } = (request.data ?? {}) as { teamId: string };
    if (!teamId)
      throw new HttpsError('invalid-argument', 'Team ID is required.');
    
    if (!request.auth)
      throw new HttpsError('unauthenticated', 'Authentication is required.');

    // Step 1: Get member roles and join dates from the subcollection
    const membersSnap = await db.collection(`teams/${teamId}/members`).get();
    const memberIds = membersSnap.docs.map((d) => d.id);

    if (memberIds.length === 0) return [];
    
    // Step 2: Get user profile data for all members, handling batches for >30 members
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 30) {
        chunks.push(memberIds.slice(i, i + 30));
    }
    
    const userQueries = chunks.map(chunk =>
        db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get()
    );
    const userQuerySnapshots = await Promise.all(userQueries);
    
    const usersMap = new Map<string, FirebaseFirestore.DocumentData>();
    userQuerySnapshots.forEach(snap => {
        snap.docs.forEach(doc => usersMap.set(doc.id, doc.data()));
    });

    // Step 3: Combine the data
    return membersSnap.docs.map((d) => {
      const memberData = d.data();
      const userData = usersMap.get(d.id) || {};
      return {
        ...memberData,
        ...userData,
        id: d.id,
        joinedAt: memberData.joinedAt?.toDate().toISOString(),
      };
    });
  } catch (err) {
    return mapErrorToHttpsError('getTeamMembers', err);
  }
});
