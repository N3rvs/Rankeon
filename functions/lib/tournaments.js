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
exports.reviewTournamentProposal = exports.proposeTournament = void 0;
// src/functions/tournaments.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.proposeTournament = (0, https_1.onCall)(async (request) => {
    var _a;
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
    const { name, game, description, proposedDate, format } = request.data;
    if (!name || !game || !description || !proposedDate || !format) {
        throw new https_1.HttpsError("invalid-argument", "Missing required tournament proposal details.");
    }
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "Proposer's user profile not found.");
    }
    const proposerName = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User';
    const proposalRef = db.collection("tournamentProposals").doc();
    await proposalRef.set({
        id: proposalRef.id,
        proposerUid: uid,
        proposerName: proposerName,
        tournamentName: name,
        game,
        description,
        proposedDate: admin.firestore.Timestamp.fromDate(new Date(proposedDate)),
        format,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Tournament proposal submitted successfully for review." };
});
// A new, more robust implementation of reviewTournamentProposal using a transaction
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
        // Using a transaction to ensure atomicity, which is safer than separate writes.
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
                const { tournamentName, game, description, proposedDate, format, proposerUid, proposerName } = proposalData;
                // Rigorous validation. If any of these fail, the transaction will roll back.
                if (!tournamentName || !game || !description || !proposedDate || !format || !proposerUid || !proposerName) {
                    throw new https_1.HttpsError("failed-precondition", "The proposal document has invalid data and cannot be approved.");
                }
                const tournamentRef = db.collection('tournaments').doc();
                transaction.set(tournamentRef, {
                    id: tournamentRef.id,
                    name: tournamentName,
                    game: game,
                    description: description,
                    startDate: proposedDate, // This is a valid Firestore Timestamp
                    format: format,
                    status: 'upcoming',
                    organizer: { uid: proposerUid, name: proposerName },
                    createdAt: reviewTimestamp,
                    proposalId: proposalId,
                });
            }
        });
        return { success: true, message: `Proposal has been ${status}.` };
    }
    catch (error) {
        console.error("Critical error in reviewTournamentProposal transaction:", error);
        // If it's an HttpsError we threw ourselves, re-throw it.
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Otherwise, wrap it in a generic internal error.
        throw new https_1.HttpsError('internal', 'A server error occurred while processing the proposal. Please check the function logs.');
    }
});
//# sourceMappingURL=tournaments.js.map