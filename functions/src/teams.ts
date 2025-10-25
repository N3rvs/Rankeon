// functions/src/teams.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

// --- INTERFACES ---
interface CreateTeamData {
  name: string;
  game: string;
  description?: string;
}
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
  // Añade rankMin/Max si los editas aquí
  rankMin?: string;
  rankMax?: string;
}
interface DeleteTeamData {
    teamId: string;
}
interface MemberRoleData {
    teamId: string;
    memberId: string;
    role: 'coach' | 'member';
}
interface KickMemberData {
    teamId: string;
    memberId: string;
}
interface IGLData {
    teamId: string;
    memberId: string | null;
}
interface UpdateSkillsData {
    teamId: string;
    memberId: string;
    skills: string[];
}

// --- FUNCIONES ---

export const updateMemberSkills = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");

    const { teamId, memberId, skills } = data as UpdateSkillsData;
    if (!teamId || !memberId || !Array.isArray(skills)) {
        throw new HttpsError("invalid-argument", "Faltan datos (teamId, memberId, skills).");
    }
    if (skills.length > 2) {
        throw new HttpsError("invalid-argument", "Un jugador puede tener como máximo 2 roles.");
    }

    const teamRef = db.collection("teams").doc(teamId);

    try {
        // 1. Comprobar permisos
        const callerMemberDoc = await teamRef.collection("members").doc(requestAuth.uid).get();
        const callerRole = callerMemberDoc.data()?.role;
        if (callerRole !== 'founder' && callerRole !== 'coach') {
            throw new HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar los roles.");
        }

        // 2. Actualizar el documento del usuario
        await db.collection('users').doc(memberId).update({ skills: skills });

        return { success: true, message: "Roles de jugador actualizados." };
    } catch (error: any) {
        console.error(`Error updating skills for member ${memberId} in team ${teamId}:`, error);
        if (error instanceof HttpsError) throw error; // Re-lanza errores Https conocidos
        throw new HttpsError('internal', error.message || 'No se pudieron actualizar los roles del jugador.');
    }
});

export const createTeam = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
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

    if (claims.role === 'founder') {
        throw new HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
    }

    const userRef = db.collection("users").doc(uid);

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
             throw new HttpsError('not-found', 'No se encontró tu perfil de usuario.');
        }
        const userData = userDoc.data();

        const teamRef = db.collection("teams").doc();
        const batch = db.batch();

        batch.set(teamRef, {
            id: teamRef.id,
            name,
            game,
            description: description || '',
            country: userData?.country || '',
            avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0,2)}`,
            bannerUrl: 'https://placehold.co/1600x300.png', // Placeholder más panorámico
            founder: uid,
            memberIds: [uid], // Array inicial con el fundador
            recruitingRoles: [],
            lookingForPlayers: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            videoUrl: '',
            discordUrl: '',
            twitchUrl: '',
            twitterUrl: '',
            // Inicializa stats si planeas usarlas
            stats: { scrimsPlayed: 0, scrimsWon: 0 },
            winRate: 0, // Inicializa winRate
        });

        const memberRef = teamRef.collection("members").doc(uid);
        batch.set(memberRef, {
            role: "founder",
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const userUpdateData: { role?: string; teamId: string } = { teamId: teamRef.id };
        if (!isPrivilegedUser) {
            userUpdateData.role = 'founder';
        }
        batch.update(userRef, userUpdateData);

        if (!isPrivilegedUser) {
            await auth.setCustomUserClaims(uid, { ...claims, role: 'founder' });
        }

        await batch.commit();

        return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };

    } catch (error: any) {
        console.error("Error creating team:", error);
        // Intenta revertir el claim si falla la creación del equipo
        if (!isPrivilegedUser && claims.role !== 'founder') { // Solo revierte si no era founder antes
           try {
               await auth.setCustomUserClaims(uid, { ...claims, role: 'player' }); // Revierte a 'player' o al rol anterior
           } catch (rollbackError) {
               console.error("CRITICAL: Failed to rollback claim on team creation failure:", rollbackError);
           }
        }
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocurrió un error inesperado al crear el equipo.');
    }
});

export const updateTeam = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
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
        // Usa requestAuth.token?.role para evitar error si token no existe
        if (teamDoc.data()?.founder !== uid && requestAuth.token?.role !== 'admin') {
            throw new HttpsError("permission-denied", "Solo el fundador o un administrador pueden editar este equipo.");
        }

        // Evita que se sobrescriban campos internos como stats o founder
        const allowedUpdates = { ...updateData };
        delete (allowedUpdates as any).stats;
        delete (allowedUpdates as any).founder;
        delete (allowedUpdates as any).memberIds;
        delete (allowedUpdates as any).id;
        delete (allowedUpdates as any).createdAt;

        await teamRef.update(allowedUpdates);

        return { success: true, message: "Equipo actualizado con éxito." };
    } catch (error: any) {
         console.error("Error updating team:", error);
         if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "No se pudo actualizar el equipo.");
    }
});

export const deleteTeam = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
     if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");

     const callerUid = requestAuth.uid;
     const callerClaims = requestAuth.token || {};
     const { teamId } = data as DeleteTeamData;
     if (!teamId) throw new HttpsError("invalid-argument", "Falta ID del equipo.");

     const teamRef = db.collection("teams").doc(teamId);

     const teamDoc = await teamRef.get();
     if (!teamDoc.exists) return { success: true, message: "El equipo ya no existía." };

     const teamData = teamDoc.data();
     if (!teamData) throw new HttpsError("not-found", "Datos del equipo inválidos."); // Cambiado de 'not-found'

     const founderId = teamData.founder;
     const isCallerFounder = founderId === callerUid;
     const isCallerAdmin = callerClaims.role === 'admin';

     if (!isCallerFounder && !isCallerAdmin) {
       throw new HttpsError("permission-denied", "Solo el fundador del equipo o un administrador pueden eliminarlo.");
     }

     // Step 1: Revertir claim del fundador
     let claimReverted = false;
     try {
         const founderAuth = await auth.getUser(founderId);
         const founderClaims = founderAuth.customClaims || {};
         if (founderClaims.role === 'founder') {
            await auth.setCustomUserClaims(founderId, { ...founderClaims, role: "player" });
            claimReverted = true;
         }
     } catch (error) {
         console.error(`CRITICAL: Failed to revert claim for founder ${founderId}...`, error);
         // No continuar si falla revertir el claim
         throw new HttpsError('internal', 'No se pudo actualizar el rol del fundador. El equipo no fue eliminado.');
     }

     // Step 2: Borrar datos de Firestore
     try {
        const batch = db.batch();
        const membersSnap = await teamRef.collection("members").get(); // Obtener miembros para iterar

        // Actualiza documentos de usuario de todos los miembros
        (teamData.memberIds || []).forEach((memberId: string) => {
            const userRef = db.collection("users").doc(memberId);
            const updateData: any = { teamId: admin.firestore.FieldValue.delete() };
            // Si es el fundador, también revierte su rol en Firestore
            if (memberId === founderId) {
                updateData.role = "player";
            }
            batch.update(userRef, updateData);
        });

        // Borra documentos de la subcolección 'members'
        membersSnap.forEach(doc => batch.delete(doc.ref));

        // Borra el documento principal del equipo
        batch.delete(teamRef);

        await batch.commit();

        return { success: true, message: "Equipo eliminado con éxito." };
     } catch (error: any) {
         console.error("Error al eliminar los documentos del equipo:", error);
         // Si revertir claim tuvo éxito pero falló el borrado, informa al usuario
         if (claimReverted) {
             return { success: false, message: "El rol del fundador fue actualizado, pero ocurrió un error al eliminar los datos del equipo." };
         } else {
             throw new HttpsError("internal", "Ocurrió un error al eliminar los datos del equipo.");
         }
     }
});

export const updateTeamMemberRole = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
     if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
     const { teamId, memberId, role } = data as MemberRoleData;
     if (!teamId || !memberId || !['coach', 'member'].includes(role)) { // Verifica roles válidos
         throw new HttpsError("invalid-argument", "Faltan datos o rol inválido.");
     }

     const teamRef = db.collection("teams").doc(teamId);
     try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");
        const teamData = teamDoc.data();
        if(!teamData) throw new HttpsError("internal", "Datos del equipo inválidos.");

        const callerMemberDoc = await teamRef.collection('members').doc(requestAuth.uid).get();
        const callerRole = callerMemberDoc.data()?.role;

        if (teamData.founder !== requestAuth.uid && callerRole !== 'coach') {
            throw new HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar roles.");
        }
        if (teamData.founder === memberId) {
            throw new HttpsError("permission-denied", "No puedes cambiar el rol del fundador.");
        }

        // Verifica que el miembro exista antes de intentar actualizar
        const memberRefToUpdate = teamRef.collection('members').doc(memberId);
        const memberDoc = await memberRefToUpdate.get();
        if (!memberDoc.exists) {
            throw new HttpsError("not-found", "El miembro no pertenece a este equipo.");
        }

        await memberRefToUpdate.update({ role });
        return { success: true, message: "Rol del miembro actualizado." };
     } catch (error: any) {
        console.error(`Error updating role for member ${memberId} in team ${teamId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'No se pudo actualizar el rol del miembro.');
     }
});

export const kickTeamMember = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data as KickMemberData;
    if (!teamId || !memberId) throw new HttpsError("invalid-argument", "Faltan datos (teamId, memberId).");

    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");
        const teamData = teamDoc.data();
        if(!teamData) throw new HttpsError("internal", "Datos del equipo inválidos.");

        const callerMemberDoc = await teamRef.collection("members").doc(requestAuth.uid).get();
        if (!callerMemberDoc.exists) {
            throw new HttpsError("permission-denied", "No eres miembro de este equipo.");
        }
        const callerRole = callerMemberDoc.data()?.role;

        const memberToKickRef = teamRef.collection("members").doc(memberId);
        const memberToKickDoc = await memberToKickRef.get();
        if (!memberToKickDoc.exists) {
            return { success: true, message: "El miembro ya no estaba en el equipo." };
        }
        const memberToKickRole = memberToKickDoc.data()?.role;

        if (memberId === teamData.founder) {
            throw new HttpsError("permission-denied", "El fundador no puede ser expulsado.");
        }
        if (callerRole === 'founder') { /* Puede expulsar a coach o member */ }
        else if (callerRole === 'coach') {
            if (memberToKickRole !== 'member') {
                throw new HttpsError("permission-denied", "Un coach solo puede expulsar a miembros ('member').");
            }
        } else {
            throw new HttpsError("permission-denied", "Solo el fundador o un coach pueden expulsar miembros.");
        }

        const batch = db.batch();
        batch.delete(memberToKickRef); // Borra de subcolección
        batch.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayRemove(memberId) }); // Borra de array
        batch.update(db.collection('users').doc(memberId), { teamId: admin.firestore.FieldValue.delete() }); // Quita teamId del usuario

        await batch.commit();
        return { success: true, message: "Miembro expulsado del equipo." };
    } catch (error: any) {
        console.error(`Error kicking member ${memberId} from team ${teamId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'No se pudo expulsar al miembro.');
    }
});

export const setTeamIGL = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    if (!requestAuth) throw new HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data as IGLData; // memberId puede ser null para quitar IGL
    if (!teamId) throw new HttpsError("invalid-argument", "Falta ID del equipo.");

    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) throw new HttpsError("not-found", "El equipo no existe.");

        const callerMemberRef = teamRef.collection("members").doc(requestAuth.uid);
        const callerMemberSnap = await callerMemberRef.get();
        if (!callerMemberSnap.exists) {
            throw new HttpsError("permission-denied", "No eres miembro de este equipo.");
        }
        const callerRole = callerMemberSnap.data()?.role;
        if (callerRole !== 'founder' && callerRole !== 'coach') {
            throw new HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar el rol de IGL.");
        }

        // Si se va a asignar un nuevo IGL, verifica que sea miembro
        if (memberId) {
            const newIglRef = teamRef.collection("members").doc(memberId);
            const newIglSnap = await newIglRef.get();
            if (!newIglSnap.exists) {
                throw new HttpsError("not-found", "El miembro seleccionado no pertenece al equipo.");
            }
        }

        return db.runTransaction(async (transaction) => {
            const membersRef = teamRef.collection("members");
            // Obtener solo el IGL actual (si existe) para optimizar
            const currentIglQuery = membersRef.where('isIGL', '==', true).limit(1);
            const currentIglSnap = await transaction.get(currentIglQuery);

            // 1. Quitar IGL anterior
            if (!currentIglSnap.empty) {
                const oldIglRef = currentIglSnap.docs[0].ref;
                // Solo quita si el nuevo IGL no es el mismo que el anterior
                if (oldIglRef.id !== memberId) {
                    transaction.update(oldIglRef, { isIGL: admin.firestore.FieldValue.delete() });
                }
            }

            // 2. Asignar nuevo IGL (si se proporcionó uno y no era ya el IGL)
            if (memberId && (currentIglSnap.empty || currentIglSnap.docs[0].id !== memberId)) {
                const newIglRef = membersRef.doc(memberId);
                transaction.update(newIglRef, { isIGL: true });
            }

            return { success: true, message: "Rol de IGL actualizado."};
        });
    } catch (error: any) {
        console.error(`Error setting IGL for team ${teamId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'No se pudo actualizar el rol de IGL.');
    }
});