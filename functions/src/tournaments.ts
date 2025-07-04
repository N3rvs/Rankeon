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
  const uid = auth?.uid;
  
  // 1. Check for authentication and permissions
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to propose a tournament.");
  }

  const isCertified = auth.token.isCertifiedStreamer === true;
  const isAdmin = auth.token.role === 'admin';
  const isModerator = auth.token.role === 'moderator';

  if (!isCertified && !isAdmin && !isModerator) {
    throw new HttpsError("permission-denied", "Only certified streamers, moderators, or admins can propose tournaments.");
  }
  
  const { name, game, description, proposedDate, format } = data;
  
  // 2. Validate data
  if (!name || !game || !description || !proposedDate || !format) {
    throw new HttpsError("invalid-argument", "Missing required tournament proposal details.");
  }
  
  // 3. Denormalize proposer's name
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
      throw new HttpsError("not-found", "Proposer's user profile not found.");
  }
  const proposerName = userDoc.data()?.name || 'Unknown User';
  
  // 4. Create the proposal document
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
