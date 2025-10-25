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
exports.deleteTournament = exports.editTournament = exports.reviewTournamentProposal = exports.proposeTournament = exports.registerTeamForTournament = void 0;
// src/functions/tournaments.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// --- FUNCIONES ---
exports.registerTeamForTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    // 1. Autenticación y Validación
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para registrar un equipo.");
    }
    const { uid } = request.auth;
    const { tournamentId, teamId } = request.data;
    if (!tournamentId || !teamId) {
        throw new https_1.HttpsError("invalid-argument", "Faltan IDs de torneo o equipo.");
    }
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid); // Referencia al usuario en el equipo
    const registrationRef = tournamentRef.collection("teams").doc(teamId); // Documento de registro
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            // 2. Obtener datos necesarios en la transacción
            const [tournamentSnap, teamSnap, memberSnap, registrationSnap] = await Promise.all([
                transaction.get(tournamentRef),
                transaction.get(teamRef),
                transaction.get(memberRef),
                transaction.get(registrationRef)
            ]);
            // 3. Validaciones
            if (!tournamentSnap.exists) {
                throw new https_1.HttpsError("not-found", "El torneo no existe.");
            }
            if (!teamSnap.exists) {
                throw new https_1.HttpsError("not-found", "Tu equipo no existe.");
            }
            if (!memberSnap.exists || !['founder', 'coach'].includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
                throw new https_1.HttpsError("permission-denied", "Solo el fundador o coach pueden registrar el equipo.");
            }
            if (registrationSnap.exists) {
                throw new https_1.HttpsError("already-exists", "Este equipo ya está registrado en el torneo.");
            }
            const tournamentData = tournamentSnap.data();
            const teamData = teamSnap.data();
            if (tournamentData.status !== 'upcoming') {
                throw new https_1.HttpsError("failed-precondition", "Este torneo no está abierto para inscripciones.");
            }
            const currentTeamsCount = tournamentData.registeredTeamsCount || 0;
            if (currentTeamsCount >= tournamentData.maxTeams) {
                throw new https_1.HttpsError("failed-precondition", "El torneo está lleno.");
            }
            // Aquí iría la validación de rango si la implementas
            // 4. Escribir el registro y actualizar contador
            transaction.set(registrationRef, {
                teamName: teamData.name,
                teamAvatarUrl: teamData.avatarUrl,
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
                // Puedes añadir más datos del equipo si los necesitas mostrar en la lista de inscritos
            });
            transaction.update(tournamentRef, {
                registeredTeamsCount: admin.firestore.FieldValue.increment(1)
            });
        });
        return { success: true, message: "Equipo registrado exitosamente en el torneo." };
    }
    catch (error) {
        console.error(`Error al registrar equipo ${teamId} en torneo ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error; // Re-lanza errores Https conocidos
        }
        throw new https_1.HttpsError('internal', error.message || 'Ocurrió un error inesperado al registrar el equipo.');
    }
});
exports.proposeTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to propose a tournament.");
    }
    const { uid, token } = request.auth;
    const isCertified = token.isCertifiedStreamer === true;
    const isAdmin = token.role === 'admin';
    const isModerator = token.role === 'moderator';
    if (!isCertified && !isAdmin && !isModerator) {
        throw new https_1.HttpsError("permission-denied", "Only certified streamers, moderators, or admins can propose tournaments.");
    }
    const { name, game, description, proposedDate, format, maxTeams, rankMin, rankMax, prize, currency } = request.data;
    if (!name || !game || !description || !proposedDate || !format || !maxTeams) {
        throw new https_1.HttpsError("invalid-argument", "Missing required tournament proposal details (name, game, desc, date, format, maxTeams).");
    }
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError("not-found", "Proposer's user profile not found.");
        }
        const userData = userDoc.data();
        const proposerName = (userData === null || userData === void 0 ? void 0 : userData.name) || 'Unknown User';
        const proposerCountry = (userData === null || userData === void 0 ? void 0 : userData.country) || '';
        const proposalRef = db.collection("tournamentProposals").doc();
        await proposalRef.set({
            id: proposalRef.id,
            proposerUid: uid,
            proposerName: proposerName,
            proposerCountry: proposerCountry,
            tournamentName: name,
            game,
            description,
            proposedDate: admin.firestore.Timestamp.fromDate(new Date(proposedDate)),
            format,
            maxTeams,
            rankMin: rankMin || '',
            rankMax: rankMax || '',
            prize: prize || null,
            currency: currency || '',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "Tournament proposal submitted successfully for review." };
    }
    catch (error) {
        console.error(`Error proposing tournament by user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to submit proposal.');
    }
});
exports.reviewTournamentProposal = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const { uid, token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "You do not have permission to review proposals.");
    }
    const { proposalId, status } = request.data;
    if (!proposalId || !['approved', 'rejected'].includes(status)) {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid proposal data (proposalId, status).");
    }
    const proposalRef = db.collection("tournamentProposals").doc(proposalId);
    try {
        await db.runTransaction(async (transaction) => {
            const proposalSnap = await transaction.get(proposalRef);
            if (!proposalSnap.exists) {
                throw new https_1.HttpsError("not-found", "Tournament proposal not found.");
            }
            const proposalData = proposalSnap.data();
            if (!proposalData || proposalData.status !== 'pending') {
                throw new https_1.HttpsError("failed-precondition", "This proposal has already been reviewed.");
            }
            // 1. Update proposal
            const reviewTimestamp = admin.firestore.Timestamp.now();
            transaction.update(proposalRef, {
                status: status,
                reviewedBy: uid,
                reviewedAt: reviewTimestamp,
            });
            // 2. Create tournament if approved
            if (status === 'approved') {
                const { tournamentName, game, description, proposedDate, format, proposerUid, proposerName, proposerCountry, maxTeams, rankMin, rankMax, prize, currency } = proposalData;
                if (!tournamentName || !game || !description || !proposedDate || !format || !proposerUid || !proposerName || !maxTeams) {
                    throw new https_1.HttpsError("failed-precondition", "The proposal document has invalid/missing data.");
                }
                const tournamentRef = db.collection('tournaments').doc();
                transaction.set(tournamentRef, {
                    id: tournamentRef.id,
                    name: tournamentName,
                    game: game,
                    description: description,
                    startDate: proposedDate,
                    format: format,
                    maxTeams,
                    rankMin: rankMin || '',
                    rankMax: rankMax || '',
                    prize: prize || null,
                    currency: currency || '',
                    status: 'upcoming',
                    organizer: { uid: proposerUid, name: proposerName },
                    country: proposerCountry || '',
                    createdAt: reviewTimestamp,
                    proposalId: proposalId,
                    registeredTeamsCount: 0, // Initialize counter
                    winnerId: null, // Initialize winner field
                });
            }
        });
        return { success: true, message: `Proposal has been ${status}.` };
    }
    catch (error) {
        console.error("Critical error in reviewTournamentProposal transaction:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'A server error occurred while processing the proposal.');
    }
});
exports.editTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to edit a tournament.");
    }
    const { uid, token } = request.auth;
    const _a = request.data, { tournamentId } = _a, updateData = __rest(_a, ["tournamentId"]);
    if (!tournamentId) {
        throw new https_1.HttpsError("invalid-argument", "Tournament ID is required.");
    }
    // Basic validation for name
    if (updateData.name && updateData.name.length < 5) {
        throw new https_1.HttpsError("invalid-argument", "Tournament name must be at least 5 characters.");
    }
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists) {
            throw new https_1.HttpsError("not-found", "Tournament not found.");
        }
        const tournamentData = tournamentSnap.data();
        const isOwner = tournamentData.organizer.uid === uid;
        const isModOrAdmin = token.role === 'moderator' || token.role === 'admin';
        if (!isOwner && !isModOrAdmin) {
            throw new https_1.HttpsError("permission-denied", "You do not have permission to edit this tournament.");
        }
        // Prevent updating internal fields
        const allowedUpdates = Object.assign({}, updateData);
        delete allowedUpdates.organizer;
        delete allowedUpdates.status;
        delete allowedUpdates.id;
        delete allowedUpdates.createdAt;
        delete allowedUpdates.proposalId;
        delete allowedUpdates.registeredTeamsCount;
        delete allowedUpdates.winnerId;
        await tournamentRef.update(allowedUpdates);
        return { success: true, message: "Tournament updated successfully." };
    }
    catch (error) {
        console.error(`Error editing tournament ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to update tournament.");
    }
});
exports.deleteTournament = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to delete a tournament.");
    }
    const { token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "You do not have permission to delete tournaments.");
    }
    const { tournamentId } = request.data;
    if (!tournamentId) {
        throw new https_1.HttpsError("invalid-argument", "Tournament ID is required.");
    }
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists) {
            return { success: true, message: "Tournament already deleted." };
        }
        const tournamentData = tournamentSnap.data();
        const proposalId = tournamentData === null || tournamentData === void 0 ? void 0 : tournamentData.proposalId;
        // --- Borrar subcolecciones ---
        console.log(`Deleting subcollections for tournament ${tournamentId}`);
        // Add all subcollections you use (e.g., 'teams', 'matches', 'rounds')
        await deleteCollection(db, `tournaments/${tournamentId}/teams`);
        await deleteCollection(db, `tournaments/${tournamentId}/matches`);
        // --- Borrar principal y propuesta ---
        const batch = db.batch();
        batch.delete(tournamentRef);
        if (proposalId) {
            const proposalRef = db.collection("tournamentProposals").doc(proposalId);
            batch.delete(proposalRef);
        }
        await batch.commit();
        return { success: true, message: "Tournament and all related data deleted successfully." };
    }
    catch (error) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to delete tournament.");
    }
});
// --- FUNCIÓN DE AYUDA (Helper) para borrar colecciones ---
async function deleteCollection(db, collectionPath, batchSize = 50 // Firestore batch limit is 500 writes
) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    while (true) {
        const snapshot = await query.get();
        // When there are no documents left, we are done
        if (snapshot.size === 0) {
            break;
        }
        // Delete documents in a batch
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            // NOTE: This simple version does NOT recursively delete sub-sub-collections.
            // For deeper nested structures, Cloud Tasks or recursive calls are needed.
            batch.delete(doc.ref);
        });
        // Commit the batch
        await batch.commit();
        // Get the last document from the batch as the starting point for the next query
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
    console.log(`Finished deleting collection: ${collectionPath}`);
}
//# sourceMappingURL=tournaments.js.map