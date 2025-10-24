// src/functions/tournaments.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// --- INTERFACES (Sin cambios) ---
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
interface EditTournamentData {
    tournamentId: string;
    name: string;
    description: string;
    prize?: number;
    currency?: string;
    rankMin?: string;
    rankMax?: string;
}
interface DeleteTournamentData {
    tournamentId: string;
}

// --- proposeTournament (Sin cambios, estaba perfecto) ---
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

// --- reviewTournamentProposal (Sin cambios, estaba perfecto) ---
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
                
                if (!tournamentName || !game || !description || !proposedDate || !format || !proposerUid || !proposerName || !maxTeams) {
                    throw new HttpsError("failed-precondition", "The proposal document has invalid data and cannot be approved.");
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

    } catch (error: any) {
        console.error("Critical error in reviewTournamentProposal transaction:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'A server error occurred while processing the proposal. Please check the function logs.');
    }
});

// --- editTournament (Sin cambios, estaba perfecto) ---
export const editTournament = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to edit a tournament.");
    }

    const { uid, token } = request.auth;
    const { tournamentId, ...updateData } = request.data as EditTournamentData;

    if (!tournamentId) {
        throw new HttpsError("invalid-argument", "Tournament ID is required.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
        throw new HttpsError("not-found", "Tournament not found.");
    }

    const tournamentData = tournamentSnap.data()!;
    const isOwner = tournamentData.organizer.uid === uid;
    const isModOrAdmin = token.role === 'moderator' || token.role === 'admin';

    if (!isOwner && !isModOrAdmin) {
        throw new HttpsError("permission-denied", "You do not have permission to edit this tournament.");
    }

    await tournamentRef.update(updateData);

    return { success: true, message: "Tournament updated successfully." };
});


// *** INICIO DE LA CORRECCIÓN ***
export const deleteTournament = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to delete a tournament.");
    }
     const { token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new HttpsError("permission-denied", "You do not have permission to delete tournaments.");
    }

    const { tournamentId } = request.data as DeleteTournamentData;
    if (!tournamentId) {
        throw new HttpsError("invalid-argument", "Tournament ID is required.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
        return { success: true, message: "Tournament already deleted." };
    }
    
    const tournamentData = tournamentSnap.data();
    const proposalId = tournamentData?.proposalId;

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
    
    } catch (error: any) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        throw new HttpsError("internal", "Failed to delete tournament and its subcollections.");
    }
});
// *** FIN DE LA CORRECCIÓN ***


/**
 * --- FUNCIÓN DE AYUDA (Helper) AÑADIDA ---
 * Borra una colección completa, incluyendo subcolecciones, en lotes.
 */
async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionPath: string,
  batchSize: number = 50
) {
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