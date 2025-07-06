
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

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

  const isPrivilegedUser = claims.role === 'admin' || claims.role === 'moderator';

  // Check precondition using the auth token as the single source of truth.
  if (claims.role === 'founder') {
    throw new HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
  }

  const userRef = db.collection("users").doc(uid);
  
  try {
    const teamRef = db.collection("teams").doc();
    
    // Create the team and update user docs/claims in a single transaction-like batch
    const batch = db.batch();

    batch.set(teamRef, {
        id: teamRef.id,
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

    const memberRef = teamRef.collection("members").doc(uid);
    batch.set(memberRef, {
        role: "founder",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update the denormalized role and teamId in the user's Firestore document.
    const userUpdateData: { role?: string; teamId: string } = { teamId: teamRef.id };
    if (!isPrivilegedUser) {
        userUpdateData.role = 'founder';
    }
    batch.update(userRef, userUpdateData);

    // If user is not an admin/mod, update their claim. This is the security-critical step.
    if (!isPrivilegedUser) {
        await auth.setCustomUserClaims(uid, { ...claims, role: 'founder' });
    }
    
    await batch.commit();

    return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };

  } catch (error: any) {
    console.error("Error creating team:", error);
    // If team creation fails, try to roll back the claim change.
    if (!isPrivilegedUser) {
        await auth.setCustomUserClaims(uid, { ...claims, role: 'player' });
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo.');
  }
});

interface UpdateTeamData {
  teamId: string;
  name: string;
  description?: string;
  lookingForPlayers: boolean;
  recruitingRoles: string[];
  videoUrl?: string;
}

export const updateTeam = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para editar el equipo.");
    }
    const uid = requestAuth.uid;
    const { teamId, ...updateData } = data as UpdateTeamData;

    if (!teamId || !updateData.name) {
        throw new HttpsError("invalid-argument", "Faltan datos del equipo (ID o nombre).");
    }

    const teamRef = db.collection("teams").doc(teamId);
    
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            throw new HttpsError("not-found", "El equipo no existe.");
        }
        if (teamDoc.data()?.founder !== uid && requestAuth.token.role !== 'admin') {
            throw new HttpsError("permission-denied", "Solo el fundador o un administrador pueden editar este equipo.");
        }
        
        await teamRef.update({
            name: updateData.name,
            description: updateData.description || '',
            lookingForPlayers: typeof updateData.lookingForPlayers === 'boolean' ? updateData.lookingForPlayers : false,
            recruitingRoles: Array.isArray(updateData.recruitingRoles) ? updateData.recruitingRoles : [],
            videoUrl: updateData.videoUrl || '',
        });

        return { success: true, message: "Equipo actualizado con éxito." };
    } catch (error: any) {
        console.error("Error updating team:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo actualizar el equipo.");
    }
});


interface DeleteTeamData {
    teamId: string;
}

export const deleteTeam = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    
    const callerUid = requestAuth.uid;
    const callerClaims = requestAuth.token || {};
    const { teamId } = data as DeleteTeamData;
    if (!teamId) throw new HttpsError("invalid-argument", "Falta ID del equipo.");

    const teamRef = db.collection("teams").doc(teamId);
    
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) return { success: true, message: "El equipo ya no existía." };
    
    const teamData = teamDoc.data();
    if (!teamData) throw new HttpsError("not-found", "El equipo no existe.");
    
    const founderId = teamData.founder;
    const isCallerFounder = founderId === callerUid;
    const isCallerAdmin = callerClaims.role === 'admin';

    if (!isCallerFounder && !isCallerAdmin) {
      throw new HttpsError("permission-denied", "Solo el fundador del equipo o un administrador pueden eliminarlo.");
    }

    // Step 1: Revert founder's custom claim in Firebase Auth. This prevents "ghost" roles.
    try {
        const founderAuth = await auth.getUser(founderId);
        const founderClaims = founderAuth.customClaims || {};
        
        if (founderClaims.role === 'founder') {
            await auth.setCustomUserClaims(founderId, { ...founderClaims, role: "player" });
        }
    } catch (error) {
        console.error(`CRITICAL: Failed to revert claim for founder ${founderId} during team deletion.`, error);
        throw new HttpsError('internal', 'No se pudo actualizar el rol del fundador. El equipo no fue eliminado. Por favor, contacta a soporte.');
    }

    // Step 2: Delete team documents and update all members' user docs in Firestore.
    try {
        const batch = db.batch();
        const membersSnap = await teamRef.collection("members").get();
        
        // Update all members to remove their teamId and revert founder's Firestore role
        (teamData.memberIds || []).forEach((memberId: string) => {
            const userRef = db.collection("users").doc(memberId);
            const updateData: any = { 
                teamId: admin.firestore.FieldValue.delete()
            };
            
            if (memberId === founderId) {
                updateData.role = "player";
            }
            batch.update(userRef, updateData);
        });

        // Delete all member documents in the subcollection
        membersSnap.forEach(doc => batch.delete(doc.ref));
        
        // Delete the main team document
        batch.delete(teamRef);

        await batch.commit();

        return { success: true, message: "Equipo eliminado con éxito." };

    } catch (error: any) {
        console.error("Error al eliminar los documentos del equipo:", error);
        throw new HttpsError("internal", "El rol del fundador fue actualizado, pero ocurrió un error al eliminar los datos del equipo. Por favor, contacta a soporte.");
    }
});


interface MemberRoleData {
    teamId: string;
    memberId: string;
    role: 'coach' | 'member';
}

export const updateTeamMemberRole = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId, role } = data as MemberRoleData;
    if (!teamId || !memberId || !role) throw new HttpsError("invalid-argument", "Faltan datos.");

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");
    
    const teamData = teamDoc.data();
    const callerRoleDoc = await teamRef.collection('members').doc(requestAuth.uid).get();
    const callerRole = callerRoleDoc.data()?.role;

    if (teamData?.founder !== requestAuth.uid && callerRole !== 'coach') {
        throw new HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar roles.");
    }

    if (teamData?.founder === memberId) {
         throw new HttpsError("permission-denied", "No puedes cambiar el rol del fundador.");
    }

    await teamRef.collection('members').doc(memberId).update({ role });
    return { success: true, message: "Rol del miembro actualizado." };
});


interface KickMemberData {
    teamId: string;
    memberId: string;
}

export const kickTeamMember = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data as KickMemberData;
    if (!teamId || !memberId) throw new HttpsError("invalid-argument", "Faltan datos.");

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");

    if (teamDoc.data()?.founder !== requestAuth.uid) {
        throw new HttpsError("permission-denied", "Solo el fundador puede expulsar miembros.");
    }
     if (teamDoc.data()?.founder === memberId) {
         throw new HttpsError("permission-denied", "El fundador no puede ser expulsado.");
    }

    const batch = db.batch();
    batch.delete(teamRef.collection('members').doc(memberId));
    batch.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayRemove(memberId) });
    batch.update(db.collection('users').doc(memberId), { teamId: admin.firestore.FieldValue.delete() });

    await batch.commit();

    return { success: true, message: "Miembro expulsado del equipo." };
});
