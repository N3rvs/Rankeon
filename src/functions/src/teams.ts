

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

interface CreateTeamData {
  name: string;
  game: string;
  description?: string;
}

interface TeamMembersData {
    teamId: string;
}

export const getTeamMembers = onCall(async ({ auth: callerAuth, data }) => {
    if (!callerAuth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { teamId } = data as TeamMembersData;

    if (!teamId) {
        throw new HttpsError('invalid-argument', 'Team ID is required.');
    }

    try {
        const membersSnap = await db.collection(`teams/${teamId}/members`).get();
        if (membersSnap.empty) {
            return [];
        }

        const memberPromises = membersSnap.docs.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            const userDocSnap = await db.collection('users').doc(memberDoc.id).get();
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data()!;
                
                return {
                    id: memberDoc.id,
                    role: memberData.role, // Use the team-specific role
                    joinedAt: memberData.joinedAt?.toDate().toISOString() || null,
                    isIGL: memberData.isIGL || false,
                    name: userData.name || '',
                    avatarUrl: userData.avatarUrl || '',
                    skills: userData.skills || [],
                    isCertifiedStreamer: userData.isCertifiedStreamer || false,
                };
            }
            return null;
        });

        const members = (await Promise.all(memberPromises)).filter(Boolean);
        return members;

    } catch (error: any) {
        console.error(`Error fetching members for team ${teamId}:`, error);
        throw new HttpsError('internal', 'An unexpected error occurred while fetching team members.');
    }
});


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
    
    if (memberId === teamDoc.data()?.founder) {
        throw new HttpsError("permission-denied", "El fundador no puede ser expulsado.");
    }

    if (callerRole !== 'founder') {
        throw new HttpsError("permission-denied", "Solo el fundador puede expulsar miembros.");
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

export const sendTeamInvite = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: SendTeamInviteData }) => {
    if (!callerAuth) throw new HttpsError("unauthenticated", "Debes iniciar sesión para invitar a jugadores.");
    const { toUserId, teamId } = data;
    if (!toUserId || !teamId) throw new HttpsError("invalid-argument", "Faltan datos (ID de usuario o equipo).");
    if (toUserId === callerAuth.uid) throw new HttpsError("invalid-argument", "No puedes invitarte a ti mismo.");

    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");

    const teamData = teamDoc.data()!;
    const memberDoc = await db.collection(`teams/${teamId}/members`).doc(callerAuth.uid).get();
    const isStaff = teamData.founder === callerAuth.uid || memberDoc.data()?.role === 'coach';

    if (!isStaff) {
        throw new HttpsError("permission-denied", "Solo el staff del equipo puede enviar invitaciones.");
    }

    if (teamData.memberIds && teamData.memberIds.length >= 8) {
      throw new HttpsError("failed-precondition", "Tu equipo está lleno y no puedes enviar más invitaciones.");
    }
    
    const targetUserDoc = await db.collection("users").doc(toUserId).get();
    if (!targetUserDoc.exists || targetUserDoc.data()?.teamId) {
        throw new HttpsError("failed-precondition", "El jugador no existe o ya está en un equipo.");
    }

    const existingInviteQuery = await db.collection("teamInvitations")
        .where("fromTeamId", "==", teamId)
        .where("toUserId", "==", toUserId)
        .where("status", "==", "pending")
        .get();

    if (!existingInviteQuery.empty) {
        throw new HttpsError("already-exists", "Ya se ha enviado una invitación a este jugador.");
    }
    
    const batch = db.batch();
    const inviteRef = db.collection("teamInvitations").doc();
    batch.set(inviteRef, {
        fromTeamId: teamId,
        fromTeamName: teamData.name,
        toUserId: toUserId,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const notificationRef = db.collection(`inbox/${toUserId}/notifications`).doc();
    batch.set(notificationRef, {
        type: "team_invite_received",
        from: teamId,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { inviteId: inviteRef.id, teamName: teamData.name }
    });
    
    await batch.commit();
    return { success: true, message: "Invitación enviada con éxito." };
});


interface RespondToTeamInviteData {
    inviteId: string;
    accept: boolean;
}

export const respondToTeamInvite = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: RespondToTeamInviteData }) => {
    if (!callerAuth) throw new HttpsError("unauthenticated", "Debes iniciar sesión para responder.");
    const { inviteId, accept } = data;
    if (!inviteId) throw new HttpsError("invalid-argument", "Falta el ID de la invitación.");

    const inviteRef = db.collection("teamInvitations").doc(inviteId);
    
    return db.runTransaction(async (transaction) => {
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists) throw new HttpsError("not-found", "Invitación no encontrada.");

        const inviteData = inviteSnap.data()!;
        if (inviteData.toUserId !== callerAuth.uid) throw new HttpsError("permission-denied", "Esta invitación no es para ti.");
        if (inviteData.status !== 'pending') throw new HttpsError("failed-precondition", "Esta invitación ya ha sido respondida.");

        const userRef = db.collection("users").doc(callerAuth.uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) {
            throw new HttpsError("not-found", "No se pudo encontrar tu perfil de usuario.");
        }
        
        const userData = userSnap.data()!;
        if (userData.teamId) throw new HttpsError("failed-precondition", "Ya estás en un equipo.");

        transaction.update(inviteRef, { status: accept ? 'accepted' : 'rejected' });
        
        if (accept) {
            const teamRef = db.collection("teams").doc(inviteData.fromTeamId);
            const teamSnap = await transaction.get(teamRef);
            if (!teamSnap.exists) {
              throw new HttpsError("not-found", "The team you're trying to join no longer exists.");
            }
            const teamData = teamSnap.data()!;

            if (teamData.memberIds && teamData.memberIds.length >= 8) {
              throw new HttpsError("failed-precondition", "El equipo está lleno y no puede aceptar nuevos miembros.");
            }
            
            const memberRef = teamRef.collection("members").doc(callerAuth.uid);
            
            const teamRole = userData.role === 'coach' ? 'coach' : 'member';
            
            transaction.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayUnion(callerAuth.uid) });
            transaction.set(memberRef, {
                role: teamRole,
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(userRef, { teamId: inviteData.fromTeamId });

            // Notify team founder
            const teamFounderId = teamData.founder;
            if (teamFounderId) {
                const notificationRef = db.collection(`inbox/${teamFounderId}/notifications`).doc();
                transaction.set(notificationRef, {
                    type: "team_invite_accepted",
                    from: callerAuth.uid,
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    extraData: { userName: userData.name, teamId: teamRef.id }
                });
            }
        }
        return { success: true, message: `Invitación ${accept ? 'aceptada' : 'rechazada'}` };
    });
});

interface ApplyToTeamData {
    teamId: string;
    message?: string;
}

export const applyToTeam = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: ApplyToTeamData }) => {
    if (!callerAuth) throw new HttpsError("unauthenticated", "Debes iniciar sesión para aplicar.");
    const { teamId, message } = data;
    if (!teamId) throw new HttpsError("invalid-argument", "Falta el ID del equipo.");

    const userSnap = await db.collection("users").doc(callerAuth.uid).get();
    const teamSnap = await db.collection("teams").doc(teamId).get();

    if (!userSnap.exists) throw new HttpsError("not-found", "No se encontró tu perfil de usuario.");
    if (userSnap.data()?.teamId) throw new HttpsError("failed-precondition", "Ya estás en un equipo.");
    if (!teamSnap.exists || !teamSnap.data()?.lookingForPlayers) {
        throw new HttpsError("failed-precondition", "Este equipo no está buscando jugadores actualmente.");
    }
    
    const existingApplicationQuery = await db.collection("teamApplications")
        .where("teamId", "==", teamId)
        .where("applicantId", "==", callerAuth.uid)
        .where("status", "==", "pending")
        .get();

    if (!existingApplicationQuery.empty) {
        throw new HttpsError("already-exists", "Ya has solicitado unirte a este equipo.");
    }

    const applicationRef = db.collection("teamApplications").doc();
    const founderId = teamSnap.data()!.founder;

    const batch = db.batch();
    batch.set(applicationRef, {
        teamId,
        applicantId: callerAuth.uid,
        applicantName: userSnap.data()!.name,
        applicantAvatarUrl: userSnap.data()!.avatarUrl,
        message: message || "¡Me gustaría unirme a vuestro equipo!",
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const notificationRef = db.collection(`inbox/${founderId}/notifications`).doc();
    batch.set(notificationRef, {
        type: "team_application_received",
        from: callerAuth.uid,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { applicantName: userSnap.data()!.name }
    });

    await batch.commit();

    return { success: true, message: "Solicitud enviada con éxito." };
});

interface RespondToApplicationData {
    applicationId: string;
    accept: boolean;
}

export const respondToTeamApplication = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: RespondToApplicationData }) => {
    if (!callerAuth) throw new HttpsError("unauthenticated", "Debes iniciar sesión para responder.");
    const { applicationId, accept } = data;
    if (!applicationId) throw new HttpsError("invalid-argument", "Falta el ID de la solicitud.");
    
    const applicationRef = db.collection("teamApplications").doc(applicationId);

    return db.runTransaction(async (transaction) => {
        const appSnap = await transaction.get(applicationRef);
        if (!appSnap.exists) throw new HttpsError("not-found", "Solicitud no encontrada.");

        const appData = appSnap.data()!;
        if (appData.status !== 'pending') throw new HttpsError("failed-precondition", "Esta solicitud ya ha sido respondida.");
        
        const teamRef = db.collection("teams").doc(appData.teamId);
        const teamSnap = await transaction.get(teamRef);
        if(!teamSnap.exists) throw new HttpsError("not-found", "El equipo ya no existe.");
        
        const memberDoc = await transaction.get(teamRef.collection('members').doc(callerAuth.uid));
        const callerRole = memberDoc.data()?.role;

        if (callerRole !== 'founder' && callerRole !== 'coach') {
            throw new HttpsError("permission-denied", "Solo el staff del equipo puede responder a las solicitudes.");
        }

        transaction.update(applicationRef, { status: accept ? 'accepted' : 'rejected' });
        
        if (accept) {
            const teamData = teamSnap.data()!;
            if (teamData.memberIds && teamData.memberIds.length >= 8) {
              throw new HttpsError("failed-precondition", "El equipo está lleno y no puede aceptar nuevos miembros.");
            }

            const userRef = db.collection("users").doc(appData.applicantId);
            const userSnap = await transaction.get(userRef);
             if (!userSnap.exists) {
                throw new HttpsError("not-found", "Applicant's user profile could not be found.");
            }
            const userRole = userSnap.data()?.role;
            const teamRole = userRole === 'coach' ? 'coach' : 'member';

            const memberRef = teamRef.collection("members").doc(appData.applicantId);

            transaction.update(userRef, { teamId: appData.teamId });
            transaction.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayUnion(appData.applicantId) });
            transaction.set(memberRef, {
                role: teamRole,
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Notify user of acceptance
            const userNotifRef = db.collection(`inbox/${appData.applicantId}/notifications`).doc();
            transaction.set(userNotifRef, {
                type: "team_application_accepted",
                from: appData.teamId,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                extraData: { teamName: teamSnap.data()!.name, teamId: appData.teamId }
            });

        } else {
             // Notify user of rejection
            const userNotifRef = db.collection(`inbox/${appData.applicantId}/notifications`).doc();
            transaction.set(userNotifRef, {
                type: "team_application_rejected",
                from: appData.teamId,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                extraData: { teamName: teamSnap.data()!.name, teamId: appData.teamId }
            });
        }
        return { success: true, message: `Solicitud ${accept ? 'aceptada' : 'rechazada'}.` };
    });
});

    

    


