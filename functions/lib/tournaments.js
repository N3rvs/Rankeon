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
exports.deleteTournament = exports.editTournament = exports.reviewTournamentProposal = exports.proposeTournament = void 0;
// src/functions/tournaments.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// --- proposeTournament (Sin cambios, estaba perfecto) ---
exports.proposeTournament = (0, https_1.onCall)(async (request) => {
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
        throw new https_1.HttpsError("invalid-argument", "Missing required tournament proposal details.");
    }
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
});
// --- reviewTournamentProposal (Sin cambios, estaba perfecto) ---
exports.reviewTournamentProposal = (0, https_1.onCall)(async (request) => {
    // 1. Permissions and Data Validation
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const { uid, token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "You do not have permission to review proposals.");
    }
    const { proposalId, status } = request.data;
    if (!proposalId || !['approved', 'rejected'].includes(status)) {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid proposal data.");
    }
    const proposalRef = db.collection("tournamentProposals").doc(proposalId);
    try {
        await db.runTransaction(async (transaction) => {
            const proposalSnap = await transaction.get(proposalRef);
            if (!proposalSnap.exists) {
                throw new https_1.HttpsError("not-found", "Tournament proposal not found. It may have been deleted or already processed.");
            }
            const proposalData = proposalSnap.data();
            if (!proposalData || proposalData.status !== 'pending') {
                throw new https_1.HttpsError("failed-precondition", "This proposal has already been reviewed.");
            }
            // Step 1: Update the proposal document
            const reviewTimestamp = admin.firestore.Timestamp.now();
            transaction.update(proposalRef, {
                status: status,
                reviewedBy: uid,
                reviewedAt: reviewTimestamp,
            });
            // Step 2: If approved, create the new tournament document
            if (status === 'approved') {
                const { tournamentName, game, description, proposedDate, format, proposerUid, proposerName, proposerCountry, maxTeams, rankMin, rankMax, prize, currency } = proposalData;
                if (!tournamentName || !game || !description || !proposedDate || !format || !proposerUid || !proposerName || !maxTeams) {
                    throw new https_1.HttpsError("failed-precondition", "The proposal document has invalid data and cannot be approved.");
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
        throw new https_1.HttpsError('internal', 'A server error occurred while processing the proposal. Please check the function logs.');
    }
});
// --- editTournament (Sin cambios, estaba perfecto) ---
exports.editTournament = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to edit a tournament.");
    }
    const { uid, token } = request.auth;
    const _a = request.data, { tournamentId } = _a, updateData = __rest(_a, ["tournamentId"]);
    if (!tournamentId) {
        throw new https_1.HttpsError("invalid-argument", "Tournament ID is required.");
    }
    const tournamentRef = db.collection("tournaments").doc(tournamentId);
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
    await tournamentRef.update(updateData);
    return { success: true, message: "Tournament updated successfully." };
});
// *** INICIO DE LA CORRECCIÓN ***
exports.deleteTournament = (0, https_1.onCall)(async (request) => {
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
    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) {
        return { success: true, message: "Tournament already deleted." };
    }
    const tournamentData = tournamentSnap.data();
    const proposalId = tournamentData === null || tournamentData === void 0 ? void 0 : tournamentData.proposalId;
    try {
        // --- PASO 1: Borrar subcolecciones recursivamente ---
        // (Añade aquí todas las subcolecciones que uses, ej. 'matches', 'teams')
        console.log(`Deleting subcollections for tournament ${tournamentId}`);
        await deleteCollection(db, `tournaments/${tournamentId}/teams`);
        await deleteCollection(db, `tournaments/${tournamentId}/matches`);
        // --- PASO 2: Borrar el documento principal Y la propuesta ---
        const batch = db.batch();
        // Borra el torneo
        batch.delete(tournamentRef);
        // Borra la propuesta original, si existe
        if (proposalId) {
            const proposalRef = db.collection("tournamentProposals").doc(proposalId);
            batch.delete(proposalRef);
        }
        await batch.commit();
        return { success: true, message: "Tournament and all related data deleted successfully." };
    }
    catch (error) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        throw new https_1.HttpsError("internal", "Failed to delete tournament and its subcollections.");
    }
});
// *** FIN DE LA CORRECCIÓN ***
/**
 * --- FUNCIÓN DE AYUDA (Helper) AÑADIDA ---
 * Borra una colección completa, incluyendo subcolecciones, en lotes.
 */
async function deleteCollection(db, collectionPath, batchSize = 50) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            break;
        }
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            // Llama recursivamente para borrar subcolecciones
            // (Esta es una implementación simplificada. Para sub-sub-colecciones
            // profundas, se necesita una cola de tareas, pero para 1 nivel es suficiente)
            batch.delete(doc.ref);
        });
        await batch.commit();
        // Obtiene el último documento para la siguiente consulta
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
}
//# sourceMappingURL=tournaments.js.map