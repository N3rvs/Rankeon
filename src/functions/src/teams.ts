
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
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const teamRef = db.collection("teams").doc();
    
    // Create the team and update user docs/claims in a single transaction-like batch
    const batch = db.batch();

    batch.set(teamRef, {
        id: teamRef.id,
        name,
        game,
        description: description || '',
        country: userData?.country || '',
        avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
        bannerUrl: 'https://placehold.co/1200x400.png',
        founder: uid,
        memberIds: [uid],
        recruitingRoles: [],
        lookingForPlayers: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        videoUrl: '',
        discordUrl: '',
        twitchUrl: '',
        twitterUrl: '',
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
  avatarUrl?: string;
  bannerUrl?: string;
  discordUrl?: string;
  twitchUrl?: string;
  twitterUrl?: string;
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
        
        await teamRef.update(updateData);

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

    // Check permissions
    const callerMemberDoc = await teamRef.collection("members").doc(requestAuth.uid).get();
    if (!callerMemberDoc.exists) {
        throw new HttpsError("permission-denied", "No eres miembro de este equipo.");
    }
    const callerRole = callerMemberDoc.data()?.role;

    const memberToKickDoc = await teamRef.collection("members").doc(memberId).get();
    if (!memberToKickDoc.exists) {
        // The member is already not in the team. Succeed silently.
        return { success: true, message: "El miembro ya no estaba en el equipo." };
    }
    const memberToKickRole = memberToKickDoc.data()?.role;

    if (memberId === teamDoc.data()?.founder) {
        throw new HttpsError("permission-denied", "El fundador no puede ser expulsado.");
    }

    if (callerRole === 'founder') {
        // Founder can kick anyone (except themselves, checked above).
    } else if (callerRole === 'coach') {
        // Coach can only kick members.
        if (memberToKickRole !== 'member') {
            throw new HttpsError("permission-denied", "Un entrenador solo puede expulsar a los miembros.");
        }
    } else {
        throw new HttpsError("permission-denied", "Solo el fundador o un entrenador pueden expulsar miembros.");
    }

    const batch = db.batch();
    batch.delete(teamRef.collection('members').doc(memberId));
    batch.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayRemove(memberId) });
    batch.update(db.collection('users').doc(memberId), { teamId: admin.firestore.FieldValue.delete() });

    await batch.commit();

    return { success: true, message: "Miembro expulsado del equipo." };
});

interface IGLData {
    teamId: string;
    memberId: string | null;
}

export const setTeamIGL = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");

    const { teamId, memberId } = data as IGLData;
    if (!teamId) throw new HttpsError("invalid-argument", "Falta ID del equipo.");

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");
    
    // Permission check: Caller must be founder or coach.
    const callerMemberRef = teamRef.collection("members").doc(requestAuth.uid);
    const callerMemberSnap = await callerMemberRef.get();
    if (!callerMemberSnap.exists) {
        throw new HttpsError("permission-denied", "No eres miembro de este equipo.");
    }
    const callerRole = callerMemberSnap.data()?.role;
    if (callerRole !== 'founder' && callerRole !== 'coach') {
        throw new HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar el rol de IGL.");
    }
    
    return db.runTransaction(async (transaction) => {
        const membersRef = teamRef.collection("members");
        const membersQuery = await transaction.get(membersRef);

        // Unset previous IGL
        for (const memberDoc of membersQuery.docs) {
            if (memberDoc.data().isIGL === true) {
                transaction.update(memberDoc.ref, { isIGL: admin.firestore.FieldValue.delete() });
            }
        }
        
        // Set new IGL
        if (memberId) {
            const newIglRef = membersRef.doc(memberId);
            transaction.update(newIglRef, { isIGL: true });
        }

        return { success: true, message: "Rol de IGL actualizado."};
    });
});

export const sendTeamInvite = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    
    const { toUserId, teamId } = data as { toUserId: string, teamId: string };
    if (!toUserId || !teamId) throw new HttpsError("invalid-argument", "Faltan datos.");

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");
    
    const callerMemberDoc = await teamRef.collection('members').doc(requestAuth.uid).get();
    if (!callerMemberDoc.exists || !['founder', 'coach'].includes(callerMemberDoc.data()?.role)) {
        throw new HttpsError("permission-denied", "Solo el fundador o un coach pueden enviar invitaciones.");
    }
    
    const targetUserDoc = await db.collection("users").doc(toUserId).get();
    if (!targetUserDoc.exists || targetUserDoc.data()?.teamId) {
        throw new HttpsError("failed-precondition", "El jugador no existe o ya está en un equipo.");
    }

    const inviteRef = db.collection("teamInvitations").doc();
    const batch = db.batch();

    batch.set(inviteRef, {
        id: inviteRef.id,
        fromTeamId: teamId,
        fromTeamName: teamDoc.data()?.name,
        toUserId,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const notificationRef = db.collection(`inbox/${toUserId}/notifications`).doc();
    batch.set(notificationRef, {
        type: "team_invite_received",
        from: requestAuth.uid, // Sent by a user on behalf of a team
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { inviteId: inviteRef.id, teamId: teamId, teamName: teamDoc.data()?.name }
    });

    await batch.commit();
    return { success: true, message: "Invitación enviada." };
});


export const respondToTeamInvite = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    
    const { inviteId, accept } = data as { inviteId: string, accept: boolean };
    if (!inviteId) throw new HttpsError("invalid-argument", "Falta ID de invitación.");

    const inviteRef = db.collection("teamInvitations").doc(inviteId);
    
    return db.runTransaction(async (transaction) => {
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists || inviteSnap.data()?.toUserId !== requestAuth.uid) {
            throw new HttpsError("permission-denied", "No tienes permiso para responder a esta invitación.");
        }
        if (inviteSnap.data()?.status !== 'pending') {
            throw new HttpsError("failed-precondition", "Esta invitación ya ha sido respondida.");
        }

        transaction.update(inviteRef, { status: accept ? "accepted" : "rejected" });

        if (accept) {
            const teamId = inviteSnap.data()?.fromTeamId;
            const teamRef = db.collection("teams").doc(teamId);
            const userRef = db.collection("users").doc(requestAuth.uid);

            const [teamDoc, userDoc] = await Promise.all([transaction.get(teamRef), transaction.get(userRef)]);
            if (!teamDoc.exists || userDoc.data()?.teamId) {
                throw new HttpsError("failed-precondition", "El equipo ya no existe o ya te has unido a otro equipo.");
            }

            transaction.update(userRef, { teamId: teamId });
            transaction.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayUnion(requestAuth.uid) });
            
            const memberRef = teamRef.collection("members").doc(requestAuth.uid);
            transaction.set(memberRef, { role: "member", joinedAt: admin.firestore.FieldValue.serverTimestamp() });
        }

        return { success: true, message: `Invitación ${accept ? 'aceptada' : 'rechazada'}.` };
    });
});

export const applyToTeam = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    
    const { teamId, message } = data as { teamId: string, message?: string };
    if (!teamId) throw new HttpsError("invalid-argument", "Falta ID del equipo.");

    const userDoc = await db.collection("users").doc(requestAuth.uid).get();
    if (!userDoc.exists()) {
        throw new HttpsError("not-found", "User profile does not exist.");
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new HttpsError("internal", "Could not retrieve user data.");
    }
    if (userData.teamId) {
        throw new HttpsError("failed-precondition", "Ya estás en un equipo.");
    }
    
    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists()) {
        throw new HttpsError("not-found", "El equipo no existe.");
    }

    const teamData = teamDoc.data();
    if (!teamData) {
        throw new HttpsError("internal", "Could not retrieve team data.");
    }
    if (!teamData.lookingForPlayers) {
        throw new HttpsError("failed-precondition", "Este equipo no está reclutando actualmente.");
    }
    
    const applicationRef = db.collection("teamApplications").doc();
    const batch = db.batch();

    batch.set(applicationRef, {
        id: applicationRef.id,
        teamId: teamId,
        applicantId: requestAuth.uid,
        applicantName: userData.name,
        applicantAvatarUrl: userData.avatarUrl,
        message: message || `Hola, me gustaría unirme a ${teamData.name}.`,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const founderId = teamData.founder;
    if (!founderId) {
        console.error(`Team ${teamId} is missing a founder.`);
        throw new HttpsError("internal", "The team is misconfigured and has no founder.");
    }

    const notificationRef = db.collection(`inbox/${founderId}/notifications`).doc();
    batch.set(notificationRef, {
        type: "team_application_received",
        from: requestAuth.uid,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { 
            applicationId: applicationRef.id,
            teamId: teamId, 
            applicantName: userData.name,
            applicantAvatarUrl: userData.avatarUrl 
        }
    });

    await batch.commit();

    return { success: true, message: "Solicitud enviada." };
});

export const respondToTeamApplication = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");

    const { applicationId, accept } = data as { applicationId: string, accept: boolean };
    if (!applicationId) throw new HttpsError("invalid-argument", "Falta ID de solicitud.");
    
    const applicationRef = db.collection("teamApplications").doc(applicationId);

    return db.runTransaction(async (transaction) => {
        const appSnap = await transaction.get(applicationRef);
        if (!appSnap.exists) throw new HttpsError("not-found", "La solicitud no existe.");
        
        const appData = appSnap.data()!;
        if (appData.status !== 'pending') {
            throw new HttpsError("failed-precondition", "Esta solicitud ya ha sido procesada.");
        }

        const teamRef = db.collection("teams").doc(appData.teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo ya no existe.");
        
        const callerMemberDoc = await transaction.get(teamRef.collection("members").doc(requestAuth.uid));
        if (!callerMemberDoc.exists || !['founder', 'coach'].includes(callerMemberDoc.data()?.role)) {
            throw new HttpsError("permission-denied", "No tienes permiso para gestionar solicitudes.");
        }

        transaction.update(applicationRef, { status: accept ? 'accepted' : 'rejected' });
        
        if (accept) {
            const userRef = db.collection('users').doc(appData.applicantId);
            const userDoc = await transaction.get(userRef);
            if(userDoc.data()?.teamId) {
                throw new HttpsError("failed-precondition", "El jugador ya se ha unido a otro equipo.");
            }

            transaction.update(userRef, { teamId: appData.teamId });
            transaction.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayUnion(appData.applicantId) });
            
            const memberRef = teamRef.collection("members").doc(appData.applicantId);
            transaction.set(memberRef, { role: "member", joinedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        
        // Notify applicant
        const notificationRef = db.collection(`inbox/${appData.applicantId}/notifications`).doc();
        transaction.set(notificationRef, {
            type: accept ? "team_application_accepted" : "team_application_rejected",
            from: requestAuth.uid,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            extraData: { teamId: appData.teamId, teamName: teamDoc.data()?.name }
        });

        return { success: true, message: `Solicitud ${accept ? 'aceptada' : 'rechazada'}.` };
    });
});
