
// src/functions/tournaments.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type { ProposeTournamentData, ReviewTournamentData } from "./types-functions";

const db = admin.firestore();

export const proposeTournament = onCall(async (request) => {
  // 1. Check for authentication first. This is the most important guard.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to propose a tournament.");
  }
  
  const { uid, token } = request.auth;
  
  // 2. Check for permissions using the token as the single source of truth.
  const isCertified = token.isCertifiedStreamer === true;
  const isAdmin = token.role === 'admin';
  const isModerator = token.role === 'moderator';

  if (!isCertified && !isAdmin && !isModerator) {
    throw new HttpsError("permission-denied", "Only certified streamers, moderators, or admins can propose tournaments.");
  }
  
  const { name, game, description, proposedDate, format } = request.data as ProposeTournamentData;
  
  // 3. Validate data
  if (!name || !game || !description || !proposedDate || !format) {
    throw new HttpsError("invalid-argument", "Missing required tournament proposal details.");
  }
  
  // 4. Denormalize proposer's name for easier display in an admin panel
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
      throw new HttpsError("not-found", "Proposer's user profile not found.");
  }
  const proposerName = userDoc.data()?.name || 'Unknown User';
  
  // 5. Create the proposal document
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


export const reviewTournamentProposal = onCall(async (request) => {
  // 1. Check permissions
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  const { uid, token } = request.auth;
  const isModerator = token.role === 'moderator' || token.role === 'admin';
  if (!isModerator) {
    throw new HttpsError("permission-denied", "You do not have permission to review proposals.");
  }

  // 2. Validate data
  const { proposalId, status } = request.data as ReviewTournamentData;
  if (!proposalId || !['approved', 'rejected'].includes(status)) {
    throw new HttpsError("invalid-argument", "Missing or invalid proposal data.");
  }

  const proposalRef = db.collection("tournamentProposals").doc(proposalId);
  const proposalSnap = await proposalRef.get();

  if (!proposalSnap.exists) {
    throw new HttpsError("not-found", "Tournament proposal not found.");
  }
  
  const proposalData = proposalSnap.data();

  if (!proposalData || proposalData.status !== 'pending') {
      throw new HttpsError("failed-precondition", "This proposal has already been reviewed or is invalid.");
  }

  // 3. Perform action
  const batch = db.batch();
  const reviewTimestamp = admin.firestore.FieldValue.serverTimestamp();

  batch.update(proposalRef, {
    status: status,
    reviewedBy: uid,
    reviewedAt: reviewTimestamp,
  });

  if (status === 'approved') {
    const { tournamentName, game, description, proposedDate, format, proposerUid, proposerName } = proposalData;
    
    // RIGOROUS VALIDATION
    if (
        typeof tournamentName !== 'string' || !tournamentName ||
        typeof game !== 'string' || !game ||
        typeof description !== 'string' ||
        !(proposedDate && typeof proposedDate.toDate === 'function') || // Check if it is a Timestamp
        typeof format !== 'string' || !format ||
        typeof proposerUid !== 'string' || !proposerUid ||
        typeof proposerName !== 'string' || !proposerName
    ) {
        console.error("Proposal document is missing or has malformed required fields:", proposalData);
        throw new HttpsError("failed-precondition", "The proposal document has invalid data and cannot be approved.");
    }
      
    // Create a new document in the main 'tournaments' collection
    const tournamentRef = db.collection('tournaments').doc();
    batch.set(tournamentRef, {
      id: tournamentRef.id,
      name: tournamentName,
      game: game,
      description: description,
      startDate: proposedDate, // This is a valid Firestore Timestamp
      format: format,
      status: 'upcoming',
      organizer: {
        uid: proposerUid,
        name: proposerName,
      },
      createdAt: reviewTimestamp,
      proposalId: proposalId,
    });
  }

  try {
      await batch.commit();
  } catch (error) {
      console.error("Error committing tournament review batch:", error);
      throw new HttpsError('internal', 'Failed to save changes to the database.');
  }

  return { success: true, message: `Proposal has been ${status}.` };
});


// We need a specific type file for Cloud Functions to avoid circular dependencies
// if we were to import from the main `types.ts` file.
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
