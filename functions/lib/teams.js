"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTeamIGL = exports.kickTeamMember = exports.updateTeamMemberRole = exports.deleteTeam = exports.updateTeam = exports.createTeam = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const auth = admin.auth();
exports.createTeam = (0, https_1.onCall)(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para crear un equipo.");
    }
    const uid = requestAuth.uid;
    const claims = requestAuth.token || {};
    const { name, game, description } = data;
    if (!name || !game) {
        throw new https_1.HttpsError("invalid-argument", "El nombre del equipo y el juego son obligatorios.");
    }
    const isPrivilegedUser = claims.role === 'admin' || claims.role === 'moderator';
    // Check precondition using the auth token as the single source of truth.
    if (claims.role === 'founder') {
        throw new https_1.HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
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
            avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0, 2)}`,
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
        const userUpdateData = { teamId: teamRef.id };
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
    }
    catch (error) {
        console.error("Error creating team:", error);
        // If team creation fails, try to roll back the claim change.
        if (!isPrivilegedUser) {
            await auth.setCustomUserClaims(uid, { ...claims, role: 'player' });
        }
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Ocurrió un error inesperado al crear el equipo.');
    }
});
exports.updateTeam = (0, https_1.onCall)(async ({ auth: requestAuth, data }) => {
    if (!requestAuth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para editar el equipo.");
    }
    const uid = requestAuth.uid;
    const { teamId, ...updateData } = data;
    if (!teamId || !updateData.name) {
        throw new https_1.HttpsError("invalid-argument", "Faltan datos del equipo (ID o nombre).");
    }
    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            throw new https_1.HttpsError("not-found", "El equipo no existe.");
        }
        if (teamDoc.data()?.founder !== uid && requestAuth.token.role !== 'admin') {
            throw new https_1.HttpsError("permission-denied", "Solo el fundador o un administrador pueden editar este equipo.");
        }
        await teamRef.update(updateData);
        return { success: true, message: "Equipo actualizado con éxito." };
    }
    catch (error) {
        console.error("Error updating team:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "No se pudo actualizar el equipo.");
    }
});
exports.deleteTeam = (0, https_1.onCall)(async ({ auth: requestAuth, data }) => {
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const callerUid = requestAuth.uid;
    const callerClaims = requestAuth.token || {};
    const { teamId } = data;
    if (!teamId)
        throw new https_1.HttpsError("invalid-argument", "Falta ID del equipo.");
    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists)
        return { success: true, message: "El equipo ya no existía." };
    const teamData = teamDoc.data();
    if (!teamData)
        throw new https_1.HttpsError("not-found", "El equipo no existe.");
    const founderId = teamData.founder;
    const isCallerFounder = founderId === callerUid;
    const isCallerAdmin = callerClaims.role === 'admin';
    if (!isCallerFounder && !isCallerAdmin) {
        throw new https_1.HttpsError("permission-denied", "Solo el fundador del equipo o un administrador pueden eliminarlo.");
    }
    // Step 1: Revert founder's custom claim in Firebase Auth. This prevents "ghost" roles.
    try {
        const founderAuth = await auth.getUser(founderId);
        const founderClaims = founderAuth.customClaims || {};
        if (founderClaims.role === 'founder') {
            await auth.setCustomUserClaims(founderId, { ...founderClaims, role: "player" });
        }
    }
    catch (error) {
        console.error(`CRITICAL: Failed to revert claim for founder ${founderId} during team deletion.`, error);
        throw new https_1.HttpsError('internal', 'No se pudo actualizar el rol del fundador. El equipo no fue eliminado. Por favor, contacta a soporte.');
    }
    // Step 2: Delete team documents and update all members' user docs in Firestore.
    try {
        const batch = db.batch();
        const membersSnap = await teamRef.collection("members").get();
        // Update all members to remove their teamId and revert founder's Firestore role
        (teamData.memberIds || []).forEach((memberId) => {
            const userRef = db.collection("users").doc(memberId);
            const updateData = {
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
    }
    catch (error) {
        console.error("Error al eliminar los documentos del equipo:", error);
        throw new https_1.HttpsError("internal", "El rol del fundador fue actualizado, pero ocurrió un error al eliminar los datos del equipo. Por favor, contacta a soporte.");
    }
});
exports.updateTeamMemberRole = (0, https_1.onCall)(async ({ auth: requestAuth, data }) => {
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId, role } = data;
    if (!teamId || !memberId || !role)
        throw new https_1.HttpsError("invalid-argument", "Faltan datos.");
    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists)
        throw new https_1.HttpsError("not-found", "El equipo no existe.");
    const teamData = teamDoc.data();
    const callerRoleDoc = await teamRef.collection('members').doc(requestAuth.uid).get();
    const callerRole = callerRoleDoc.data()?.role;
    if (teamData?.founder !== requestAuth.uid && callerRole !== 'coach') {
        throw new https_1.HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar roles.");
    }
    if (teamData?.founder === memberId) {
        throw new https_1.HttpsError("permission-denied", "No puedes cambiar el rol del fundador.");
    }
    await teamRef.collection('members').doc(memberId).update({ role });
    return { success: true, message: "Rol del miembro actualizado." };
});
exports.kickTeamMember = (0, https_1.onCall)(async ({ auth: requestAuth, data }) => {
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data;
    if (!teamId || !memberId)
        throw new https_1.HttpsError("invalid-argument", "Faltan datos.");
    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists)
        throw new https_1.HttpsError("not-found", "El equipo no existe.");
    // Check permissions
    const callerMemberDoc = await teamRef.collection("members").doc(requestAuth.uid).get();
    if (!callerMemberDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "No eres miembro de este equipo.");
    }
    const callerRole = callerMemberDoc.data()?.role;
    const memberToKickDoc = await teamRef.collection("members").doc(memberId).get();
    if (!memberToKickDoc.exists) {
        // The member is already not in the team. Succeed silently.
        return { success: true, message: "El miembro ya no estaba en el equipo." };
    }
    const memberToKickRole = memberToKickDoc.data()?.role;
    if (memberId === teamDoc.data()?.founder) {
        throw new https_1.HttpsError("permission-denied", "El fundador no puede ser expulsado.");
    }
    if (callerRole === 'founder') {
        // Founder can kick anyone (except themselves, checked above).
    }
    else if (callerRole === 'coach') {
        // Coach can only kick members.
        if (memberToKickRole !== 'member') {
            throw new https_1.HttpsError("permission-denied", "Un entrenador solo puede expulsar a los miembros.");
        }
    }
    else {
        throw new https_1.HttpsError("permission-denied", "Solo el fundador o un entrenador pueden expulsar miembros.");
    }
    const batch = db.batch();
    batch.delete(teamRef.collection('members').doc(memberId));
    batch.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayRemove(memberId) });
    batch.update(db.collection('users').doc(memberId), { teamId: admin.firestore.FieldValue.delete() });
    await batch.commit();
    return { success: true, message: "Miembro expulsado del equipo." };
});
exports.setTeamIGL = (0, https_1.onCall)(async ({ auth: requestAuth, data }) => {
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data;
    if (!teamId)
        throw new https_1.HttpsError("invalid-argument", "Falta ID del equipo.");
    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists)
        throw new https_1.HttpsError("not-found", "El equipo no existe.");
    // Permission check: Caller must be founder or coach.
    const callerMemberRef = teamRef.collection("members").doc(requestAuth.uid);
    const callerMemberSnap = await callerMemberRef.get();
    if (!callerMemberSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "No eres miembro de este equipo.");
    }
    const callerRole = callerMemberSnap.data()?.role;
    if (callerRole !== 'founder' && callerRole !== 'coach') {
        throw new https_1.HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar el rol de IGL.");
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
        return { success: true, message: "Rol de IGL actualizado." };
    });
});
//# sourceMappingURL=teams.js.map