
// functions/src/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

// =============================================
// CREATE TEAM (Robust version)
// =============================================
interface CreateTeamData {
  name: string;
  game: string;
  description?: string;
}

export const createTeam = onCall(async ({ auth: requestAuth, data }) => {
  if (!requestAuth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para crear un equipo.");
  }
  const uid = requestAuth.uid;
  const claims = requestAuth.token || {};
  const { name, game, description } = data as CreateTeamData;

  if (!name || !game) {
    throw new HttpsError("invalid-argument", "El nombre del equipo y el juego son obligatorios.");
  }

  const userRef = db.collection("users").doc(uid);
  const isPrivilegedUser = claims.role === 'admin' || claims.role === 'moderator';

  try {
    const teamRef = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found.');
      }
      
      if (userDoc.data()?.role === 'founder' && !isPrivilegedUser) {
        throw new HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
      }
      
      const newTeamRef = db.collection("teams").doc();
      
      transaction.set(newTeamRef, {
        id: newTeamRef.id,
        name,
        game,
        description: description || '',
        avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
        bannerUrl: 'https://placehold.co/1200x400.png',
        founder: uid,
        memberIds: [uid],
        recruitingRoles: [],
        lookingForPlayers: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const memberRef = newTeamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      if (!isPrivilegedUser) {
        transaction.update(userRef, { role: 'founder' });
      }
      return newTeamRef;
    });

    if (!isPrivilegedUser) {
      await auth.setCustomUserClaims(uid, { ...claims, role: 'founder' });
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
  recruitingRoles: string[];
}

export const updateTeam = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para editar el equipo.");
    }
    const uid = requestAuth.uid;
    const { teamId, name, description, lookingForPlayers, recruitingRoles } = data as UpdateTeamData;

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
            recruitingRoles: Array.isArray(recruitingRoles) ? recruitingRoles : [],
        });

        return { success: true, message: "Equipo actualizado con éxito." };
    } catch (error: any) {
        console.error("Error updating team:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el equipo.");
    }
});


// =============================================
// DELETE TEAM (Definitive, robust version)
// =============================================
interface DeleteTeamData {
    teamId: string;
}

export const deleteTeam = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new HttpsError("unauthenticated", "Falta autenticación.");
    }
    const uid = requestAuth.uid;
    const { teamId } = data as DeleteTeamData;
    
    if (!teamId) {
        throw new HttpsError("invalid-argument", "Falta ID del equipo.");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const userRef = db.collection("users").doc(uid);
    const claims = requestAuth.token || {};

    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            return { success: true, message: "El equipo ya no existía." };
        }
        if (teamDoc.data()?.founder !== uid) {
            throw new HttpsError("permission-denied", "Solo el fundador del equipo puede eliminarlo.");
        }

        const batch = db.batch();

        const membersSnap = await teamRef.collection("members").get();
        membersSnap.forEach(doc => batch.delete(doc.ref));

        batch.delete(teamRef);
        
        if (claims.role === 'founder') {
             batch.update(userRef, { role: "player" });
        }

        await batch.commit();
        
        if (claims.role === 'founder') {
             await auth.setCustomUserClaims(uid, { ...claims, role: "player" });
        }

        return { success: true, message: "Equipo eliminado con éxito." };

    } catch (error: any) {
        console.error("Error al eliminar el equipo:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Ocurrió un error inesperado durante la eliminación del equipo.");
    }
});
