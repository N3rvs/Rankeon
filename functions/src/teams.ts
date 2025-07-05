
// functions/src/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// =============================================
// CREATE TEAM (Robust version)
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

  const userRef = db.collection("users").doc(uid);
  const userToUpdate = await admin.auth().getUser(uid);
  const existingClaims = userToUpdate.customClaims || {};
  const isPrivilegedUser = existingClaims.role === 'admin' || existingClaims.role === 'moderator';

  try {
    // Use a transaction for an atomic read-then-write operation.
    // This is the definitive way to prevent a user from creating multiple teams.
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.data()?.role === 'founder') {
        throw new HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
      }
      
      const teamRef = db.collection("teams").doc();
      
      transaction.set(teamRef, {
        id: teamRef.id,
        name,
        game,
        description: description || '',
        avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
        bannerUrl: 'https://placehold.co/1200x400.png',
        founder: uid,
        memberIds: [uid], // Founder is the first member
        lookingForPlayers: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const memberRef = teamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      if (!isPrivilegedUser) {
        transaction.update(userRef, { role: 'founder' });
      }
    });

    // This part runs only if the transaction above succeeds.
    if (!isPrivilegedUser) {
      await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'founder' });
    }

    const teamRef = (await db.collection("teams").where("founder", "==", uid).limit(1).get()).docs[0];
    return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };

  } catch (error: any) {
    console.error("Error creating team:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo.');
  }
});


// =============================================
// UPDATE TEAM (Robust version)
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


// =============================================
// DELETE TEAM (Definitive, robust version)
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

    try {
        // First, verify permissions outside the batch.
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            // The team is already gone. Let's just fix the user's role if needed.
            await userRef.update({ role: "player" });
            const userToUpdate = await admin.auth().getUser(uid);
            const existingClaims = userToUpdate.customClaims || {};
            if (existingClaims.role === 'founder') {
              await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: "player" });
            }
            return { success: true, message: "El equipo ya no existía." };
        }
        if (teamDoc.data()?.founder !== uid) {
            throw new HttpsError("permission-denied", "Solo el fundador del equipo puede eliminarlo.");
        }

        // The user is the founder. Proceed with deletion using an atomic batch write.
        const batch = db.batch();

        // 1. Delete all member documents in the subcollection. This is critical.
        const membersSnap = await teamRef.collection("members").get();
        membersSnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 2. Delete the main team document.
        batch.delete(teamRef);

        // 3. Update the user's role in their Firestore document.
        const userToUpdate = await admin.auth().getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        // CORRECTED LOGIC: Only change role if they are a 'founder'. Admins keep their role.
        if (existingClaims.role === 'founder') {
             batch.update(userRef, { role: "player" });
        }

        // Atomically commit all the operations.
        await batch.commit();
        
        // After the batch succeeds, update the custom auth claims.
        // This is separate but less critical; the source of truth in Firestore is now correct.
        if (existingClaims.role === 'founder') {
             await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: "player" });
        }

        return { success: true, message: "Equipo eliminado con éxito." };

    } catch (error: any) {
        console.error("Error al eliminar el equipo:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Ocurrió un error inesperado durante la eliminación del equipo.");
    }
});
