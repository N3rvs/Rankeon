// src/functions/tournaments.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ProposeTournamentData {
  name: string;
  game: string;
  description: string;
  proposedDate: string; // ISO String from client
  format: string;
  maxTeams: number;
  rankMin?: string;
  rankMax?: string;
  prize?: number;
  currency?: string;
}

interface ReviewTournamentData {
  proposalId: string;
  status: 'approved' | 'rejected';
}

export const proposeTournament = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to propose a tournament.");
  }
  
  const { uid, token } = request.auth;
  const isCertified = token.isCertifiedStreamer === true;
  const isAdmin = token.role === 'admin';
  const isModerator = token.role === 'moderator';

  if (!isCertified && !isAdmin && !isModerator) {
    throw new HttpsError("permission-denied", "Only certified streamers, moderators, or admins can propose tournaments.");
  }
  
  const { name, game, description, proposedDate, format, maxTeams, rankMin, rankMax, prize, currency } = request.data as ProposeTournamentData;
  
  if (!name || !game || !description || !proposedDate || !format || !maxTeams) {
    throw new HttpsError("invalid-argument", "Missing required tournament proposal details.");
  }
  
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
      throw new HttpsError("not-found", "Proposer's user profile not found.");
  }
  const userData = userDoc.data();
  const proposerName = userData?.name || 'Unknown User';
  const proposerCountry = userData?.country || '';
  
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


// A new, more robust implementation of reviewTournamentProposal using a transaction
export const reviewTournamentProposal = onCall(async (request) => {
    // 1. Permissions and Data Validation
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { uid, token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new HttpsError("permission-denied", "You do not have permission to review proposals.");
    }

    const { proposalId, status } = request.data as ReviewTournamentData;
    if (!proposalId || !['approved', 'rejected'].includes(status)) {
        throw new HttpsError("invalid-argument", "Missing or invalid proposal data.");
    }

    const proposalRef = db.collection("tournamentProposals").doc(proposalId);

    try {
        // Using a transaction to ensure atomicity, which is safer than separate writes.
        await db.runTransaction(async (transaction) => {
            const proposalSnap = await transaction.get(proposalRef);

            if (!proposalSnap.exists) {
                throw new HttpsError("not-found", "Tournament proposal not found. It may have been deleted or already processed.");
            }
            
            const proposalData = proposalSnap.data();
            if (!proposalData || proposalData.status !== 'pending') {
                throw new HttpsError("failed-precondition", "This proposal has already been reviewed.");
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
                
                // Rigorous validation. If any of these fail, the transaction will roll back.
                if (!tournamentName || !game || !description || !proposedDate || !format || !proposerUid || !proposerName || !maxTeams) {
                    throw new HttpsError("failed-precondition", "The proposal document has invalid data and cannot be approved.");
                }

                const tournamentRef = db.collection('tournaments').doc();
                transaction.set(tournamentRef, {
                    id: tournamentRef.id,
                    name: tournamentName,
                    game: game,
                    description: description,
                    startDate: proposedDate, // This is a valid Firestore Timestamp
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

    } catch (error: any) {
        console.error("Critical error in reviewTournamentProposal transaction:", error);
        // If it's an HttpsError we threw ourselves, re-throw it.
        if (error instanceof HttpsError) {
            throw error;
        }
        // Otherwise, wrap it in a generic internal error.
        throw new HttpsError('internal', 'A server error occurred while processing the proposal. Please check the function logs.');
    }
});
