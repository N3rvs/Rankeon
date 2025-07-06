

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
  const userRef = db.collection("users").doc(uid);
  
  try {
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    // Authoritative check on the user's document in Firestore.
    if (userData?.teamId) {
        throw new HttpsError('failed-precondition', 'Ya perteneces a un equipo. No puedes crear más de uno.');
    }

    const teamRef = db.collection("teams").doc();
    
    // Create the team and update user docs/claims in a single transaction-like batch
    const batch = db.batch();

    batch.set(teamRef, {
        id: teamRef.id,
        name,
        game,
        description: description || '',
        country: userData?.country || '',
        rankMin: userData?.rank || '',
        rankMax: userData?.rank || '',
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
    if (error instanceof HttpsError) throw error;
    
    // If team creation fails after the claim was set, try to roll back the claim change.
    const currentClaims = (await auth.getUser(uid)).customClaims;
    if (currentClaims?.role === 'founder' && !isPrivilegedUser) {
        await auth.setCustomUserClaims(uid, { ...claims, role: 'player' });
    }
    
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
  rankMin?: string;
  rankMax?: string;
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
    if (!teamId || !memberId || !role || !['coach', 'member'].includes(role)) {
        throw new HttpsError("invalid-argument", "Faltan datos o el rol no es válido.");
    }
    
    // Get user's current platform role before the transaction to see if they are privileged
    const userToUpdateAuth = await auth.getUser(memberId);
    const existingClaims = userToUpdateAuth.customClaims || {};
    const isPrivilegedUser = existingClaims.role === 'admin' || existingClaims.role === 'moderator';

    const teamRef = db.collection("teams").doc(teamId);
    
    try {
        await db.runTransaction(async (transaction) => {
            const teamDoc = await transaction.get(teamRef);
            if (!teamDoc.exists) {
                throw new HttpsError("not-found", "El equipo no existe.");
            }
            const teamData = teamDoc.data()!;
            
            const callerMemberRef = teamRef.collection('members').doc(requestAuth.uid);
            const callerMemberDoc = await transaction.get(callerMemberRef);
            if (!callerMemberDoc.exists) {
                throw new HttpsError("permission-denied", "No eres miembro de este equipo.");
            }
            const callerRole = callerMemberDoc.data()?.role;

            if (teamData.founder !== requestAuth.uid && callerRole !== 'coach') {
                throw new HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar roles.");
            }

            if (teamData.founder === memberId) {
                throw new HttpsError("permission-denied", "No puedes cambiar el rol del fundador.");
            }
            
            const memberToUpdateRef = teamRef.collection('members').doc(memberId);
            const memberToUpdateDoc = await transaction.get(memberToUpdateRef);
            if (!memberToUpdateDoc.exists) {
                throw new HttpsError("not-found", "El miembro que intentas actualizar no existe en el equipo.");
            }

            // Update role within the team's subcollection
            transaction.update(memberToUpdateRef, { role });

            // If not an admin/mod, update the denormalized role in the users collection
            if (!isPrivilegedUser) {
                const platformRole = role === 'coach' ? 'coach' : 'player';
                const userRef = db.collection('users').doc(memberId);
                transaction.update(userRef, { role: platformRole });
            }
        });

        // After the transaction succeeds, update the custom claim if necessary
        if (!isPrivilegedUser) {
            const platformRole = role === 'coach' ? 'coach' : 'player';
            await auth.setCustomUserClaims(memberId, { ...existingClaims, role: platformRole });
        }

        return { success: true, message: "Rol del miembro actualizado." };

    } catch (error: any) {
        console.error("Error updating team member role:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Ocurrió un error inesperado al actualizar el rol.");
    }
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


interface SendTeamInviteData {
  toUserId: string;
  teamId: string;
}

export const sendTeamInvite = onCall(async ({ auth: requestAuth, data }) => {
  if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
  
  const callerUid = requestAuth.uid;
  const { toUserId, teamId } = data as SendTeamInviteData;

  if (!toUserId || !teamId) throw new HttpsError("invalid-argument", "Faltan datos.");

  const teamRef = db.collection("teams").doc(teamId);
  const memberRef = teamRef.collection("members").doc(callerUid);
  const recipientRef = db.collection("users").doc(toUserId);

  const [teamSnap, memberSnap, recipientSnap] = await Promise.all([
    teamRef.get(),
    memberRef.get(),
    recipientRef.get(),
  ]);

  if (!teamSnap.exists) throw new HttpsError("not-found", "El equipo no existe.");
  if (!recipientSnap.exists) throw new HttpsError("not-found", "El usuario invitado no existe.");
  
  const memberData = memberSnap.data();
  if (!memberSnap.exists || (memberData?.role !== 'founder' && memberData?.role !== 'coach')) {
    throw new HttpsError("permission-denied", "Solo el fundador o un coach pueden enviar invitaciones.");
  }
  
  const recipientData = recipientSnap.data();
  if (recipientData?.teamId) {
    throw new HttpsError("failed-precondition", "Este jugador ya está en un equipo.");
  }

  const inviteQuery = db.collection("teamInvitations")
    .where("fromTeamId", "==", teamId)
    .where("toUserId", "==", toUserId)
    .where("status", "==", "pending");
  
  const existingInvite = await inviteQuery.get();
  if (!existingInvite.empty) {
    throw new HttpsError("already-exists", "Ya se ha enviado una invitación a este jugador.");
  }

  const batch = db.batch();
  const inviteRef = db.collection("teamInvitations").doc();

  batch.set(inviteRef, {
    fromTeamId: teamId,
    fromTeamName: teamSnap.data()?.name,
    toUserId,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const notificationRef = db.collection(`inbox/${toUserId}/notifications`).doc();
  batch.set(notificationRef, {
    type: "team_invite_received",
    from: callerUid, // The person who sent the invite
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    extraData: { 
        inviteId: inviteRef.id,
        teamId: teamId,
        teamName: teamSnap.data()?.name,
     }
  });
  
  await batch.commit();

  return { success: true, message: "Invitación enviada." };
});

interface RespondToTeamInviteData {
  inviteId: string;
  accept: boolean;
}

export const respondToTeamInvite = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const toUserId = requestAuth.uid;
    const { inviteId, accept } = data as RespondToTeamInviteData;

    if (!inviteId) throw new HttpsError("invalid-argument", "Falta el ID de la invitación.");

    const inviteRef = db.collection("teamInvitations").doc(inviteId);

    return db.runTransaction(async (transaction) => {
        const inviteSnap = await transaction.get(inviteRef);

        if (!inviteSnap.exists) throw new HttpsError("not-found", "Invitación no encontrada.");
        const inviteData = inviteSnap.data()!;

        if (inviteData.toUserId !== toUserId) throw new HttpsError("permission-denied", "No puedes responder a esta invitación.");
        if (inviteData.status !== 'pending') throw new HttpsError("failed-precondition", "La invitación ya ha sido respondida.");

        const teamRef = db.collection("teams").doc(inviteData.fromTeamId);
        const userRef = db.collection("users").doc(toUserId);

        const [teamSnap, userSnap] = await Promise.all([
            transaction.get(teamRef),
            transaction.get(userRef),
        ]);

        if (!teamSnap.exists) throw new HttpsError("not-found", "El equipo que te invitó ya no existe.");
        if (userSnap.data()?.teamId) throw new HttpsError("failed-precondition", "Ya te has unido a otro equipo.");

        if (accept) {
            transaction.update(inviteRef, { status: "accepted" });

            // Add user to team
            const newMemberRef = teamRef.collection("members").doc(toUserId);
            transaction.set(newMemberRef, {
                role: "member",
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(teamRef, {
                memberIds: admin.firestore.FieldValue.arrayUnion(toUserId)
            });

            // Update user's profile
            transaction.update(userRef, { teamId: inviteData.fromTeamId });

            // Send notification to team founder
            const founderId = teamSnap.data()?.founder;
            if (founderId) {
                const notificationRef = db.collection(`inbox/${founderId}/notifications`).doc();
                transaction.set(notificationRef, {
                    type: "team_invite_accepted",
                    from: toUserId,
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    extraData: { 
                        teamId: inviteData.fromTeamId,
                        newMemberName: userSnap.data()?.name || 'New Player',
                    }
                });
            }
        } else {
            transaction.update(inviteRef, { status: "rejected" });
        }

        return { success: true };
    });
});


interface ApplyToTeamData {
    teamId: string;
}

export const applyToTeam = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const applicantId = requestAuth.uid;
    const { teamId } = data as ApplyToTeamData;

    if (!teamId) throw new HttpsError("invalid-argument", "Falta el ID del equipo.");

    const applicantRef = db.collection("users").doc(applicantId);
    const teamRef = db.collection("teams").doc(teamId);

    const [applicantSnap, teamSnap] = await Promise.all([applicantRef.get(), teamRef.get()]);

    if (!applicantSnap.exists) throw new HttpsError("not-found", "Tu perfil no existe.");
    if (!teamSnap.exists) throw new HttpsError("not-found", "El equipo no existe.");

    const applicantData = applicantSnap.data()!;
    const teamData = teamSnap.data()!;

    if (applicantData.teamId) throw new HttpsError("failed-precondition", "Ya perteneces a un equipo.");
    if (!teamData.lookingForPlayers) throw new HttpsError("failed-precondition", "Este equipo no está buscando jugadores.");
    
    const applicationQuery = db.collection("teamApplications")
        .where("teamId", "==", teamId)
        .where("applicantId", "==", applicantId)
        .where("status", "==", "pending");
    
    const existingApplication = await applicationQuery.get();
    if (!existingApplication.empty) throw new HttpsError("already-exists", "Ya has enviado una solicitud a este equipo.");

    const batch = db.batch();
    const applicationRef = db.collection("teamApplications").doc();

    batch.set(applicationRef, {
        teamId,
        applicantId,
        applicantName: applicantData.name,
        applicantAvatarUrl: applicantData.avatarUrl,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const founderId = teamData.founder;
    const notificationRef = db.collection(`inbox/${founderId}/notifications`).doc();
    batch.set(notificationRef, {
        type: "team_application_received",
        from: applicantId, // The applicant
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: {
            applicationId: applicationRef.id,
            applicantId,
            applicantName: applicantData.name,
            teamId,
        }
    });

    await batch.commit();

    return { success: true, message: "Solicitud enviada." };
});

interface RespondToTeamApplicationData {
    applicationId: string;
    accept: boolean;
}

export const respondToTeamApplication = onCall(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const callerId = requestAuth.uid;
    const { applicationId, accept } = data as RespondToTeamApplicationData;

    if (!applicationId) throw new HttpsError("invalid-argument", "Falta el ID de la solicitud.");

    const applicationRef = db.collection("teamApplications").doc(applicationId);

    return db.runTransaction(async (transaction) => {
        const applicationSnap = await transaction.get(applicationRef);
        if (!applicationSnap.exists) throw new HttpsError("not-found", "Solicitud no encontrada.");

        const applicationData = applicationSnap.data()!;
        const { teamId, applicantId } = applicationData;

        const teamRef = db.collection("teams").doc(teamId);
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists) throw new HttpsError("not-found", "El equipo ya no existe.");
        
        const memberRef = teamRef.collection("members").doc(callerId);
        const memberSnap = await transaction.get(memberRef);
        if (!memberSnap.exists || (memberSnap.data()?.role !== 'founder' && memberSnap.data()?.role !== 'coach')) {
            throw new HttpsError("permission-denied", "No tienes permisos para gestionar solicitudes.");
        }

        const applicantRef = db.collection("users").doc(applicantId);
        const applicantSnap = await transaction.get(applicantRef);
        if (!applicantSnap.exists) throw new HttpsError("not-found", "El solicitante ya no existe.");
        if (applicantSnap.data()?.teamId) throw new HttpsError("failed-precondition", "El solicitante ya se ha unido a otro equipo.");

        if (accept) {
            transaction.update(applicationRef, { status: "accepted" });

            const newMemberRef = teamRef.collection("members").doc(applicantId);
            transaction.set(newMemberRef, { role: "member", joinedAt: admin.firestore.FieldValue.serverTimestamp() });
            transaction.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayUnion(applicantId) });
            transaction.update(applicantRef, { teamId: teamId });

            const notifRef = db.collection(`inbox/${applicantId}/notifications`).doc();
            transaction.set(notifRef, {
                type: "team_application_accepted",
                from: callerId,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                extraData: { teamId: teamId, teamName: teamSnap.data()?.name }
            });

        } else {
            transaction.update(applicationRef, { status: "rejected" });
            const notifRef = db.collection(`inbox/${applicantId}/notifications`).doc();
            transaction.set(notifRef, {
                type: "team_application_rejected",
                from: callerId,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                extraData: { teamId: teamId, teamName: teamSnap.data()?.name }
            });
        }
    });
});
