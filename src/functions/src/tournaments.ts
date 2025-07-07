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
  
  const { name, game, description, proposedDate, format, maxTeams, rankMin, rankMax, prize, currency } = request.data as ProposeTournamentData & { maxTeams: number, rankMin?: string, rankMax?: string, prize?: number, currency?: string };
  
  if (!name || !game || !description || !proposedDate || !format || !maxTeams) {
    throw new HttpsError("invalid-argument", "Missing required tournament proposal details.");
  }
  
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
      throw new HttpsError("not-found", "Proposer's user profile not found.");
  }
  const proposerName = userDoc.data()?.name || 'Unknown User';
  
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
                const { tournamentName, game, description, proposedDate, format, proposerUid, proposerName, maxTeams, rankMin, rankMax, prize, currency } = proposalData;
                
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
                    maxTeams: maxTeams,
                    rankMin: rankMin || '',
                    rankMax: rankMax || '',
                    prize: prize || null,
                    currency: currency || '',
                    status: 'upcoming',
                    organizer: { uid: proposerUid, name: proposerName },
                    createdAt: reviewTimestamp,
                    proposalId: proposalId,
                    participants: [],
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


export const editTournament = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { uid, token } = request.auth;
    const { tournamentId, name, description, prize, currency } = request.data as { tournamentId: string, name: string, description: string, prize?: number, currency?: string };

    if (!tournamentId || !name || !description) {
        throw new HttpsError("invalid-argument", "Missing required tournament data.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);

    try {
        const tournamentSnap = await tournamentRef.get();
        if (!tournamentSnap.exists) {
            throw new HttpsError("not-found", "Tournament not found.");
        }
        const tournamentData = tournamentSnap.data()!;

        const isOrganizer = tournamentData.organizer.uid === uid;
        const isAdminOrMod = token.role === 'admin' || token.role === 'moderator';

        if (!isOrganizer && !isAdminOrMod) {
            throw new HttpsError("permission-denied", "You are not authorized to edit this tournament.");
        }

        await tournamentRef.update({
            name,
            description,
            prize: prize || null,
            currency: currency || '',
        });

        return { success: true, message: "Tournament updated successfully." };

    } catch (error: any) {
        console.error("Error editing tournament:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'A server error occurred while editing the tournament.');
    }
});


export const registerTeamForTournament = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new HttpsError("unauthenticated", "You must be logged in to register a team.");
    }
    const callerUid = requestAuth.uid;
    const { tournamentId, teamId } = data as { tournamentId: string, teamId: string };

    if (!tournamentId || !teamId) {
        throw new HttpsError("invalid-argument", "Missing tournament ID or team ID.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);

    return db.runTransaction(async (transaction) => {
        const [tournamentSnap, teamSnap] = await Promise.all([
            transaction.get(tournamentRef),
            transaction.get(teamRef)
        ]);

        if (!tournamentSnap.exists) {
            throw new HttpsError("not-found", "Tournament not found.");
        }
        if (!teamSnap.exists) {
            throw new HttpsError("not-found", "Team not found.");
        }
        
        const tournamentData = tournamentSnap.data()!;
        const teamData = teamSnap.data()!;
        const isFounder = teamData.founder === callerUid;
        const isAdmin = requestAuth.token.role === 'admin';
        const isModerator = requestAuth.token.role === 'moderator';

        if (!isFounder && !isAdmin && !isModerator) {
            throw new HttpsError("permission-denied", "Only the team founder, an admin, or a moderator can register the team.");
        }
        
        if (isAdmin || isModerator) {
            const memberDocSnap = await transaction.get(teamRef.collection("members").doc(callerUid));
            if (!memberDocSnap.exists) {
                 throw new HttpsError("permission-denied", "Admins/Mods must be a member of the team to register it.");
            }
        }
        
        if (tournamentData.status !== 'upcoming') {
            throw new HttpsError("failed-precondition", "Registration for this tournament is closed.");
        }
        
        const participants = tournamentData.participants || [];
        if (participants.length >= tournamentData.maxTeams) {
            throw new HttpsError("failed-precondition", "This tournament is already full.");
        }
        if (participants.some((p: any) => p.id === teamId)) {
            throw new HttpsError("already-exists", "This team is already registered for the tournament.");
        }

        const newParticipant = {
            id: teamId,
            name: teamData.name,
            avatarUrl: teamData.avatarUrl
        };

        transaction.update(tournamentRef, {
            participants: admin.firestore.FieldValue.arrayUnion(newParticipant)
        });

        return { success: true };
    });
});

export const deleteTournament = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { token } = requestAuth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new HttpsError("permission-denied", "You do not have permission to delete tournaments.");
    }

    const { tournamentId } = data as { tournamentId: string };
    if (!tournamentId) {
        throw new HttpsError("invalid-argument", "Missing tournament ID.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    
    await tournamentRef.delete();

    return { success: true, message: "Tournament deleted successfully." };
});
