
// functions/src/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// =============================================
// CREATE TEAM
// =============================================
interface CreateTeamData {
  name: string;
  game: string;
  description?: string;
}

export const createTeam = onCall(async ({ auth, data }: { auth?: any, data: CreateTeamData }) => {
  const uid = auth?.uid;
  const { name, game, description } = data;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear un equipo.");
  }
  if (!name || !game) {
    throw new HttpsError("invalid-argument", "El nombre del equipo y el juego son obligatorios.");
  }

  // Double-check with token claims first for a quick exit.
  if (auth?.token.role === 'founder') {
    throw new HttpsError('already-exists', 'Solo puedes ser fundador de un equipo. Borra tu equipo actual si deseas crear uno nuevo.');
  }

  const teamRef = db.collection("teams").doc();
  const userRef = db.collection("users").doc(uid);

  try {
    // Use a transaction to ensure atomicity.
    await db.runTransaction(async (transaction) => {
      // The most definitive check: read the user's role from Firestore inside the transaction.
      const userDoc = await transaction.get(userRef);
      if (userDoc.data()?.role === 'founder') {
        throw new HttpsError('already-exists', 'Ya eres fundador de otro equipo. Esta transacción ha sido cancelada para evitar duplicados.');
      }
      
      // 1. Create the team document
      transaction.set(teamRef, {
        id: teamRef.id,
        name,
        game,
        description: description || '',
        avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
        bannerUrl: 'https://placehold.co/1200x400.png',
        founder: uid,
        memberIds: [uid], // Start with the founder as a member
        lookingForPlayers: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Create the member document in the subcollection
      const memberRef = teamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // 3. Update the user's role in their Firestore document
      transaction.update(userRef, { role: 'founder' });
    });

    // AFTER the transaction succeeds, update the custom claims.
    // This cannot be part of the transaction.
    const userToUpdate = await admin.auth().getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'founder' });

    return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };
  } catch (error: any) {
    console.error("Error creating team:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo. Revisa los logs de la función.');
  }
});


// =============================================
// UPDATE TEAM
// =============================================
interface UpdateTeamData {
  teamId: string;
  name: string;
  description?: string;
  lookingForPlayers: boolean;
}

export const updateTeam = onCall(async ({ auth, data }: { auth?: any, data: UpdateTeamData }) => {
    const uid = auth?.uid;
    const { teamId, name, description, lookingForPlayers } = data;

    if (!uid) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para editar el equipo.");
    }
    if (!teamId || !name) {
        throw new HttpsError("invalid-argument", "Faltan datos del equipo (ID o nombre).");
    }

    const teamRef = db.collection("teams").doc(teamId);
    
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            throw new HttpsError("not-found", "El equipo no existe.");
        }
        if (teamDoc.data()?.founder !== uid) {
            throw new HttpsError("permission-denied", "Solo el fundador puede editar el equipo.");
        }

        // Simple update, no transaction needed unless more complex logic is added.
        await teamRef.update({
            name,
            description: description || '',
            lookingForPlayers: typeof lookingForPlayers === 'boolean' ? lookingForPlayers : false,
        });

        return { success: true, message: "Equipo actualizado con éxito." };
    } catch (error: any) {
        console.error("Error updating team:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "No se pudo actualizar el equipo. Revisa los logs de la función.");
    }
});


// =============================================
// DELETE TEAM
// =============================================
interface DeleteTeamData {
    teamId: string;
}

export const deleteTeam = onCall(async ({ auth, data }: { auth?: any, data: DeleteTeamData }) => {
    const uid = auth?.uid;
    const { teamId } = data;

    if (!uid || !teamId) {
        throw new HttpsError("invalid-argument", "Falta autenticación o ID del equipo.");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const userRef = db.collection("users").doc(uid);

    return db.runTransaction(async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists) {
            console.log(`Team ${teamId} not found, likely already deleted. Proceeding with user role cleanup.`);
        } else {
            if (teamDoc.data()?.founder !== uid) {
                throw new HttpsError("permission-denied", "Solo el fundador del equipo puede eliminarlo.");
            }

            // 1. Delete the founder's member document. For a full cleanup, one would need a separate function
            // to iterate and delete all members, but this handles the required case.
            const memberRef = teamRef.collection("members").doc(uid);
            transaction.delete(memberRef);
            
            // 2. Atomically delete the team document itself
            transaction.delete(teamRef);
        }

        // 3. Update the user's role in their Firestore document
        transaction.update(userRef, { role: "player" });
        
        return { success: true };
    }).then(async () => {
        // AFTER the transaction successfully commits, update the custom auth claims.
        const userToUpdate = await admin.auth().getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        
        if (existingClaims.role !== 'player') {
            await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: "player" });
        }
        return { success: true, message: "Equipo eliminado con éxito." };
    }).catch((error) => {
        console.error("Error al eliminar el equipo:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error inesperado durante la eliminación del equipo.");
    });
});
