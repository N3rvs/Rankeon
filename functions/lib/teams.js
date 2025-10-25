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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTeamIGL = exports.kickTeamMember = exports.updateTeamMemberRole = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.updateMemberSkills = void 0;
// functions/src/teams.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const auth = admin.auth();
// --- FUNCIONES ---
exports.updateMemberSkills = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    var _a;
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId, skills } = data;
    if (!teamId || !memberId || !Array.isArray(skills)) {
        throw new https_1.HttpsError("invalid-argument", "Faltan datos (teamId, memberId, skills).");
    }
    if (skills.length > 2) {
        throw new https_1.HttpsError("invalid-argument", "Un jugador puede tener como máximo 2 roles.");
    }
    const teamRef = db.collection("teams").doc(teamId);
    try {
        // 1. Comprobar permisos
        const callerMemberDoc = await teamRef.collection("members").doc(requestAuth.uid).get();
        const callerRole = (_a = callerMemberDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        if (callerRole !== 'founder' && callerRole !== 'coach') {
            throw new https_1.HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar los roles.");
        }
        // 2. Actualizar el documento del usuario
        await db.collection('users').doc(memberId).update({ skills: skills });
        return { success: true, message: "Roles de jugador actualizados." };
    }
    catch (error) {
        console.error(`Error updating skills for member ${memberId} in team ${teamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error; // Re-lanza errores Https conocidos
        throw new https_1.HttpsError('internal', error.message || 'No se pudieron actualizar los roles del jugador.');
    }
});
exports.createTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
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
    if (claims.role === 'founder') {
        throw new https_1.HttpsError('failed-precondition', 'Ya eres fundador de otro equipo. No puedes crear más de uno.');
    }
    const userRef = db.collection("users").doc(uid);
    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'No se encontró tu perfil de usuario.');
        }
        const userData = userDoc.data();
        const teamRef = db.collection("teams").doc();
        const batch = db.batch();
        batch.set(teamRef, {
            id: teamRef.id,
            name,
            game,
            description: description || '',
            country: (userData === null || userData === void 0 ? void 0 : userData.country) || '',
            avatarUrl: `https://placehold.co/100x100.png?text=${name.slice(0, 2)}`,
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
        const userUpdateData = { teamId: teamRef.id };
        if (!isPrivilegedUser) {
            userUpdateData.role = 'founder';
        }
        batch.update(userRef, userUpdateData);
        if (!isPrivilegedUser) {
            await auth.setCustomUserClaims(uid, Object.assign(Object.assign({}, claims), { role: 'founder' }));
        }
        await batch.commit();
        return { success: true, teamId: teamRef.id, message: '¡Equipo creado con éxito!' };
    }
    catch (error) {
        console.error("Error creating team:", error);
        // Intenta revertir el claim si falla la creación del equipo
        if (!isPrivilegedUser && claims.role !== 'founder') { // Solo revierte si no era founder antes
            try {
                await auth.setCustomUserClaims(uid, Object.assign(Object.assign({}, claims), { role: 'player' })); // Revierte a 'player' o al rol anterior
            }
            catch (rollbackError) {
                console.error("CRITICAL: Failed to rollback claim on team creation failure:", rollbackError);
            }
        }
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Ocurrió un error inesperado al crear el equipo.');
    }
});
exports.updateTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    var _a, _b;
    if (!requestAuth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para editar el equipo.");
    }
    const uid = requestAuth.uid;
    const _c = data, { teamId } = _c, updateData = __rest(_c, ["teamId"]);
    if (!teamId || !updateData.name) {
        throw new https_1.HttpsError("invalid-argument", "Faltan datos del equipo (ID o nombre).");
    }
    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            throw new https_1.HttpsError("not-found", "El equipo no existe.");
        }
        // Usa requestAuth.token?.role para evitar error si token no existe
        if (((_a = teamDoc.data()) === null || _a === void 0 ? void 0 : _a.founder) !== uid && ((_b = requestAuth.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
            throw new https_1.HttpsError("permission-denied", "Solo el fundador o un administrador pueden editar este equipo.");
        }
        // Evita que se sobrescriban campos internos como stats o founder
        const allowedUpdates = Object.assign({}, updateData);
        delete allowedUpdates.stats;
        delete allowedUpdates.founder;
        delete allowedUpdates.memberIds;
        delete allowedUpdates.id;
        delete allowedUpdates.createdAt;
        await teamRef.update(allowedUpdates);
        return { success: true, message: "Equipo actualizado con éxito." };
    }
    catch (error) {
        console.error("Error updating team:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "No se pudo actualizar el equipo.");
    }
});
exports.deleteTeam = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
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
        throw new https_1.HttpsError("not-found", "Datos del equipo inválidos."); // Cambiado de 'not-found'
    const founderId = teamData.founder;
    const isCallerFounder = founderId === callerUid;
    const isCallerAdmin = callerClaims.role === 'admin';
    if (!isCallerFounder && !isCallerAdmin) {
        throw new https_1.HttpsError("permission-denied", "Solo el fundador del equipo o un administrador pueden eliminarlo.");
    }
    // Step 1: Revertir claim del fundador
    let claimReverted = false;
    try {
        const founderAuth = await auth.getUser(founderId);
        const founderClaims = founderAuth.customClaims || {};
        if (founderClaims.role === 'founder') {
            await auth.setCustomUserClaims(founderId, Object.assign(Object.assign({}, founderClaims), { role: "player" }));
            claimReverted = true;
        }
    }
    catch (error) {
        console.error(`CRITICAL: Failed to revert claim for founder ${founderId}...`, error);
        // No continuar si falla revertir el claim
        throw new https_1.HttpsError('internal', 'No se pudo actualizar el rol del fundador. El equipo no fue eliminado.');
    }
    // Step 2: Borrar datos de Firestore
    try {
        const batch = db.batch();
        const membersSnap = await teamRef.collection("members").get(); // Obtener miembros para iterar
        // Actualiza documentos de usuario de todos los miembros
        (teamData.memberIds || []).forEach((memberId) => {
            const userRef = db.collection("users").doc(memberId);
            const updateData = { teamId: admin.firestore.FieldValue.delete() };
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
    }
    catch (error) {
        console.error("Error al eliminar los documentos del equipo:", error);
        // Si revertir claim tuvo éxito pero falló el borrado, informa al usuario
        if (claimReverted) {
            return { success: false, message: "El rol del fundador fue actualizado, pero ocurrió un error al eliminar los datos del equipo." };
        }
        else {
            throw new https_1.HttpsError("internal", "Ocurrió un error al eliminar los datos del equipo.");
        }
    }
});
exports.updateTeamMemberRole = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    var _a;
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId, role } = data;
    if (!teamId || !memberId || !['coach', 'member'].includes(role)) { // Verifica roles válidos
        throw new https_1.HttpsError("invalid-argument", "Faltan datos o rol inválido.");
    }
    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists)
            throw new https_1.HttpsError("not-found", "El equipo no existe.");
        const teamData = teamDoc.data();
        if (!teamData)
            throw new https_1.HttpsError("internal", "Datos del equipo inválidos.");
        const callerMemberDoc = await teamRef.collection('members').doc(requestAuth.uid).get();
        const callerRole = (_a = callerMemberDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        if (teamData.founder !== requestAuth.uid && callerRole !== 'coach') {
            throw new https_1.HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar roles.");
        }
        if (teamData.founder === memberId) {
            throw new https_1.HttpsError("permission-denied", "No puedes cambiar el rol del fundador.");
        }
        // Verifica que el miembro exista antes de intentar actualizar
        const memberRefToUpdate = teamRef.collection('members').doc(memberId);
        const memberDoc = await memberRefToUpdate.get();
        if (!memberDoc.exists) {
            throw new https_1.HttpsError("not-found", "El miembro no pertenece a este equipo.");
        }
        await memberRefToUpdate.update({ role });
        return { success: true, message: "Rol del miembro actualizado." };
    }
    catch (error) {
        console.error(`Error updating role for member ${memberId} in team ${teamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'No se pudo actualizar el rol del miembro.');
    }
});
exports.kickTeamMember = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    var _a, _b;
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data;
    if (!teamId || !memberId)
        throw new https_1.HttpsError("invalid-argument", "Faltan datos (teamId, memberId).");
    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists)
            throw new https_1.HttpsError("not-found", "El equipo no existe.");
        const teamData = teamDoc.data();
        if (!teamData)
            throw new https_1.HttpsError("internal", "Datos del equipo inválidos.");
        const callerMemberDoc = await teamRef.collection("members").doc(requestAuth.uid).get();
        if (!callerMemberDoc.exists) {
            throw new https_1.HttpsError("permission-denied", "No eres miembro de este equipo.");
        }
        const callerRole = (_a = callerMemberDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        const memberToKickRef = teamRef.collection("members").doc(memberId);
        const memberToKickDoc = await memberToKickRef.get();
        if (!memberToKickDoc.exists) {
            return { success: true, message: "El miembro ya no estaba en el equipo." };
        }
        const memberToKickRole = (_b = memberToKickDoc.data()) === null || _b === void 0 ? void 0 : _b.role;
        if (memberId === teamData.founder) {
            throw new https_1.HttpsError("permission-denied", "El fundador no puede ser expulsado.");
        }
        if (callerRole === 'founder') { /* Puede expulsar a coach o member */ }
        else if (callerRole === 'coach') {
            if (memberToKickRole !== 'member') {
                throw new https_1.HttpsError("permission-denied", "Un coach solo puede expulsar a miembros ('member').");
            }
        }
        else {
            throw new https_1.HttpsError("permission-denied", "Solo el fundador o un coach pueden expulsar miembros.");
        }
        const batch = db.batch();
        batch.delete(memberToKickRef); // Borra de subcolección
        batch.update(teamRef, { memberIds: admin.firestore.FieldValue.arrayRemove(memberId) }); // Borra de array
        batch.update(db.collection('users').doc(memberId), { teamId: admin.firestore.FieldValue.delete() }); // Quita teamId del usuario
        await batch.commit();
        return { success: true, message: "Miembro expulsado del equipo." };
    }
    catch (error) {
        console.error(`Error kicking member ${memberId} from team ${teamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'No se pudo expulsar al miembro.');
    }
});
exports.setTeamIGL = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth: requestAuth, data }) => {
    var _a;
    if (!requestAuth)
        throw new https_1.HttpsError("unauthenticated", "Falta autenticación.");
    const { teamId, memberId } = data; // memberId puede ser null para quitar IGL
    if (!teamId)
        throw new https_1.HttpsError("invalid-argument", "Falta ID del equipo.");
    const teamRef = db.collection("teams").doc(teamId);
    try {
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists)
            throw new https_1.HttpsError("not-found", "El equipo no existe.");
        const callerMemberRef = teamRef.collection("members").doc(requestAuth.uid);
        const callerMemberSnap = await callerMemberRef.get();
        if (!callerMemberSnap.exists) {
            throw new https_1.HttpsError("permission-denied", "No eres miembro de este equipo.");
        }
        const callerRole = (_a = callerMemberSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
        if (callerRole !== 'founder' && callerRole !== 'coach') {
            throw new https_1.HttpsError("permission-denied", "Solo el fundador o un coach puede cambiar el rol de IGL.");
        }
        // Si se va a asignar un nuevo IGL, verifica que sea miembro
        if (memberId) {
            const newIglRef = teamRef.collection("members").doc(memberId);
            const newIglSnap = await newIglRef.get();
            if (!newIglSnap.exists) {
                throw new https_1.HttpsError("not-found", "El miembro seleccionado no pertenece al equipo.");
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
            return { success: true, message: "Rol de IGL actualizado." };
        });
    }
    catch (error) {
        console.error(`Error setting IGL for team ${teamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'No se pudo actualizar el rol de IGL.');
    }
});
//# sourceMappingURL=teams.js.map