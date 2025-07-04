// 📁 functions/src/teams.ts
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

  // Comprobación rápida en el token. Esto puede rechazar rápidamente si el token está actualizado.
  if (auth?.token.role === 'founder') {
    throw new HttpsError('already-exists', 'Solo puedes ser fundador de un equipo.');
  }

  const teamRef = db.collection("teams").doc();
  const userRef = db.collection("users").doc(uid);

  try {
    // Transacción para garantizar una operación atómica y segura.
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      // Comprobación definitiva y segura dentro de la transacción.
      // Esto evita condiciones de carrera (race conditions).
      if (userDoc.exists() && userDoc.data()?.role === 'founder') {
          throw new HttpsError('already-exists', 'Solo puedes ser fundador de un equipo. Por favor, elimina tu equipo existente si deseas crear uno nuevo.');
      }

      // Si la comprobación pasa, creamos el equipo.
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

      const memberRef = teamRef.collection("members").doc(uid);
      transaction.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Actualizamos el rol del usuario en Firestore.
      transaction.update(userRef, { role: 'founder' });
    });

    // Tras el éxito de la transacción, actualizamos los custom claims.
    const userToUpdate = await admin.auth().getUser(uid);
    const existingClaims = userToUpdate.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'founder' });

    return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };
  } catch (error: any) {
    console.error("Error creando equipo:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo.');
  }
});

export const deleteTeam = onCall(async ({ auth, data }: { auth?: any, data: { teamId: string } }) => {
    const uid = auth?.uid;
    const { teamId } = data;

    if (!uid || !teamId) {
        throw new HttpsError("invalid-argument", "Falta autenticación o ID del equipo.");
    }

    const teamRef = db.collection("teams").doc(teamId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const teamDoc = await transaction.get(teamRef);
            if (!teamDoc.exists) {
                throw new HttpsError("not-found", "Equipo no encontrado.");
            }
            const teamData = teamDoc.data();
            if (!teamData || teamData.founder !== uid) {
                throw new HttpsError("permission-denied", "Solo el fundador del equipo puede eliminarlo.");
            }

            const memberIds: string[] = teamData.memberIds || [];
            
            for (const memberId of memberIds) {
                const memberRef = db.doc(`teams/${teamId}/members/${memberId}`);
                transaction.delete(memberRef);
            }

            transaction.delete(teamRef);

            const userRef = db.collection('users').doc(uid);
            transaction.update(userRef, { role: 'player' });
        });

        const userToUpdate = await admin.auth().getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...existingClaims, role: 'player' });

        return { success: true, message: "Equipo eliminado con éxito." };
    } catch(error: any) {
        console.error("Error eliminando equipo:", error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'Ocurrió un error inesperado durante la eliminación del equipo.');
    }
});

interface AcceptTeamInvitationData {
  teamId: string;
}

export const acceptTeamInvitation = onCall(async ({ auth, data }: { auth?: any, data: AcceptTeamInvitationData }) => {
  const uid = auth?.uid;
  const { teamId } = data;

  if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!teamId) throw new HttpsError("invalid-argument", "Missing team ID.");

  const teamRef = db.collection("teams").doc(teamId);
  const invitationRef = teamRef.collection("invitations").doc(uid);
  const memberRef = teamRef.collection("members").doc(uid);

  return db.runTransaction(async (transaction) => {
    const teamDoc = await transaction.get(teamRef);
    if (!teamDoc.exists) throw new HttpsError("not-found", "Team not found.");

    const invitationDoc = await transaction.get(invitationRef);
    if (!invitationDoc.exists) {
      throw new HttpsError("failed-precondition", "No invitation found.");
    }
    
    transaction.delete(invitationRef);
    transaction.set(memberRef, {
      role: "member",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(teamRef, {
      memberIds: admin.firestore.FieldValue.arrayUnion(uid)
    });
  });
});

interface KickUserData {
  teamId: string;
  targetUid: string;
}

export const kickUserFromTeam = onCall(async ({ auth, data }: { auth?: any, data: KickUserData }) => {
  const uid = auth?.uid;
  const { teamId, targetUid } = data;

  if (!uid || !teamId || !targetUid) {
    throw new HttpsError("invalid-argument", "Missing team ID or target UID.");
  }
  if (uid === targetUid) {
    throw new HttpsError("invalid-argument", "You can't kick yourself.");
  }

  const teamRef = db.collection("teams").doc(teamId);
  const memberRef = teamRef.collection("members").doc(uid);
  const targetMemberRef = teamRef.collection("members").doc(targetUid);
  
  return db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const memberRole = memberSnap.data()?.role;

    if (memberRole !== 'founder') {
      throw new HttpsError("permission-denied", "Only the founder can kick members.");
    }
    
    transaction.delete(targetMemberRef);
    transaction.update(teamRef, {
      memberIds: admin.firestore.FieldValue.arrayRemove(targetUid)
    });
  });
});

interface ManageRoleData {
  teamId: string;
  targetUid: string;
  newRole: 'member' | 'coach' | 'founder';
}

export const changeUserRole = onCall(async ({ auth, data }: { auth?: any, data: ManageRoleData }) => {
  const uid = auth?.uid;
  const { teamId, targetUid, newRole } = data;

  if (!uid || !teamId || !targetUid || !newRole) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const requesterRef = db.doc(`teams/${teamId}/members/${uid}`);
  const requesterSnap = await requesterRef.get();
  const requesterRole = requesterSnap.data()?.role;

  if (!['coach', 'founder'].includes(requesterRole)) {
    throw new HttpsError("permission-denied", "Only coaches or founders can change roles.");
  }

  if (requesterRole === 'coach' && newRole === 'founder') {
    throw new HttpsError("permission-denied", "Coaches cannot assign founder role.");
  }

  await db.doc(`teams/${teamId}/members/${targetUid}`).update({
    role: newRole,
  });

  return { success: true };
});
