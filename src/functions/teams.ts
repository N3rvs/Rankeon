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

  const teamRef = db.collection("teams").doc();
  const userRef = db.collection("users").doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found.');
      }
      if (userDoc.data()?.role === 'founder') {
        throw new HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
      }
      
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const memberRef = teamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // ONLY change role to 'founder' if the user is a 'player'.
      // Admins and moderators keep their roles.
      if (userDoc.data()?.role === 'player') {
        transaction.update(userRef, { role: 'founder' });
      }
    });

    const userToUpdate = await admin.auth().getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};
    
    // Only update claims if the user is a 'player'
    if (existingClaims.role === 'player' || !existingClaims.role) {
      await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'founder' });
    }

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
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            return { success: true, message: "El equipo ya no existía." };
        }
        if (teamDoc.data()?.founder !== uid) {
            throw new HttpsError("permission-denied", "Solo el fundador del equipo puede eliminarlo.");
        }

        const userAuthRecord = await admin.auth().getUser(uid);
        const userClaims = userAuthRecord.customClaims || {};
        
        const batch = db.batch();

        const membersSnap = await teamRef.collection("members").get();
        membersSnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(teamRef);

        // CORRECTED LOGIC: Only change role if they are a 'founder'. Admins keep their role.
        if (userClaims.role === 'founder') {
             batch.update(userRef, { role: "player" });
        }

        await batch.commit();
        
        // After batch succeeds, update claims if needed.
        if (userClaims.role === 'founder') {
             await admin.auth().setCustomUserClaims(uid, { ...userClaims, role: "player" });
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
