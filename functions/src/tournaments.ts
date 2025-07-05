
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

export const proposeTournament = onCall(async ({ auth, data }: { auth?: any, data: ProposeTournamentData }) => {
  // 1. Check for authentication first. This is the most important guard.
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to propose a tournament.");
  }
  
  const { uid, token } = auth;
  
  // 2. Check for permissions
  const isCertified = token.isCertifiedStreamer === true;
  const isAdmin = token.role === 'admin';
  const isModerator = token.role === 'moderator';

  if (!isCertified && !isAdmin && !isModerator) {
    throw new HttpsError("permission-denied", "Only certified streamers, moderators, or admins can propose tournaments.");
  }
  
  const { name, game, description, proposedDate, format } = data;
  
  // 3. Validate data
  if (!name || !game || !description || !proposedDate || !format) {
    throw new HttpsError("invalid-argument", "Missing required tournament proposal details.");
  }
  
  // 4. Denormalize proposer's name
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
