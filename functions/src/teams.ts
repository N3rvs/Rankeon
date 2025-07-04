
// functions/src/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

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

  // This is the most robust check. It looks at the custom claims on the user's auth token.
  if (auth?.token.role === 'founder') {
    throw new HttpsError('already-exists', 'Solo puedes ser fundador de un equipo. Borra tu equipo actual si deseas crear uno nuevo.');
  }

  const teamRef = db.collection("teams").doc();
  const userRef = db.collection("users").doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      // First, read the user's current role from Firestore inside the transaction
      // This is the ultimate guard against race conditions.
      const userDoc = await transaction.get(userRef);
      if (userDoc.data()?.role === 'founder') {
        throw new HttpsError('already-exists', 'Ya eres fundador de otro equipo.');
      }
      
      // Set the team document
      transaction.set(teamRef, {
        id: teamRef.id,
        name,
        game,
        description: description || '',
        avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
        bannerUrl: 'https://placehold.co/1200x400.png',
        founder: uid,
        memberIds: [uid],
        lookingForPlayers: false,
        recruitingRoles: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Set the member subcollection document
      const memberRef = teamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Update the user's role in their Firestore document
      transaction.update(userRef, { role: 'founder' });
    });

    // After the transaction succeeds, update the custom claims
    const userToUpdate = await admin.auth().getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'founder' });

    return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };
  } catch (error: any) {
    console.error("Error creating team:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo.');
  }
});

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
        throw new HttpsError("internal", "No se pudo actualizar el equipo.");
    }
});

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
            throw new HttpsError("not-found", "El equipo no se encontró. Es posible que ya haya sido eliminado.");
        }

        if (teamDoc.data()?.founder !== uid) {
            throw new HttpsError("permission-denied", "Solo el fundador del equipo puede eliminarlo.");
        }

        // Atomically delete the team and update the user's role in Firestore
        transaction.delete(teamRef);
        transaction.update(userRef, { role: "player" });
        
        return { success: true };
    }).then(async () => {
        // This part runs AFTER the transaction successfully commits.
        // Now, update the custom auth claims.
        const userToUpdate = await admin.auth().getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: "player" });
        return { success: true, message: "Equipo eliminado con éxito." };
    }).catch((error) => {
        console.error("Error al eliminar el equipo:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error inesperado durante la eliminación del equipo.");
    });
});
