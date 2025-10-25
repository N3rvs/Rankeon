import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const DEFAULT_PAGE_SIZE = 20;

/* --------------------------- Utilidades de error --------------------------- */
function mapErrorToHttpsError(ctx: string, err: any): never {
  const msg = String(err?.message ?? err ?? 'Unexpected error');
  console.error(`[${ctx}] ERROR:`, msg, err);

  if (msg.includes('FAILED_PRECONDITION') || msg.toLowerCase().includes('index')) {
    throw new HttpsError(
      'failed-precondition',
      'Falta un índice compuesto para esta consulta de Firestore. Crea el índice sugerido en la consola.'
    );
  }
  if (msg.includes('Missing or insufficient permissions')) {
    throw new HttpsError('permission-denied', 'Las reglas de Firestore denegaron la lectura.');
  }
  if (msg.includes('invalid-argument')) {
    throw new HttpsError('invalid-argument', msg);
  }
  throw new HttpsError('internal', msg);
}

/* -------------------------- Featured Scrims (Top N) ------------------------ */
export const getFeaturedScrims = onCall({ enforceAppCheck: false, region: 'europe-west1' }, async () => {
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
    // *** CORRECCIÓN: Usar throw ***
    throw mapErrorToHttpsError('getFeaturedScrims', err);
  }
});

/* --------------------------- Market: Players (Paginado) -------------------------- */
export const getMarketPlayers = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
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
        blocked: u.blocked || [], // Incluir solo si el cliente lo necesita para filtrar
      };
    });
    const lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { players, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    // *** CORRECCIÓN: Usar throw ***
    throw mapErrorToHttpsError('getMarketPlayers', err);
  }
});

/* ---------------------------- Market: Teams (Paginado) --------------------------- */
export const getMarketTeams = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
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
      // Excluir campos sensibles si es necesario antes de devolver
      return {
        // Incluye los campos que el mercado necesita
        id: d.id,
        name: t.name,
        game: t.game,
        country: t.country,
        avatarUrl: t.avatarUrl,
        bannerUrl: t.bannerUrl, // Opcional
        lookingForPlayers: t.lookingForPlayers,
        recruitingRoles: t.recruitingRoles,
        rankMin: t.rankMin, // Opcional
        rankMax: t.rankMax, // Opcional
        createdAt: t.createdAt?.toDate().toISOString(),
      };
    });
    const lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { teams, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    // *** CORRECCIÓN: Usar throw ***
    throw mapErrorToHttpsError('getMarketTeams', err);
  }
});

/* --------------------------- Honor Rankings (Paginado) --------------------------- */
export const getHonorRankings = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
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
    // *** CORRECCIÓN: Usar throw ***
    throw mapErrorToHttpsError('getHonorRankings', err);
  }
});

/* --------------------------- Scrim Rankings (Paginado) --------------------------- */
export const getScrimRankings = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('teams')
      .where('stats.scrimsPlayed', '>', 0)
      .orderBy('stats.scrimsPlayed') // Asegúrate que el índice existe
      .orderBy('winRate', 'desc')      // Asegúrate que el índice existe
      .orderBy('stats.scrimsWon', 'desc') // Asegúrate que el índice existe
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
       const winRate = t.winRate || 0; // Asume campo denormalizado
       return {
         id: d.id,
         name: t.name, // Añadir campos necesarios para UI
         avatarUrl: t.avatarUrl, // Añadir campos necesarios para UI
         winRate,
         played,
         won,
         createdAt: t.createdAt?.toDate().toISOString(),
       };
    });
    const lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { rankings, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    throw mapErrorToHttpsError('getScrimRankings', err);
  }
});

/* ----------------------- Tournament Rankings (Paginado) -------------------------- */
export const getTournamentRankings = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
  try {
    if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const { lastId } = (data ?? {}) as { lastId: string | null };

    let q = db
      .collection('tournaments')
      .where('status', '==', 'completed')
      .where('winnerId', '!=', null)
      .orderBy('winnerId') // Asegúrate que el índice existe
      .orderBy('startDate', 'desc') // Asegúrate que el índice existe
      .limit(DEFAULT_PAGE_SIZE);

    if (lastId) {
      const lastDoc = await db.collection('tournaments').doc(lastId).get();
      if (lastDoc.exists) q = q.startAfter(lastDoc);
    }

    const snap = await q.get();
    const tournaments = snap.docs.map((d) => {
      const t = d.data();
      // Devuelve solo los campos necesarios para el ranking
      return {
        id: d.id,
        name: t.name,
        winnerId: t.winnerId,
        // Podrías añadir winnerName y winnerAvatar si los denormalizas en el torneo
        startDate: t.startDate?.toDate().toISOString(),
        prize: t.prize, // Opcional
        currency: t.currency, // Opcional
      };
    });
    const lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { tournaments, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    throw mapErrorToHttpsError('getTournamentRankings', err);
  }
});

/* --------------------------- Managed Users (Paginado) ---------------------------- */
export const getManagedUsers = onCall({ region: 'europe-west1' }, async ({ auth: callerAuth, data }) => {
  try {
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in.');
    const { role } = callerAuth.token as any; // Cuidado con 'as any'
    if (role !== 'admin' && role !== 'moderator') {
      throw new HttpsError('permission-denied', 'You do not have permission.');
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
       // Devuelve campos relevantes para la gestión
       return {
         id: d.id,
         name: u.name,
         email: u.email, // Importante para identificar usuarios
         role: u.role,
         disabled: u.disabled ?? false,
         createdAt: u.createdAt?.toDate().toISOString() || null,
         banUntil: u.banUntil?.toDate().toISOString() || null,
         _claimsRefreshedAt: u._claimsRefreshedAt?.toDate().toISOString() || null,
       };
    });
    const lastDoc = snap.docs[snap.docs.length - 1] || null;
    return { users, nextLastId: lastDoc ? lastDoc.id : null };
  } catch (err) {
    throw mapErrorToHttpsError('getManagedUsers', err);
  }
});

/* ----------------------------- Team Members (Sin Paginación - OK) --------------------------- */
export const getTeamMembers = onCall({ region: 'europe-west1' }, async (request) => {
  try {
    const { teamId } = (request.data ?? {}) as { teamId: string };
    if (!teamId) throw new HttpsError('invalid-argument', 'Team ID is required.');
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');

    // Aquí podrías añadir una comprobación de permisos si solo miembros/staff pueden ver la lista

    const membersSnap = await db.collection(`teams/${teamId}/members`).get();
    const memberIds = membersSnap.docs.map((d) => d.id);
    if (memberIds.length === 0) return [];

    // Advertencia si hay más de 30 miembros por la limitación de 'in'
    if (memberIds.length > 30) {
        console.warn(`getTeamMembers: Team ${teamId} has >30 members, fetching only first 30 user profiles.`);
        // Considera implementar paginación aquí también si los equipos pueden ser muy grandes
    }

    // Obtiene datos de usuario para los primeros 30 miembros
    const usersSnap = await db
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', memberIds.slice(0, 30))
      .get();
    const usersMap = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));

    // Combina datos de miembro y usuario
    return membersSnap.docs.map((d) => {
      const memberData = d.data();
      const userData = usersMap.get(d.id) || {};
      return {
        // Datos del miembro (subcolección)
        id: d.id,
        role: memberData.role,
        isIGL: memberData.isIGL ?? false,
        joinedAt: memberData.joinedAt?.toDate().toISOString(),
        // Datos del usuario (colección /users)
        name: userData.name,
        avatarUrl: userData.avatarUrl,
        country: userData.country,
        rank: userData.rank,
        skills: userData.skills,
        isCertifiedStreamer: userData.isCertifiedStreamer ?? false,
        // Excluye datos sensibles como email, blocked, etc.
      };
    });
  } catch (err) {
    throw mapErrorToHttpsError('getTeamMembers', err);
  }
});