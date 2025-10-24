"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMembers = exports.getManagedUsers = exports.getTournamentRankings = exports.getScrimRankings = exports.getHonorRankings = exports.getMarketTeams = exports.getMarketPlayers = exports.getFeaturedScrims = void 0;
// functions/src/public.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// --- CONSTANTES ---
const DEFAULT_PAGE_SIZE = 20; // Número de documentos a traer por página
// Esta función ya estaba bien porque usa .limit()
exports.getFeaturedScrims = (0, https_1.onCall)({ enforceAppCheck: false }, async () => {
    try {
        const scrimsSnapshot = await db.collection('scrims')
            .where('status', '==', 'confirmed')
            .orderBy('date', 'desc')
            .limit(10) // Límite pequeño, esto está bien
            .get();
        const confirmedScrims = scrimsSnapshot.docs.map(doc => {
            var _a, _b;
            const data = doc.data();
            return Object.assign(Object.assign({}, data), { id: doc.id, date: (_a = data.date) === null || _a === void 0 ? void 0 : _a.toDate().toISOString(), createdAt: (_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate().toISOString() });
        });
        return confirmedScrims;
    }
    catch (error) {
        console.error("Error fetching featured scrims:", error);
        throw new https_1.HttpsError("internal", "Failed to retrieve featured scrims.");
    }
});
/**
 * --- FUNCIÓN PAGINADA MODIFICADA ---
 * Obtiene jugadores del mercado de forma paginada.
 * Espera { lastId: string | null } en data.
 */
exports.getMarketPlayers = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { lastId } = data;
    let query = db.collection('users')
        .where('lookingForTeam', '==', true) // Filtra primero, es más eficiente
        .orderBy('name') // Necesitas un orderBy para usar startAfter
        .limit(DEFAULT_PAGE_SIZE);
    if (lastId) {
        const lastDoc = await db.collection('users').doc(lastId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }
    const usersSnapshot = await query.get();
    const players = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || '',
            avatarUrl: data.avatarUrl || '',
            primaryGame: data.primaryGame || '',
            skills: data.skills || [],
            rank: data.rank || '',
            country: data.country || '',
            lookingForTeam: data.lookingForTeam || false,
            teamId: data.teamId || null,
            blocked: data.blocked || [],
        };
    });
    // Devuelve el ID del último documento para la siguiente consulta
    const lastDocInBatch = usersSnapshot.docs[usersSnapshot.docs.length - 1];
    return {
        players: players,
        nextLastId: lastDocInBatch ? lastDocInBatch.id : null,
    };
});
/**
 * --- FUNCIÓN PAGINADA MODIFICADA ---
 * Obtiene equipos del mercado de forma paginada.
 * Espera { lastId: string | null } en data.
 */
exports.getMarketTeams = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { lastId } = data;
    let query = db.collection('teams')
        .where('lookingForPlayers', '==', true)
        .orderBy('createdAt', 'desc') // Ordena por creación reciente
        .limit(DEFAULT_PAGE_SIZE);
    if (lastId) {
        const lastDoc = await db.collection('teams').doc(lastId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }
    const teamsSnapshot = await query.get();
    const teams = teamsSnapshot.docs.map(doc => {
        var _a;
        const data = doc.data();
        return Object.assign(Object.assign({}, data), { id: doc.id, createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString() });
    });
    const lastDocInBatch = teamsSnapshot.docs[teamsSnapshot.docs.length - 1];
    return {
        teams: teams,
        nextLastId: lastDocInBatch ? lastDocInBatch.id : null,
    };
});
/**
 * --- FUNCIÓN PAGINADA MODIFICADA ---
 * Obtiene rankings de honor paginados.
 * Espera { lastId: string | null } en data.
 * * !!! NOTA IMPORTANTE !!!
 * Esta función AHORA ASUME que tienes un campo `totalHonors` en tus
 * documentos de usuario. Debes actualizar tu función `giveHonor` para
 * que mantenga este campo (`admin.firestore.FieldValue.increment(1)`).
 * Consultar sobre `honorCounts` en cada lectura es demasiado costoso.
 */
exports.getHonorRankings = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { lastId } = data;
    let query = db.collection('users')
        .where('totalHonors', '>', 0) // Filtra por el campo denormalizado
        .orderBy('totalHonors', 'desc') // Ordena por él
        .limit(DEFAULT_PAGE_SIZE);
    if (lastId) {
        const lastDoc = await db.collection('users').doc(lastId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }
    const usersSnapshot = await query.get();
    const rankings = usersSnapshot.docs.map(doc => {
        const user = doc.data();
        return {
            id: doc.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            totalHonors: user.totalHonors || 0, // Lee el campo denormalizado
            isCertifiedStreamer: user.isCertifiedStreamer || false,
        };
    });
    const lastDocInBatch = usersSnapshot.docs[usersSnapshot.docs.length - 1];
    return {
        rankings: rankings,
        nextLastId: lastDocInBatch ? lastDocInBatch.id : null,
    };
});
/**
 * --- FUNCIÓN PAGINADA MODIFICADA ---
 * Obtiene rankings de scrims paginados.
 * * !!! NOTA IMPORTANTE !!!
 * Esta función ASUME que tienes un campo `winRate` en tus documentos de equipo
 * y que `stats.scrimsWon` existe.
 * También necesitarás un ÍNDICE COMPUESTO en Firestore para esta consulta:
 * Colección: `teams`
 * Campos: `stats.scrimsPlayed` (ASC), `winRate` (DESC), `stats.scrimsWon` (DESC)
 */
exports.getScrimRankings = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { lastId } = data;
    let query = db.collection('teams')
        .where('stats.scrimsPlayed', '>', 0)
        .orderBy('stats.scrimsPlayed') // Añadido para consulta
        .orderBy('winRate', 'desc')
        .orderBy('stats.scrimsWon', 'desc')
        .limit(DEFAULT_PAGE_SIZE);
    if (lastId) {
        const lastDoc = await db.collection('teams').doc(lastId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }
    const teamsSnapshot = await query.get();
    const rankings = teamsSnapshot.docs.map(doc => {
        var _a, _b, _c;
        const teamData = doc.data();
        const played = ((_a = teamData.stats) === null || _a === void 0 ? void 0 : _a.scrimsPlayed) || 0;
        const won = ((_b = teamData.stats) === null || _b === void 0 ? void 0 : _b.scrimsWon) || 0;
        const winRate = teamData.winRate || 0; // Lee el campo pre-calculado
        return Object.assign(Object.assign({ id: doc.id }, teamData), { winRate,
            played,
            won, createdAt: (_c = teamData.createdAt) === null || _c === void 0 ? void 0 : _c.toDate().toISOString() });
    });
    const lastDocInBatch = teamsSnapshot.docs[teamsSnapshot.docs.length - 1];
    return {
        rankings: rankings,
        nextLastId: lastDocInBatch ? lastDocInBatch.id : null,
    };
});
/**
 * --- FUNCIÓN PAGINADA MODIFICADA ---
 * Obtiene torneos completados paginados.
 */
exports.getTournamentRankings = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { lastId } = data;
    let query = db.collection('tournaments')
        .where('status', '==', 'completed')
        .where('winnerId', '!=', null) // Filtra en la consulta, no en el código
        .orderBy('winnerId') // Necesario para el filtro '!='
        .orderBy('startDate', 'desc') // Ordena por fecha
        .limit(DEFAULT_PAGE_SIZE);
    if (lastId) {
        const lastDoc = await db.collection('tournaments').doc(lastId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }
    const tourneySnapshot = await query.get();
    const tournaments = tourneySnapshot.docs.map(doc => {
        var _a, _b;
        const data = doc.data();
        return Object.assign(Object.assign({}, data), { id: doc.id, startDate: (_a = data.startDate) === null || _a === void 0 ? void 0 : _a.toDate().toISOString(), createdAt: (_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate().toISOString() });
    });
    const lastDocInBatch = tourneySnapshot.docs[tourneySnapshot.docs.length - 1];
    return {
        tournaments: tournaments,
        nextLastId: lastDocInBatch ? lastDocInBatch.id : null,
    };
});
/**
 * --- FUNCIÓN PAGINADA MODIFICADA ---
 * Obtiene usuarios para el panel de admin/mod de forma paginada.
 */
exports.getManagedUsers = (0, https_1.onCall)(async ({ auth: callerAuth, data }) => {
    if (!callerAuth)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    const { role } = callerAuth.token;
    if (role !== 'admin' && role !== 'moderator') {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission to access user data.');
    }
    const { lastId } = data;
    let query = db.collection('users')
        .orderBy('name') // Un orden simple
        .limit(DEFAULT_PAGE_SIZE);
    if (lastId) {
        const lastDoc = await db.collection('users').doc(lastId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }
    const usersSnapshot = await query.get();
    const users = usersSnapshot.docs.map(doc => {
        var _a, _b, _c;
        const data = doc.data();
        return Object.assign(Object.assign({}, data), { id: doc.id, createdAt: ((_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString()) || null, banUntil: ((_b = data.banUntil) === null || _b === void 0 ? void 0 : _b.toDate().toISOString()) || null, _claimsRefreshedAt: ((_c = data._claimsRefreshedAt) === null || _c === void 0 ? void 0 : _c.toDate().toISOString()) || null });
    });
    const lastDocInBatch = usersSnapshot.docs[usersSnapshot.docs.length - 1];
    return {
        users: users,
        nextLastId: lastDocInBatch ? lastDocInBatch.id : null,
    };
});
/**
 * --- ESTA FUNCIÓN ESTABA BIEN ESCRITA ---
 * El patrón de obtener IDs de subcolección y luego usar `where-in`
 * es eficiente y escala bien (hasta el límite de 30 items en `where-in`).
 * El error CORS que veías es por CÓMO LA LLAMAS (fetch) y no por
 * CÓMO ESTÁ ESCRITA.
 */
exports.getTeamMembers = (0, https_1.onCall)(async (request) => {
    const { teamId } = request.data;
    if (!teamId)
        throw new https_1.HttpsError('invalid-argument', 'Team ID is required.');
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    // Idealmente, aquí deberías comprobar si el usuario que llama
    // tiene permiso para ver los miembros de este equipo.
    const membersSnap = await db.collection(`teams/${teamId}/members`).get();
    const memberIds = membersSnap.docs.map(doc => doc.id);
    if (memberIds.length === 0) {
        return [];
    }
    // El `where-in` es muy eficiente.
    // Límite: Firebase solo permite hasta 30 items en un array 'in'.
    // Si un equipo puede tener >30 miembros, tendrás que hacer múltiples consultas.
    const usersSnap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', memberIds).get();
    const usersMap = new Map(usersSnap.docs.map(doc => [doc.id, doc.data()]));
    return membersSnap.docs.map(doc => {
        var _a;
        const memberData = doc.data();
        const userData = usersMap.get(doc.id) || {};
        return Object.assign(Object.assign(Object.assign({}, memberData), userData), { id: doc.id, joinedAt: (_a = memberData.joinedAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString() });
    });
});
//# sourceMappingURL=public.js.map