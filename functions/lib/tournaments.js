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
exports.deleteTournament = exports.editTournament = exports.reviewTournamentProposal = exports.proposeTournament = exports.registerTeamForTournament = exports.reportRoundRobinMatchResult = exports.reportBracketMatchResult = exports.generateTournamentStructure = void 0;
// src/functions/tournaments.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
// ---------------------- Enums y helpers ----------------------
const MatchStatus = ['pending', 'awaiting_opponent', 'locked', 'completed'];
// const TournamentStatus = ['upcoming','ongoing','completed'] as const;
function requireAuth(req) {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const role = req.auth.token?.role ?? 'user';
    const isCertifiedStreamer = Boolean(req.auth.token?.isCertifiedStreamer);
    return { uid: req.auth.uid, role, isCertifiedStreamer };
}
// ---------------------- Schemas Zod ----------------------
const ProposeTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(80),
    game: zod_1.z.string().min(1),
    description: zod_1.z.string().min(10).max(5000),
    proposedDate: zod_1.z.string().datetime(),
    format: zod_1.z.enum(['single-elimination', 'round-robin']),
    maxTeams: zod_1.z.number().int().min(2).max(128),
    rankMin: zod_1.z.string().optional(),
    rankMax: zod_1.z.string().optional(),
    prize: zod_1.z.number().nonnegative().optional(),
    currency: zod_1.z.string().length(3).optional(),
});
const ReviewTournamentSchema = zod_1.z.object({
    proposalId: zod_1.z.string().min(1),
    status: zod_1.z.enum(['approved', 'rejected']),
});
const EditTournamentSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(3).max(80).optional(),
    description: zod_1.z.string().min(10).max(5000).optional(),
    prize: zod_1.z.number().nonnegative().nullable().optional(),
    currency: zod_1.z.string().length(3).nullable().optional(),
    rankMin: zod_1.z.string().nullable().optional(),
    rankMax: zod_1.z.string().nullable().optional(),
});
const DeleteTournamentSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
});
const RegisterTeamSchema = zod_1.z.object({
    tournamentId: zod_1.z.string().min(1),
    teamId: zod_1.z.string().min(1),
});
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
// ---------------------- Funciones ----------------------
/**
 * Generar estructura de torneo (bracket o round-robin).
 * Requiere rol admin/moderator.
 */
exports.generateTournamentStructure = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    const { role } = requireAuth(request);
    if (!['admin', 'moderator'].includes(role)) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permiso.');
    }
    const { tournamentId } = request.data ?? {};
    if (!tournamentId)
        throw new https_1.HttpsError('invalid-argument', 'Falta Tournament ID.');
    const tournamentRef = db.doc(`tournaments/${tournamentId}`);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists)
            throw new https_1.HttpsError('not-found', 'Torneo no encontrado.');
        const tournamentData = tournamentSnap.data();
        const { format } = tournamentData;
        // Cargar equipos registrados
        const teamsSnap = await tournamentRef.collection('teams').get();
        const teams = teamsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                teamName: data.teamName ?? '',
                teamAvatarUrl: data.teamAvatarUrl ?? null,
                registeredAt: data.registeredAt ?? admin.firestore.Timestamp.now(),
            };
        });
        if (teams.length < 2)
            throw new https_1.HttpsError('failed-precondition', 'No hay suficientes equipos.');
        const batch = db.batch();
        if (format === 'single-elimination') {
            // Mezclar equipos y crear primera ronda (gestiona BYEs)
            const shuffled = [...teams].sort(() => Math.random() - 0.5);
            let currentRoundMatches = [];
            for (let i = 0; i < shuffled.length; i += 2) {
                const matchRef = tournamentRef.collection('matches').doc();
                const teamA = { id: shuffled[i].id, name: shuffled[i].teamName, avatarUrl: shuffled[i].teamAvatarUrl };
                const teamB = shuffled[i + 1]
                    ? { id: shuffled[i + 1].id, name: shuffled[i + 1].teamName, avatarUrl: shuffled[i + 1].teamAvatarUrl }
                    : null;
                const hasBye = !teamB;
                const matchData = {
                    round: 1,
                    teamA,
                    teamB,
                    nextMatchId: null,
                    status: hasBye ? 'awaiting_opponent' : 'pending',
                    winnerId: hasBye ? teamA.id : null,
                };
                currentRoundMatches.push({ id: matchRef.id, ...matchData });
                batch.set(matchRef, matchData);
            }
            // Construir rondas siguientes, encadenando nextMatchId
            let matchesInCurrentRound = currentRoundMatches.length;
            while (matchesInCurrentRound > 1) {
                const previousRoundMatches = [...currentRoundMatches];
                currentRoundMatches = [];
                // Crear siguientes partidos
                for (let i = 0; i < matchesInCurrentRound; i += 2) {
                    const nextMatchRef = tournamentRef.collection('matches').doc();
                    const nextMatchData = { round: (previousRoundMatches[0].round + 1), teamA: null, teamB: null, nextMatchId: null, status: 'locked' };
                    currentRoundMatches.push({ id: nextMatchRef.id, ...nextMatchData });
                    batch.set(nextMatchRef, nextMatchData);
                }
                // Ligar previous -> next y propagar BYEs a A o B según toque
                for (let i = 0; i < previousRoundMatches.length; i++) {
                    const prev = previousRoundMatches[i];
                    const nextId = currentRoundMatches[Math.floor(i / 2)].id;
                    // Setear nextMatchId al partido previo
                    batch.update(tournamentRef.collection('matches').doc(prev.id), { nextMatchId: nextId });
                    // Si ya hay ganador por BYE, colocarlo en el slot correcto
                    if (prev.winnerId) {
                        const winnerData = prev.teamA && prev.teamA.id === prev.winnerId ? prev.teamA : prev.teamB;
                        const slot = (i % 2 === 0) ? 'teamA' : 'teamB';
                        const nextMatchRef = tournamentRef.collection('matches').doc(nextId);
                        // Para evitar leer dentro del batch, determinamos el estado sin lookup extra:
                        // - Si llenamos teamA y teamB ya está vacío -> awaiting_opponent
                        // - Si llenamos teamB y A ya debe existir o no -> pending si ambos presentes
                        // El estado final lo podemos normalizar más tarde en reportBracketMatchResult.
                        batch.update(nextMatchRef, { [slot]: winnerData, status: (slot === 'teamA') ? 'awaiting_opponent' : 'pending' });
                    }
                }
                matchesInCurrentRound = Math.ceil(matchesInCurrentRound / 2);
            }
        }
        else if (format === 'round-robin') {
            // Tabla inicial de posiciones
            for (const team of teams) {
                const standingRef = tournamentRef.collection('standings').doc(team.id);
                batch.set(standingRef, {
                    teamId: team.id,
                    teamName: team.teamName,
                    teamAvatarUrl: team.teamAvatarUrl ?? null,
                    wins: 0, losses: 0, draws: 0, points: 0,
                });
            }
            // Calendario: todos contra todos una vez
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    const scheduleRef = tournamentRef.collection('schedule').doc();
                    batch.set(scheduleRef, {
                        teamA: { id: teams[i].id, name: teams[i].teamName, avatarUrl: teams[i].teamAvatarUrl ?? null },
                        teamB: { id: teams[j].id, name: teams[j].teamName, avatarUrl: teams[j].teamAvatarUrl ?? null },
                        status: 'pending',
                        winnerId: null,
                    });
                }
            }
        }
        else {
            throw new https_1.HttpsError('unimplemented', `El formato "${format}" no está soportado.`);
        }
        batch.update(tournamentRef, { status: 'ongoing' });
        await batch.commit();
        return { success: true, message: `Estructura generada para formato ${format}.` };
    }
    catch (error) {
        console.error('Error generating tournament structure:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to generate tournament structure.');
    }
});
/** Reportar resultado en bracket (solo admin/mod) */
exports.reportBracketMatchResult = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { role } = requireAuth(request);
    if (!['admin', 'moderator'].includes(role)) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permiso.');
    }
    try {
        const { tournamentId, matchId, winnerId } = ReportBracketMatchResultSchema.parse(request.data);
        const tournamentRef = db.doc(`tournaments/${tournamentId}`);
        const matchRef = tournamentRef.collection('matches').doc(matchId);
        await db.runTransaction(async (tx) => {
            const matchDoc = await tx.get(matchRef);
            if (!matchDoc.exists)
                throw new https_1.HttpsError('not-found', 'Match not found.');
            const matchData = matchDoc.data();
            if (!matchData.teamA || !matchData.teamB)
                throw new https_1.HttpsError('failed-precondition', 'Match is not ready.');
            if (matchData.winnerId)
                throw new https_1.HttpsError('failed-precondition', 'Match already has a winner.');
            const winnerData = winnerId === matchData.teamA.id ? matchData.teamA :
                winnerId === matchData.teamB.id ? matchData.teamB : null;
            if (!winnerData)
                throw new https_1.HttpsError('invalid-argument', 'Winner ID does not match teams.');
            tx.update(matchRef, { winnerId, status: 'completed' });
            if (matchData.nextMatchId) {
                const nextRef = tournamentRef.collection('matches').doc(matchData.nextMatchId);
                const nextDoc = await tx.get(nextRef);
                if (!nextDoc.exists)
                    throw new https_1.HttpsError('internal', 'Next match reference broken.');
                const next = nextDoc.data();
                if (!next.teamA) {
                    tx.update(nextRef, { teamA: winnerData, status: next.teamB ? 'pending' : 'awaiting_opponent' });
                }
                else if (!next.teamB) {
                    tx.update(nextRef, { teamB: winnerData, status: 'pending' });
                }
            }
            else {
                tx.update(tournamentRef, { winnerId, status: 'completed' });
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
/** Reportar resultado en round-robin (solo admin/mod) */
exports.reportRoundRobinMatchResult = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { role } = requireAuth(request);
    if (!['admin', 'moderator'].includes(role)) {
        throw new https_1.HttpsError('permission-denied', 'No tienes permiso.');
    }
    try {
        const { tournamentId, matchId, winnerId, loserId } = ReportRoundRobinMatchResultSchema.parse(request.data);
        const tRef = db.doc(`tournaments/${tournamentId}`);
        const mRef = tRef.collection('schedule').doc(matchId);
        const winRef = tRef.collection('standings').doc(winnerId);
        const losRef = tRef.collection('standings').doc(loserId);
        await db.runTransaction(async (tx) => {
            const [mDoc, wDoc, lDoc] = await Promise.all([tx.get(mRef), tx.get(winRef), tx.get(losRef)]);
            if (!mDoc.exists || mDoc.data()?.status === 'completed') {
                throw new https_1.HttpsError('failed-precondition', 'Match not reportable.');
            }
            if (!wDoc.exists || !lDoc.exists)
                throw new https_1.HttpsError('not-found', 'Standings document not found.');
            tx.update(mRef, { status: 'completed', winnerId });
            tx.update(winRef, { wins: admin.firestore.FieldValue.increment(1) });
            tx.update(losRef, { losses: admin.firestore.FieldValue.increment(1) });
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
/** Registrar equipo en torneo (control de concurrencia por límite) */
exports.registerTeamForTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { uid } = requireAuth(request);
    const { tournamentId, teamId } = RegisterTeamSchema.parse(request.data);
    const tRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid); // requiere subcolección con roles
    const regRef = tRef.collection("teams").doc(teamId);
    try {
        await db.runTransaction(async (tx) => {
            const [tSnap, teamSnap, memberSnap, regSnap] = await Promise.all([
                tx.get(tRef), tx.get(teamRef), tx.get(memberRef), tx.get(regRef)
            ]);
            if (!tSnap.exists)
                throw new https_1.HttpsError("not-found", "El torneo no existe.");
            if (!teamSnap.exists)
                throw new https_1.HttpsError("not-found", "El equipo no existe.");
            if (!memberSnap.exists || !['founder', 'coach'].includes(memberSnap.data()?.role)) {
                throw new https_1.HttpsError("permission-denied", "Solo founder/coach puede registrar.");
            }
            if (regSnap.exists)
                throw new https_1.HttpsError("already-exists", "Equipo ya registrado.");
            const td = tSnap.data();
            if (td.status !== 'upcoming')
                throw new https_1.HttpsError("failed-precondition", "Torneo no abierto.");
            // Control real del cupo dentro de la transacción
            const regsSnap = await tx.get(tRef.collection("teams").limit(td.maxTeams));
            if (regsSnap.size >= td.maxTeams)
                throw new https_1.HttpsError("failed-precondition", "Torneo lleno.");
            tx.set(regRef, {
                teamId,
                teamName: teamSnap.data()?.name ?? '',
                teamAvatarUrl: teamSnap.data()?.avatarUrl ?? null,
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // increment para UI (no se confía en esto para el cupo)
            tx.update(tRef, { registeredTeamsCount: admin.firestore.FieldValue.increment(1) });
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
/** Proponer torneo (certificado o staff) */
exports.proposeTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { uid, role, isCertifiedStreamer } = requireAuth(request);
    if (!isCertifiedStreamer && !['admin', 'moderator'].includes(role)) {
        throw new https_1.HttpsError("permission-denied", "Solo usuarios certificados o staff pueden proponer.");
    }
    const data = ProposeTournamentSchema.parse(request.data);
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists)
            throw new https_1.HttpsError("not-found", "Perfil no encontrado.");
        const userData = userDoc.data();
        const proposalRef = db.collection("tournamentProposals").doc();
        await proposalRef.set({
            id: proposalRef.id,
            proposerUid: uid,
            proposerName: userData?.name ?? 'Unknown User',
            proposerCountry: userData?.country ?? '',
            tournamentName: data.name,
            game: data.game,
            description: data.description,
            format: data.format,
            maxTeams: data.maxTeams,
            proposedDate: admin.firestore.Timestamp.fromDate(new Date(data.proposedDate)),
            rankMin: data.rankMin ?? '',
            rankMax: data.rankMax ?? '',
            prize: data.prize ?? null,
            currency: data.currency ?? '',
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
/** Revisar propuesta (mod/admin). Si aprueba, crea torneo filtrando campos. */
exports.reviewTournamentProposal = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { uid, role } = requireAuth(request);
    if (!['moderator', 'admin'].includes(role))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    const { proposalId, status } = ReviewTournamentSchema.parse(request.data);
    const proposalRef = db.collection("tournamentProposals").doc(proposalId);
    try {
        await db.runTransaction(async (tx) => {
            const p = await tx.get(proposalRef);
            if (!p.exists)
                throw new https_1.HttpsError("not-found", "Propuesta no encontrada.");
            const pr = p.data();
            if (pr.status !== 'pending')
                throw new https_1.HttpsError("failed-precondition", "Propuesta ya revisada.");
            const reviewedAt = admin.firestore.Timestamp.now();
            tx.update(proposalRef, { status, reviewedBy: uid, reviewedAt });
            if (status === 'approved') {
                const { tournamentName, game, description, proposedDate, format, maxTeams } = pr;
                if (!tournamentName || !game || !description || !proposedDate || !format || !maxTeams) {
                    throw new https_1.HttpsError("failed-precondition", "Datos de propuesta inválidos.");
                }
                const tRef = db.collection('tournaments').doc();
                tx.set(tRef, {
                    id: tRef.id,
                    name: tournamentName,
                    game,
                    description,
                    startsAt: proposedDate, // guardar como Timestamp ya viene desde la propuesta
                    format,
                    maxTeams,
                    registeredTeamsCount: 0,
                    winnerId: null,
                    status: 'upcoming',
                    createdAt: reviewedAt,
                    proposalId,
                });
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
/** Editar torneo (owner o staff), filtrando campos no editables */
exports.editTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { uid, role } = requireAuth(request);
    const data = EditTournamentSchema.parse(request.data);
    const { tournamentId, ...updateData } = data;
    const tRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tSnap = await tRef.get();
        if (!tSnap.exists)
            throw new https_1.HttpsError("not-found", "Torneo no encontrado.");
        const tData = tSnap.data();
        const isOwner = tData?.organizer?.uid === uid; // si usas organizer
        const isModOrAdmin = ['moderator', 'admin'].includes(role);
        if (!isOwner && !isModOrAdmin) {
            throw new https_1.HttpsError("permission-denied", "No autorizado para editar.");
        }
        // Filtrar campos que no deben editarse
        const forbidden = ['organizer', 'status', 'id', 'createdAt', 'proposalId', 'registeredTeamsCount', 'winnerId'];
        forbidden.forEach((k) => delete updateData[k]);
        await tRef.update(updateData);
        return { success: true, message: "Torneo actualizado." };
    }
    catch (error) {
        console.error(`Error editing tournament ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "No se pudo actualizar.");
    }
});
/** Eliminar torneo (mod/admin) con borrado recursivo de subcolecciones */
exports.deleteTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    const { role } = requireAuth(request);
    if (!['moderator', 'admin'].includes(role))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    const { tournamentId } = DeleteTournamentSchema.parse(request.data);
    const tRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tSnap = await tRef.get();
        if (!tSnap.exists)
            return { success: true, message: "Ya estaba borrado." };
        const proposalId = tSnap.data()?.proposalId;
        await deleteCollection(db, `tournaments/${tournamentId}/teams`);
        await deleteCollection(db, `tournaments/${tournamentId}/matches`);
        await deleteCollection(db, `tournaments/${tournamentId}/schedule`);
        await deleteCollection(db, `tournaments/${tournamentId}/standings`);
        const batch = db.batch();
        batch.delete(tRef);
        if (proposalId)
            batch.delete(db.collection("tournamentProposals").doc(proposalId));
        await batch.commit();
        return { success: true, message: "Torneo borrado." };
    }
    catch (error) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "No se pudo borrar el torneo.");
    }
});
// ---------------------- Helper: borrar colecciones en lotes ----------------------
async function deleteCollection(dbi, collectionPath, batchSize = 400) {
    const collectionRef = dbi.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        const batch = dbi.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        if (snapshot.size < batchSize)
            break;
        query = collectionRef.orderBy('__name__')
            .startAfter(snapshot.docs[snapshot.docs.length - 1])
            .limit(batchSize);
    }
    console.log(`Finished deleting collection: ${collectionPath}`);
}
//# sourceMappingURL=tournaments.js.map