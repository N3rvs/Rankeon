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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const DEFAULT_PAGE_SIZE = 20;
/* --------------------------- Utilidades de error --------------------------- */
function mapErrorToHttpsError(ctx, err) {
    var _a, _b;
    const msg = String((_b = (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err) !== null && _b !== void 0 ? _b : 'Unexpected error');
    console.error(`[${ctx}] ERROR:`, msg, err);
    if (msg.includes('FAILED_PRECONDITION') || msg.toLowerCase().includes('index')) {
        throw new https_1.HttpsError('failed-precondition', 'Falta un índice compuesto para esta consulta de Firestore. Crea el índice sugerido en la consola.');
    }
    if (msg.includes('Missing or insufficient permissions')) {
        throw new https_1.HttpsError('permission-denied', 'Las reglas de Firestore denegaron la lectura.');
    }
    if (msg.includes('invalid-argument')) {
        throw new https_1.HttpsError('invalid-argument', msg);
    }
    throw new https_1.HttpsError('internal', msg);
}
/* -------------------------- Featured Scrims (Top N) ------------------------ */
exports.getFeaturedScrims = (0, https_1.onCall)({ enforceAppCheck: false, region: 'europe-west1' }, async () => {
    try {
        const snap = await db
            .collection('scrims')
            .where('status', '==', 'confirmed')
            .orderBy('date', 'desc')
            .limit(10)
            .get();
        const scrims = snap.docs.map((d) => {
            var _a, _b;
            const s = d.data();
            return Object.assign(Object.assign({}, s), { id: d.id, date: (_a = s.date) === null || _a === void 0 ? void 0 : _a.toDate().toISOString(), createdAt: (_b = s.createdAt) === null || _b === void 0 ? void 0 : _b.toDate().toISOString() });
        });
        return scrims;
    }
    catch (err) {
        // *** CORRECCIÓN: Usar throw ***
        throw mapErrorToHttpsError('getFeaturedScrims', err);
    }
});
/* --------------------------- Market: Players (Paginado) -------------------------- */
exports.getMarketPlayers = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    try {
        if (!auth)
            throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
        const { lastId } = (data !== null && data !== void 0 ? data : {});
        let q = db
            .collection('users')
            .where('lookingForTeam', '==', true)
            .orderBy('name')
            .limit(DEFAULT_PAGE_SIZE);
        if (lastId) {
            const lastDoc = await db.collection('users').doc(lastId).get();
            if (lastDoc.exists)
                q = q.startAfter(lastDoc);
        }
        const snap = await q.get();
        const players = snap.docs.map((d) => {
            var _a;
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
                teamId: (_a = u.teamId) !== null && _a !== void 0 ? _a : null,
                blocked: u.blocked || [], // Incluir solo si el cliente lo necesita para filtrar
            };
        });
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        return { players, nextLastId: lastDoc ? lastDoc.id : null };
    }
    catch (err) {
        // *** CORRECCIÓN: Usar throw ***
        throw mapErrorToHttpsError('getMarketPlayers', err);
    }
});
/* ---------------------------- Market: Teams (Paginado) --------------------------- */
exports.getMarketTeams = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    try {
        if (!auth)
            throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
        const { lastId } = (data !== null && data !== void 0 ? data : {});
        let q = db
            .collection('teams')
            .where('lookingForPlayers', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(DEFAULT_PAGE_SIZE);
        if (lastId) {
            const lastDoc = await db.collection('teams').doc(lastId).get();
            if (lastDoc.exists)
                q = q.startAfter(lastDoc);
        }
        const snap = await q.get();
        const teams = snap.docs.map((d) => {
            var _a;
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
                createdAt: (_a = t.createdAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString(),
            };
        });
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        return { teams, nextLastId: lastDoc ? lastDoc.id : null };
    }
    catch (err) {
        // *** CORRECCIÓN: Usar throw ***
        throw mapErrorToHttpsError('getMarketTeams', err);
    }
});
/* --------------------------- Honor Rankings (Paginado) --------------------------- */
exports.getHonorRankings = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    try {
        if (!auth)
            throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
        const { lastId } = (data !== null && data !== void 0 ? data : {});
        let q = db
            .collection('users')
            .where('totalHonors', '>', 0)
            .orderBy('totalHonors', 'desc')
            .limit(DEFAULT_PAGE_SIZE);
        if (lastId) {
            const lastDoc = await db.collection('users').doc(lastId).get();
            if (lastDoc.exists)
                q = q.startAfter(lastDoc);
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
    }
    catch (err) {
        // *** CORRECCIÓN: Usar throw ***
        throw mapErrorToHttpsError('getHonorRankings', err);
    }
});
/* --------------------------- Scrim Rankings (Paginado) --------------------------- */
exports.getScrimRankings = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    try {
        if (!auth)
            throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
        const { lastId } = (data !== null && data !== void 0 ? data : {});
        let q = db
            .collection('teams')
            .where('stats.scrimsPlayed', '>', 0)
            .orderBy('stats.scrimsPlayed') // Asegúrate que el índice existe
            .orderBy('winRate', 'desc') // Asegúrate que el índice existe
            .orderBy('stats.scrimsWon', 'desc') // Asegúrate que el índice existe
            .limit(DEFAULT_PAGE_SIZE);
        if (lastId) {
            const lastDoc = await db.collection('teams').doc(lastId).get();
            if (lastDoc.exists)
                q = q.startAfter(lastDoc);
        }
        const snap = await q.get();
        const rankings = snap.docs.map((d) => {
            var _a, _b, _c;
            const t = d.data();
            const played = ((_a = t.stats) === null || _a === void 0 ? void 0 : _a.scrimsPlayed) || 0;
            const won = ((_b = t.stats) === null || _b === void 0 ? void 0 : _b.scrimsWon) || 0;
            const winRate = t.winRate || 0; // Asume campo denormalizado
            return {
                id: d.id,
                name: t.name, // Añadir campos necesarios para UI
                avatarUrl: t.avatarUrl, // Añadir campos necesarios para UI
                winRate,
                played,
                won,
                createdAt: (_c = t.createdAt) === null || _c === void 0 ? void 0 : _c.toDate().toISOString(),
            };
        });
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        return { rankings, nextLastId: lastDoc ? lastDoc.id : null };
    }
    catch (err) {
        // *** CORRECCIÓN: Usar throw ***
        throw mapErrorToHttpsError('getScrimRankings', err);
    }
});
/* ----------------------- Tournament Rankings (Paginado) -------------------------- */
exports.getTournamentRankings = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    try {
        if (!auth)
            throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
        const { lastId } = (data !== null && data !== void 0 ? data : {});
        let q = db
            .collection('tournaments')
            .where('status', '==', 'completed')
            .where('winnerId', '!=', null)
            .orderBy('winnerId') // Asegúrate que el índice existe
            .orderBy('startDate', 'desc') // Asegúrate que el índice existe
            .limit(DEFAULT_PAGE_SIZE);
        if (lastId) {
            const lastDoc = await db.collection('tournaments').doc(lastId).get();
            if (lastDoc.exists)
                q = q.startAfter(lastDoc);
        }
        const snap = await q.get();
        const tournaments = snap.docs.map((d) => {
            var _a;
            const t = d.data();
            // Devuelve solo los campos necesarios para el ranking
            return {
                id: d.id,
                name: t.name,
                winnerId: t.winnerId,
                // Podrías añadir winnerName y winnerAvatar si los denormalizas en el torneo
                startDate: (_a = t.startDate) === null || _a === void 0 ? void 0 : _a.toDate().toISOString(),
                prize: t.prize, // Opcional
                currency: t.currency, // Opcional
            };
        });
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        return { tournaments, nextLastId: lastDoc ? lastDoc.id : null };
    }
    catch (err) {
        // *** CORRECCIÓN: Usar throw ***
        throw mapErrorToHttpsError('getTournamentRankings', err);
    }
});
/* --------------------------- Managed Users (Paginado) ---------------------------- */
exports.getManagedUsers = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: callerAuth, data }) => {
    try {
        if (!callerAuth)
            throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
        const { role } = callerAuth.token;
        if (role !== 'admin' && role !== 'moderator') {
            throw new https_1.HttpsError('permission-denied', 'You do not have permission.');
        }
        const { lastId } = (data !== null && data !== void 0 ? data : {});
        let q = db.collection('users').orderBy('name').limit(DEFAULT_PAGE_SIZE);
        if (lastId) {
            const lastDoc = await db.collection('users').doc(lastId).get();
            if (lastDoc.exists)
                q = q.startAfter(lastDoc);
        }
        const snap = await q.get();
        const users = snap.docs.map((d) => {
            var _a, _b, _c, _d, _e;
            const u = d.data();
            return {
                id: d.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatarUrl: u.avatarUrl,
                isCertifiedStreamer: (_a = u.isCertifiedStreamer) !== null && _a !== void 0 ? _a : false,
                disabled: (_b = u.disabled) !== null && _b !== void 0 ? _b : false,
                createdAt: ((_c = u.createdAt) === null || _c === void 0 ? void 0 : _c.toDate().toISOString()) || null,
                banUntil: ((_d = u.banUntil) === null || _d === void 0 ? void 0 : _d.toDate().toISOString()) || null,
                _claimsRefreshedAt: ((_e = u._claimsRefreshedAt) === null || _e === void 0 ? void 0 : _e.toDate().toISOString()) || null,
            };
        });
        const lastDoc = snap.docs[snap.docs.length - 1] || null;
        return { users, nextLastId: lastDoc ? lastDoc.id : null };
    }
    catch (err) {
        throw mapErrorToHttpsError('getManagedUsers', err);
    }
});
/* ----------------------------- Team Members (Sin Paginación - OK) --------------------------- */
exports.getTeamMembers = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    var _a;
    try {
        const { teamId } = ((_a = request.data) !== null && _a !== void 0 ? _a : {});
        if (!teamId)
            throw new https_1.HttpsError('invalid-argument', 'Team ID is required.');
        if (!request.auth)
            throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
        // Aquí podrías añadir una comprobación de permisos si solo miembros/staff pueden ver la lista
        const membersSnap = await db.collection(`teams/${teamId}/members`).get();
        const memberIds = membersSnap.docs.map((d) => d.id);
        if (memberIds.length === 0)
            return [];
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
            var _a, _b, _c;
            const memberData = d.data();
            const userData = usersMap.get(d.id) || {};
            return {
                // Datos del miembro (subcolección)
                id: d.id,
                role: memberData.role,
                isIGL: (_a = memberData.isIGL) !== null && _a !== void 0 ? _a : false,
                joinedAt: (_b = memberData.joinedAt) === null || _b === void 0 ? void 0 : _b.toDate().toISOString(),
                // Datos del usuario (colección /users)
                name: userData.name,
                avatarUrl: userData.avatarUrl,
                country: userData.country,
                rank: userData.rank,
                skills: userData.skills,
                isCertifiedStreamer: (_c = userData.isCertifiedStreamer) !== null && _c !== void 0 ? _c : false,
                // Excluye datos sensibles como email, blocked, etc.
            };
        });
    }
    catch (err) {
        throw mapErrorToHttpsError('getTeamMembers', err);
    }
});
//# sourceMappingURL=public.js.map