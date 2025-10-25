// src/functions/tournaments.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// --- INTERFACES ---
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
interface RegisterTeamData {
  tournamentId: string;
  teamId: string;
}

// --- FUNCIONES ---

export const registerTeamForTournament = onCall({ region: 'europe-west1' }, async (request) => {
    // 1. Autenticación y Validación
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para registrar un equipo.");
    }
    const { uid } = request.auth;
    const { tournamentId, teamId } = request.data as RegisterTeamData;

    if (!tournamentId || !teamId) {
        throw new HttpsError("invalid-argument", "Faltan IDs de torneo o equipo.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid); // Referencia al usuario en el equipo
    const registrationRef = tournamentRef.collection("teams").doc(teamId); // Documento de registro

    try {
        await db.runTransaction(async (transaction) => {
            // 2. Obtener datos necesarios en la transacción
            const [tournamentSnap, teamSnap, memberSnap, registrationSnap] = await Promise.all([
                transaction.get(tournamentRef),
                transaction.get(teamRef),
                transaction.get(memberRef),
                transaction.get(registrationRef)
            ]);

            // 3. Validaciones
            if (!tournamentSnap.exists) {
                throw new HttpsError("not-found", "El torneo no existe.");
            }
            if (!teamSnap.exists) {
                throw new HttpsError("not-found", "Tu equipo no existe.");
            }
            if (!memberSnap.exists || !['founder', 'coach'].includes(memberSnap.data()?.role)) {
                throw new HttpsError("permission-denied", "Solo el fundador o coach pueden registrar el equipo.");
            }
            if (registrationSnap.exists) {
                throw new HttpsError("already-exists", "Este equipo ya está registrado en el torneo.");
            }

            const tournamentData = tournamentSnap.data()!;
            const teamData = teamSnap.data()!;

            if (tournamentData.status !== 'upcoming') {
                throw new HttpsError("failed-precondition", "Este torneo no está abierto para inscripciones.");
            }
            const currentTeamsCount = tournamentData.registeredTeamsCount || 0;
            if (currentTeamsCount >= tournamentData.maxTeams) {
                throw new HttpsError("failed-precondition", "El torneo está lleno.");
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

    } catch (error: any) {
        console.error(`Error al registrar equipo ${teamId} en torneo ${tournamentId}:`, error);
        if (error instanceof HttpsError) {
            throw error; // Re-lanza errores Https conocidos
        }
        throw new HttpsError('internal', error.message || 'Ocurrió un error inesperado al registrar el equipo.');
    }
});

export const proposeTournament = onCall({ region: 'europe-west1' }, async (request) => {
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
    throw new HttpsError("invalid-argument", "Missing required tournament proposal details (name, game, desc, date, format, maxTeams).");
  }

  try {
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
  } catch (error: any) {
      console.error(`Error proposing tournament by user ${uid}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to submit proposal.');
  }
});

export const reviewTournamentProposal = onCall({ region: 'europe-west1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const { uid, token } = request.auth;
    if (token.role !== 'moderator' && token.role !== 'admin') {
        throw new HttpsError("permission-denied", "You do not have permission to review proposals.");
    }

    const { proposalId, status } = request.data as ReviewTournamentData;
    if (!proposalId || !['approved', 'rejected'].includes(status)) {
        throw new HttpsError("invalid-argument", "Missing or invalid proposal data (proposalId, status).");
    }

    const proposalRef = db.collection("tournamentProposals").doc(proposalId);

    try {
        await db.runTransaction(async (transaction) => {
            const proposalSnap = await transaction.get(proposalRef);

            if (!proposalSnap.exists) {
                throw new HttpsError("not-found", "Tournament proposal not found.");
            }

            const proposalData = proposalSnap.data();
            if (!proposalData || proposalData.status !== 'pending') {
                throw new HttpsError("failed-precondition", "This proposal has already been reviewed.");
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
                    throw new HttpsError("failed-precondition", "The proposal document has invalid/missing data.");
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

    } catch (error: any) {
        console.error("Critical error in reviewTournamentProposal transaction:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message || 'A server error occurred while processing the proposal.');
    }
});

export const editTournament = onCall({ region: 'europe-west1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to edit a tournament.");
    }

    const { uid, token } = request.auth;
    const { tournamentId, ...updateData } = request.data as EditTournamentData;

    if (!tournamentId) {
        throw new HttpsError("invalid-argument", "Tournament ID is required.");
    }
    // Basic validation for name
    if (updateData.name && updateData.name.length < 5) {
         throw new HttpsError("invalid-argument", "Tournament name must be at least 5 characters.");
    }

    const tournamentRef = db.collection("tournaments").doc(tournamentId);
    try {
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

        // Prevent updating internal fields
        const allowedUpdates = { ...updateData };
        delete (allowedUpdates as any).organizer;
        delete (allowedUpdates as any).status;
        delete (allowedUpdates as any).id;
        delete (allowedUpdates as any).createdAt;
        delete (allowedUpdates as any).proposalId;
        delete (allowedUpdates as any).registeredTeamsCount;
        delete (allowedUpdates as any).winnerId;

        await tournamentRef.update(allowedUpdates);

        return { success: true, message: "Tournament updated successfully." };
    } catch (error: any) {
        console.error(`Error editing tournament ${tournamentId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "Failed to update tournament.");
    }
});

export const deleteTournament = onCall({ region: 'europe-west1' }, async (request) => {
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
    try {
        const tournamentSnap = await tournamentRef.get();

        if (!tournamentSnap.exists) {
            return { success: true, message: "Tournament already deleted." };
        }

        const tournamentData = tournamentSnap.data();
        const proposalId = tournamentData?.proposalId;

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

    } catch (error: any) {
        console.error(`Error deleting tournament ${tournamentId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "Failed to delete tournament.");
    }
});


// --- FUNCIÓN DE AYUDA (Helper) para borrar colecciones ---
async function deleteCollection(
  db: admin.firestore.Firestore,
  collectionPath: string,
  batchSize: number = 50 // Firestore batch limit is 500 writes
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