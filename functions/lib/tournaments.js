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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTournament = exports.editTournament = exports.reviewTournamentProposal = exports.proposeTournament = exports.registerTeamForTournament = exports.reportRoundRobinMatchResult = exports.reportBracketMatchResult = exports.generateTournamentStructure = void 0;
// src/functions/tournaments.ts
// *** CORRECCIÓN: Importar CallableRequest ***
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod"); // Asegúrate de tener 'zod' en tu package.json
const db = admin.firestore();
// --- Esquemas de Zod para validación ---
const ReportBracketMatchResultSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    matchId: zod_1.z.string().min(1),
    winnerId: zod_1.z.string().min(1),
});
const ReportRoundRobinMatchResultSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    matchId: zod_1.z.string().min(1),
    winnerId: zod_1.z.string().min(1),
    loserId: zod_1.z.string().min(1),
});
// --- FUNCIONES ---
// *** CORRECCIÓN: Tipar el request ***
exports.generateTournamentStructure = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth || !['admin', 'moderator'].includes(request.auth.token.role)) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permiso.');
    }
    const { tournamentId } = request.data; // <-- Ahora request.data está tipado
    if (!tournamentId) {
        throw new https_1.HttpsError('invalid-argument', 'Falta Tournament ID.');
    }
    const tournamentRef = db.doc(`tournaments/${tournamentId}`);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists)
            throw new https_1.HttpsError('not-found', 'Torneo no encontrado.');
        const tournamentData = tournamentSnap.data();
        const { format } = tournamentData;
        const teamsSnap = await tournamentRef.collection('teams').get();
        // *** CORRECCIÓN: Aplicar tipo RegisteredTeam ***
        const teams = teamsSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        if (teams.length < 2)
            throw new https_1.HttpsError('failed-precondition', 'No hay suficientes equipos.');
        const batch = db.batch();
        if (format === 'single-elimination') {
            const shuffledTeams = teams.sort(() => 0.5 - Math.random());
            let round = 1;
            let currentRoundMatches = [];
            let nextRoundMatchIds = [];
            for (let i = 0; i < shuffledTeams.length; i += 2) {
                const matchRef = tournamentRef.collection('matches').doc();
                // *** CORREGIDO: TypeScript ahora sabe que .teamName y .teamAvatarUrl existen ***
                const teamAData = { id: shuffledTeams[i].id, name: shuffledTeams[i].teamName, avatarUrl: shuffledTeams[i].teamAvatarUrl };
                const teamBData = shuffledTeams[i + 1] ? { id: shuffledTeams[i + 1].id, name: shuffledTeams[i + 1].teamName, avatarUrl: shuffledTeams[i + 1].teamAvatarUrl } : null;
                const matchData = {
                    round: 1, teamA: teamAData, teamB: teamBData, nextMatchId: null,
                    status: teamBData ? 'pending' : 'awaiting_opponent',
                    winnerId: teamBData ? null : teamAData.id
                };
                currentRoundMatches.push(Object.assign({ id: matchRef.id }, matchData));
                batch.set(matchRef, matchData);
            }
            let matchesInCurrentRound = currentRoundMatches.length;
            while (matchesInCurrentRound > 1) {
                round++;
                const previousRoundMatches = [...currentRoundMatches];
                currentRoundMatches = [];
                nextRoundMatchIds = [];
                for (let i = 0; i < matchesInCurrentRound; i += 2) {
                    const matchRef = tournamentRef.collection('matches').doc();
                    nextRoundMatchIds.push(matchRef.id);
                    const matchData = { round: round, teamA: null, teamB: null, nextMatchId: null, status: 'locked' };
                    currentRoundMatches.push(Object.assign({ id: matchRef.id }, matchData));
                    batch.set(matchRef, matchData);
                }
                for (let i = 0; i < previousRoundMatches.length; i++) {
                    const matchIdToUpdate = previousRoundMatches[i].id;
                    const nextMatchId = nextRoundMatchIds[Math.floor(i / 2)];
                    batch.update(tournamentRef.collection('matches').doc(matchIdToUpdate), { nextMatchId: nextMatchId });
                    // Avanzar equipos 'bye'
                    if (previousRoundMatches[i].winnerId) {
                        const winnerData = previousRoundMatches[i].teamA;
                        const nextMatchRef = tournamentRef.collection('matches').doc(nextMatchId);
                        if (i % 2 === 0) { // Si es el primer partido (par), va al slot A
                            batch.update(nextMatchRef, { teamA: winnerData, status: 'awaiting_opponent' });
                        }
                        // (La lógica para el slot B se complica si AMBOS avanzan,
                        // se manejará mejor en reportBracketMatchResult)
                    }
                }
                matchesInCurrentRound = Math.ceil(matchesInCurrentRound / 2);
            }
        }
        else if (format === 'round-robin') {
            teams.forEach(team => {
                const standingRef = tournamentRef.collection('standings').doc(team.id);
                // *** CORREGIDO: TypeScript ahora sabe que team.teamName existe ***
                batch.set(standingRef, {
                    teamId: team.id, teamName: team.teamName, teamAvatarUrl: team.teamAvatarUrl,
                    wins: 0, losses: 0, draws: 0, points: 0
                });
            });
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    const matchRef = tournamentRef.collection('schedule').doc();
                    // *** CORREGIDO: TypeScript ahora sabe que .teamName y .teamAvatarUrl existen ***
                    batch.set(matchRef, {
                        teamA: { id: teams[i].id, name: teams[i].teamName, avatarUrl: teams[i].teamAvatarUrl },
                        teamB: { id: teams[j].id, name: teams[j].teamName, avatarUrl: teams[j].teamAvatarUrl },
                        status: 'pending', winnerId: null,
                    });
                }
            }
        }
        else {
            throw new https_1.HttpsError('unimplemented', `The format "${format}" is not supported yet.`);
        }
        batch.update(tournamentRef, { status: 'ongoing' });
        await batch.commit();
        return { success: true, message: `Structure for ${format} tournament generated.` };
    }
    catch (error) {
        console.error('Error generating tournament structure:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to generate tournament structure.');
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.reportBracketMatchResult = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth || !['admin', 'moderator'].includes(request.auth.token.role)) {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission to report results.');
    }
    try {
        // *** CORRECCIÓN: Zod parsea request.data (ahora tipado) ***
        const { tournamentId, matchId, winnerId } = ReportBracketMatchResultSchema.parse(request.data);
        const tournamentRef = db.doc(`tournaments/${tournamentId}`);
        const matchRef = tournamentRef.collection('matches').doc(matchId);
        await db.runTransaction(async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists)
                throw new https_1.HttpsError('not-found', 'Match not found.');
            const matchData = matchDoc.data();
            if (!matchData.teamA || !matchData.teamB)
                throw new https_1.HttpsError('failed-precondition', 'Match is not ready.');
            if (matchData.winnerId)
                throw new https_1.HttpsError('failed-precondition', 'Match already has a winner.');
            const winnerData = winnerId === matchData.teamA.id ? matchData.teamA : matchData.teamB;
            if (!winnerData)
                throw new https_1.HttpsError('invalid-argument', 'Winner ID does not match teams.');
            transaction.update(matchRef, { winnerId: winnerId, status: 'completed' });
            if (matchData.nextMatchId) {
                const nextMatchRef = tournamentRef.collection('matches').doc(matchData.nextMatchId);
                const nextMatchDoc = await transaction.get(nextMatchRef);
                if (!nextMatchDoc.exists)
                    throw new https_1.HttpsError('internal', 'Next match reference broken.');
                const nextMatchData = nextMatchDoc.data();
                if (!nextMatchData.teamA) {
                    transaction.update(nextMatchRef, { teamA: winnerData, status: nextMatchData.teamB ? 'pending' : 'awaiting_opponent' });
                }
                else if (!nextMatchData.teamB) {
                    transaction.update(nextMatchRef, { teamB: winnerData, status: 'pending' });
                }
            }
            else {
                transaction.update(tournamentRef, { winnerId: winnerId, status: 'completed' });
            }
        });
        return { success: true, message: 'Match result reported.' };
    }
    catch (error) {
        console.error('Error reporting bracket match result:', error);
        if (error instanceof zod_1.z.ZodError)
            throw new https_1.HttpsError('invalid-argument', 'Invalid data: ' + error.message);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to report result.');
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.reportRoundRobinMatchResult = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth || !['admin', 'moderator'].includes(request.auth.token.role)) {
        throw new https_1.HttpsError('permission-denied', 'You do not have permission.');
    }
    try {
        // *** CORRECCIÓN: Zod parsea request.data (ahora tipado) ***
        const { tournamentId, matchId, winnerId, loserId } = ReportRoundRobinMatchResultSchema.parse(request.data);
        const tournamentRef = db.doc(`tournaments/${tournamentId}`);
        const matchRef = tournamentRef.collection('schedule').doc(matchId);
        const winnerStandingsRef = tournamentRef.collection('standings').doc(winnerId);
        const loserStandingsRef = tournamentRef.collection('standings').doc(loserId);
        await db.runTransaction(async (transaction) => {
            var _a;
            const [matchDoc, winnerDoc, loserDoc] = await Promise.all([
                transaction.get(matchRef), transaction.get(winnerStandingsRef), transaction.get(loserStandingsRef)
            ]);
            if (!matchDoc.exists || ((_a = matchDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'completed')
                throw new https_1.HttpsError('failed-precondition', 'Match not reportable.');
            if (!winnerDoc.exists || !loserDoc.exists)
                throw new https_1.HttpsError('not-found', 'Standings document not found.');
            transaction.update(matchRef, { status: 'completed', winnerId: winnerId });
            transaction.update(winnerStandingsRef, { wins: admin.firestore.FieldValue.increment(1) });
            transaction.update(loserStandingsRef, { losses: admin.firestore.FieldValue.increment(1) });
        });
        return { success: true, message: 'Match result reported.' };
    }
    catch (error) {
        console.error('Error reporting round-robin match result:', error);
        if (error instanceof zod_1.z.ZodError)
            throw new https_1.HttpsError('invalid-argument', 'Invalid data: ' + error.message);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to report result.');
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.registerTeamForTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "...");
    const { uid } = request.auth;
    const { tournamentId, teamId } = request.data; // <-- Tipado
    if (!tournamentId || !teamId)
        throw new https_1.HttpsError("invalid-argument", "...");
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid);
    const registrationRef = tournamentRef.collection("teams").doc(teamId);
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            const [tournamentSnap, teamSnap, memberSnap, registrationSnap] = await Promise.all([
                transaction.get(tournamentRef),
                transaction.get(teamRef),
                transaction.get(memberRef),
                transaction.get(registrationRef)
            ]);
            if (!tournamentSnap.exists)
                throw new https_1.HttpsError("not-found", "El torneo no existe.");
            if (!teamSnap.exists)
                throw new https_1.HttpsError("not-found", "Tu equipo no existe.");
            if (!memberSnap.exists || !['founder', 'coach'].includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role))
                throw new https_1.HttpsError("permission-denied", "Solo staff puede registrar.");
            if (registrationSnap.exists)
                throw new https_1.HttpsError("already-exists", "Equipo ya registrado.");
            const tournamentData = tournamentSnap.data();
            const teamData = teamSnap.data();
            if (tournamentData.status !== 'upcoming')
                throw new https_1.HttpsError("failed-precondition", "Torneo no abierto.");
            const currentTeamsCount = tournamentData.registeredTeamsCount || 0;
            if (currentTeamsCount >= tournamentData.maxTeams)
                throw new https_1.HttpsError("failed-precondition", "Torneo lleno.");
            // ... Validación de Rango ...
            transaction.set(registrationRef, {
                teamId: teamId,
                teamName: teamData.name,
                teamAvatarUrl: teamData.avatarUrl,
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(tournamentRef, {
                registeredTeamsCount: admin.firestore.FieldValue.increment(1)
            });
        });
        return { success: true, message: "Equipo registrado." };
    }
    catch (error) {
        console.error(`Error registrando equipo ${teamId} en torneo ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Error al registrar.');
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.proposeTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "...");
    const { uid, token } = request.auth;
    if (!token.isCertifiedStreamer && token.role !== 'admin' && token.role !== 'moderator') {
        throw new https_1.HttpsError("permission-denied", "Solo usuarios certificados o staff pueden proponer.");
    }
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { name, game, description, proposedDate, format, maxTeams, rankMin, rankMax, prize, currency } = request.data;
    if (!name || !game || !description || !proposedDate || !format || !maxTeams) {
        throw new https_1.HttpsError("invalid-argument", "Faltan detalles requeridos.");
    }
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists)
            throw new https_1.HttpsError("not-found", "Perfil no encontrado.");
        const userData = userDoc.data();
        const proposerName = userData.name || 'Unknown User';
        const proposerCountry = userData.country || '';
        const proposalRef = db.collection("tournamentProposals").doc();
        await proposalRef.set({
            id: proposalRef.id,
            proposerUid: uid,
            proposerName: proposerName,
            proposerCountry: proposerCountry,
            tournamentName: name, game, description, format, maxTeams,
            proposedDate: admin.firestore.Timestamp.fromDate(new Date(proposedDate)),
            rankMin: rankMin || '', rankMax: rankMax || '',
            prize: prize || null, currency: currency || '',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "Propuesta enviada." };
    }
    catch (error) {
        console.error(`Error proposing tournament by user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to submit proposal.');
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.reviewTournamentProposal = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "...");
    const { uid, token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin')
        throw new https_1.HttpsError("permission-denied", "...");
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { proposalId, status } = request.data;
    if (!proposalId || !['approved', 'rejected'].includes(status))
        throw new https_1.HttpsError("invalid-argument", "...");
    const proposalRef = db.collection("tournamentProposals").doc(proposalId);
    try {
        await db.runTransaction(async (transaction) => {
            const proposalSnap = await transaction.get(proposalRef);
            if (!proposalSnap.exists)
                throw new https_1.HttpsError("not-found", "...");
            const proposalData = proposalSnap.data();
            if (!proposalData || proposalData.status !== 'pending')
                throw new https_1.HttpsError("failed-precondition", "...");
            const reviewTimestamp = admin.firestore.Timestamp.now();
            transaction.update(proposalRef, { status: status, reviewedBy: uid, reviewedAt: reviewTimestamp });
            if (status === 'approved') {
                const { tournamentName, game, description, proposedDate, format, maxTeams } = proposalData;
                if (!tournamentName || !game || !description || !proposedDate || !format || !maxTeams) {
                    throw new https_1.HttpsError("failed-precondition", "Datos de propuesta inválidos.");
                }
                const tournamentRef = db.collection('tournaments').doc();
                transaction.set(tournamentRef, Object.assign(Object.assign({}, proposalData), { id: tournamentRef.id, registeredTeamsCount: 0, winnerId: null, status: 'upcoming', createdAt: reviewTimestamp, proposalId: proposalId }));
            }
        });
        return { success: true, message: `Propuesta ${status}.` };
    }
    catch (error) {
        console.error("Error in reviewTournamentProposal transaction:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Error al procesar.');
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.editTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "...");
    const { uid, token } = request.auth;
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const _a = request.data, { tournamentId } = _a, updateData = __rest(_a, ["tournamentId"]);
    if (!tournamentId)
        throw new https_1.HttpsError("invalid-argument", "...");
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists)
            throw new https_1.HttpsError("not-found", "...");
        const tournamentData = tournamentSnap.data();
        const isOwner = tournamentData.organizer.uid === uid;
        const isModOrAdmin = token.role === 'moderator' || token.role === 'admin';
        if (!isOwner && !isModOrAdmin)
            throw new https_1.HttpsError("permission-denied", "...");
        const allowedUpdates = Object.assign({}, updateData);
        delete allowedUpdates.organizer;
        delete allowedUpdates.status;
        delete allowedUpdates.id;
        // ... (etc.)
        await tournamentRef.update(allowedUpdates);
        return { success: true, message: "..." };
    }
    catch (error) {
        console.error(`Error editing tournament ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "...");
    }
});
// *** CORRECCIÓN: Tipar el request ***
exports.deleteTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "...");
    const { token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin')
        throw new https_1.HttpsError("permission-denied", "...");
    // *** CORRECCIÓN: Acceder a request.data (ahora tipado) ***
    const { tournamentId } = request.data;
    if (!tournamentId)
        throw new https_1.HttpsError("invalid-argument", "...");
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists)
            return { success: true, message: "..." };
        const proposalId = (_a = tournamentSnap.data()) === null || _a === void 0 ? void 0 : _a.proposalId;
        await deleteCollection(db, `tournaments/${tournamentId}/teams`);
        await deleteCollection(db, `tournaments/${tournamentId}/matches`);
        await deleteCollection(db, `tournaments/${tournamentId}/schedule`);
        await deleteCollection(db, `tournaments/${tournamentId}/standings`);
        const batch = db.batch();
        batch.delete(tournamentRef);
        if (proposalId) {
            batch.delete(db.collection("tournamentProposals").doc(proposalId));
        }
        await batch.commit();
        return { success: true, message: "..." };
    }
    catch (error) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "...");
    }
});
// --- FUNCIÓN DE AYUDA (Helper) para borrar colecciones ---
async function deleteCollection(db, collectionPath, batchSize = 400) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0)
            break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        if (snapshot.size < batchSize)
            break;
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
    console.log(`Finished deleting collection: ${collectionPath}`);
}
//# sourceMappingURL=tournaments.js.map