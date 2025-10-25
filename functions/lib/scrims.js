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
exports.reportScrimResult = exports.respondToScrimChallenge = exports.challengeScrim = exports.cancelScrim = exports.acceptScrim = exports.createScrim = void 0;
// src/functions/scrims.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const STAFF_ROLES = ['founder', 'coach', 'admin']; // Roles que pueden gestionar scrims
// --- FUNCIONES ---
exports.createScrim = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    var _a;
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { teamId, date, format, type, notes, rankMin, rankMax } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!teamId || !date || !format || !type) {
        throw new https_1.HttpsError("invalid-argument", "Missing required scrim details (teamId, date, format, type).");
    }
    try {
        const teamRef = db.collection("teams").doc(teamId);
        const memberRef = teamRef.collection("members").doc(uid);
        const [teamSnap, memberSnap] = await Promise.all([teamRef.get(), memberRef.get()]);
        if (!teamSnap.exists)
            throw new https_1.HttpsError("not-found", "Team not found.");
        if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
            throw new https_1.HttpsError("permission-denied", "You must be staff (founder/coach) to create a scrim for this team.");
        }
        const teamData = teamSnap.data();
        const scrimRef = db.collection("scrims").doc();
        await scrimRef.set({
            id: scrimRef.id,
            teamAId: teamId,
            teamAName: teamData.name,
            teamAAvatarUrl: teamData.avatarUrl,
            date: Timestamp.fromDate(new Date(date)),
            format,
            type,
            notes: notes || '',
            status: "pending", // Estado inicial: esperando rival
            createdAt: Timestamp.now(),
            // Guardamos Rango y País para facilitar filtros
            rankMin: rankMin || null,
            rankMax: rankMax || null,
            country: teamData.country || null,
            // Inicializar campos que se llenarán después
            teamBId: null,
            teamBName: null,
            teamBAvatarUrl: null,
            participantIds: [teamId], // Inicialmente solo el creador
            winnerId: null,
            loserId: null,
            reportedBy: null,
            reportedAt: null,
            challengerTeamId: null,
            challengerTeamName: null,
            challengerTeamAvatarUrl: null,
        });
        return { success: true, scrimId: scrimRef.id, message: "Scrim creada, esperando rival." };
    }
    catch (error) {
        console.error(`Error creating scrim for team ${teamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to create scrim.');
    }
});
exports.acceptScrim = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId, acceptingTeamId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId || !acceptingTeamId)
        throw new https_1.HttpsError("invalid-argument", "Missing scrim or team ID.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    const acceptingTeamRef = db.collection("teams").doc(acceptingTeamId);
    const memberRef = acceptingTeamRef.collection("members").doc(uid);
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            const [scrimSnap, teamSnap, memberSnap] = await Promise.all([
                transaction.get(scrimRef),
                transaction.get(acceptingTeamRef),
                transaction.get(memberRef),
            ]);
            if (!scrimSnap.exists)
                throw new https_1.HttpsError("not-found", "Scrim not found.");
            if (!teamSnap.exists)
                throw new https_1.HttpsError("not-found", "Your team could not be found.");
            if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
                throw new https_1.HttpsError("permission-denied", "You must be staff to accept a scrim for this team.");
            }
            const scrimData = scrimSnap.data();
            if (scrimData.status !== 'pending') {
                throw new https_1.HttpsError("failed-precondition", "This scrim is no longer available to accept directly.");
            }
            if (scrimData.teamAId === acceptingTeamId) {
                throw new https_1.HttpsError("invalid-argument", "You cannot accept your own scrim.");
            }
            const teamData = teamSnap.data();
            transaction.update(scrimRef, {
                teamBId: acceptingTeamId,
                status: "confirmed",
                teamBName: teamData.name,
                teamBAvatarUrl: teamData.avatarUrl,
                participantIds: [scrimData.teamAId, acceptingTeamId] // Actualiza array de participantes
            });
            // Sumar +1 a scrimsPlayed para ambos equipos al confirmar
            const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
            const teamBRefUpdate = db.collection("teams").doc(acceptingTeamId);
            transaction.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
            transaction.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
            // Aquí podrías crear un chat temporal o enviar notificaciones
        });
        return { success: true, message: "Scrim aceptada y confirmada." };
    }
    catch (error) {
        console.error(`Error accepting scrim ${scrimId} by team ${acceptingTeamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to accept scrim.');
    }
});
exports.cancelScrim = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    var _a, _b;
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId)
        throw new https_1.HttpsError("invalid-argument", "Scrim ID is required.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    try {
        const scrimSnap = await scrimRef.get();
        if (!scrimSnap.exists)
            throw new https_1.HttpsError("not-found", "Scrim not found.");
        const scrimData = scrimSnap.data();
        // Comprueba permisos (solo staff de equipos participantes puede cancelar)
        const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
        const teamASnap = await teamARef.get();
        const teamAStaff = teamASnap.exists && STAFF_ROLES.includes((_a = teamASnap.data()) === null || _a === void 0 ? void 0 : _a.role);
        let teamBStaff = false;
        // Solo comprueba permisos del equipo B si existe y la scrim no está ya cancelada/completada
        if (scrimData.teamBId && scrimData.status !== 'cancelled' && scrimData.status !== 'completed') {
            const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
            const teamBSnap = await teamBRef.get();
            teamBStaff = teamBSnap.exists && STAFF_ROLES.includes((_b = teamBSnap.data()) === null || _b === void 0 ? void 0 : _b.role);
        }
        if (!teamAStaff && !teamBStaff) {
            throw new https_1.HttpsError("permission-denied", "You are not authorized staff of either participating team to cancel this scrim.");
        }
        // No se puede cancelar si ya está completada
        if (scrimData.status === 'completed') {
            throw new https_1.HttpsError("failed-precondition", `Cannot cancel a scrim that is already completed.`);
        }
        // Si ya está cancelada, devuelve éxito silenciosamente
        if (scrimData.status === 'cancelled') {
            return { success: true, message: "Scrim already cancelled." };
        }
        // Si la scrim estaba confirmada y se cancela, restar estadísticas
        if (scrimData.status === 'confirmed' && scrimData.teamBId) {
            const batch = db.batch();
            const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
            const teamBRefUpdate = db.collection("teams").doc(scrimData.teamBId);
            // Resta 1 a scrimsPlayed solo si es > 0 para evitar negativos
            batch.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
            batch.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
            // Actualiza la scrim a 'cancelled'
            batch.update(scrimRef, { status: 'cancelled' });
            await batch.commit();
        }
        else {
            // Si estaba 'pending' o 'challenged', solo cambia el estado
            await scrimRef.update({ status: 'cancelled' });
        }
        return { success: true, message: "Scrim cancelada." };
    }
    catch (error) {
        console.error(`Error canceling scrim ${scrimId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to cancel scrim.');
    }
});
exports.challengeScrim = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId, challengingTeamId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !challengingTeamId)
        throw new https_1.HttpsError("invalid-argument", "Faltan IDs (scrimId, challengingTeamId).");
    const scrimRef = db.collection("scrims").doc(scrimId);
    const challengingTeamRef = db.collection("teams").doc(challengingTeamId);
    const memberRef = challengingTeamRef.collection("members").doc(uid); // Miembro del equipo desafiante
    try {
        await db.runTransaction(async (transaction) => {
            var _a, _b, _c;
            const [scrimSnap, teamSnap, memberSnap] = await Promise.all([
                transaction.get(scrimRef),
                transaction.get(challengingTeamRef),
                transaction.get(memberRef),
            ]);
            if (!scrimSnap.exists)
                throw new https_1.HttpsError("not-found", "Scrim no encontrada.");
            if (!teamSnap.exists)
                throw new https_1.HttpsError("not-found", "Tu equipo no se encontró.");
            if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
                throw new https_1.HttpsError("permission-denied", "Debes ser staff de tu equipo para desafiar.");
            }
            const scrimData = scrimSnap.data();
            if (scrimData.status !== 'pending') {
                throw new https_1.HttpsError("failed-precondition", "Esta scrim ya no está disponible o ya ha sido desafiada.");
            }
            if (scrimData.teamAId === challengingTeamId) {
                throw new https_1.HttpsError("invalid-argument", "No puedes desafiar tu propia scrim.");
            }
            transaction.update(scrimRef, {
                status: "challenged",
                challengerTeamId: challengingTeamId,
                challengerTeamName: (_b = teamSnap.data()) === null || _b === void 0 ? void 0 : _b.name,
                challengerTeamAvatarUrl: (_c = teamSnap.data()) === null || _c === void 0 ? void 0 : _c.avatarUrl,
            });
            // Aquí enviar notificación al staff del Equipo A
        });
        return { success: true, message: "Desafío enviado al equipo creador." };
    }
    catch (error) {
        console.error(`Error challenging scrim ${scrimId} by team ${challengingTeamId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to challenge scrim.');
    }
});
exports.respondToScrimChallenge = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid; // UID del miembro del Equipo A que responde
    const { scrimId, accept } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || typeof accept !== 'boolean')
        throw new https_1.HttpsError("invalid-argument", "Faltan datos (scrimId, accept).");
    const scrimRef = db.collection("scrims").doc(scrimId);
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            const scrimSnap = await transaction.get(scrimRef);
            if (!scrimSnap.exists)
                throw new https_1.HttpsError("not-found", "Scrim no encontrada.");
            const scrimData = scrimSnap.data();
            if (scrimData.status !== 'challenged' || !scrimData.challengerTeamId) {
                throw new https_1.HttpsError("failed-precondition", "Esta scrim no tiene un desafío pendiente.");
            }
            const memberRef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
            const memberSnap = await transaction.get(memberRef);
            if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
                throw new https_1.HttpsError("permission-denied", "Solo el staff del equipo creador puede responder.");
            }
            if (accept) {
                transaction.update(scrimRef, {
                    status: "confirmed",
                    teamBId: scrimData.challengerTeamId,
                    teamBName: scrimData.challengerTeamName,
                    teamBAvatarUrl: scrimData.challengerTeamAvatarUrl,
                    participantIds: [scrimData.teamAId, scrimData.challengerTeamId], // Actualiza participantes
                    // Limpia los campos del desafío
                    challengerTeamId: admin.firestore.FieldValue.delete(),
                    challengerTeamName: admin.firestore.FieldValue.delete(),
                    challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
                });
                // Sumar +1 a scrimsPlayed para ambos equipos al confirmar
                const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
                const teamBRefUpdate = db.collection("teams").doc(scrimData.challengerTeamId);
                transaction.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
                transaction.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
                // Notificar equipo B
            }
            else {
                transaction.update(scrimRef, {
                    status: "pending", // Vuelve a estar disponible para otros
                    challengerTeamId: admin.firestore.FieldValue.delete(),
                    challengerTeamName: admin.firestore.FieldValue.delete(),
                    challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
                });
                // Notificar equipo B
            }
        });
        return { success: true, message: `Desafío ${accept ? 'aceptado' : 'rechazado'}.` };
    }
    catch (error) {
        console.error(`Error responding to challenge for scrim ${scrimId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to respond to challenge.');
    }
});
exports.reportScrimResult = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId, winnerId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !winnerId)
        throw new https_1.HttpsError("invalid-argument", "Faltan IDs (scrimId, winnerId).");
    const scrimRef = db.collection("scrims").doc(scrimId);
    try {
        await db.runTransaction(async (transaction) => {
            var _a, _b, _c, _d, _e, _f;
            const scrimSnap = await transaction.get(scrimRef);
            if (!scrimSnap.exists)
                throw new https_1.HttpsError("not-found", "Scrim no encontrada.");
            const scrimData = scrimSnap.data();
            if (scrimData.status !== 'confirmed') {
                throw new https_1.HttpsError("failed-precondition", `No se puede reportar resultado de una scrim ${scrimData.status}.`);
            }
            if (!scrimData.teamBId) {
                throw new https_1.HttpsError("failed-precondition", `La scrim no tiene dos equipos confirmados.`);
            }
            // Comprueba permisos (staff de A o B)
            const memberARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
            const memberBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
            const [memberASnap, memberBSnap] = await Promise.all([
                transaction.get(memberARef),
                transaction.get(memberBRef)
            ]);
            const isStaffA = memberASnap.exists && STAFF_ROLES.includes((_a = memberASnap.data()) === null || _a === void 0 ? void 0 : _a.role);
            const isStaffB = memberBSnap.exists && STAFF_ROLES.includes((_b = memberBSnap.data()) === null || _b === void 0 ? void 0 : _b.role);
            if (!isStaffA && !isStaffB) {
                throw new https_1.HttpsError("permission-denied", "Debes ser staff de uno de los equipos participantes para reportar.");
            }
            if (winnerId !== scrimData.teamAId && winnerId !== scrimData.teamBId) {
                throw new https_1.HttpsError("invalid-argument", "El ganador debe ser uno de los equipos participantes.");
            }
            const loserId = (winnerId === scrimData.teamAId) ? scrimData.teamBId : scrimData.teamAId;
            // 1. Actualiza scrim
            transaction.update(scrimRef, {
                status: "completed",
                winnerId: winnerId,
                loserId: loserId,
                reportedBy: uid,
                reportedAt: Timestamp.now(),
            });
            // 2. Actualiza stats (solo 'scrimsWon' del ganador, played ya se sumó)
            const winnerTeamRef = db.collection("teams").doc(winnerId);
            const loserTeamRef = db.collection("teams").doc(loserId); // Necesario si actualizas winRate
            transaction.update(winnerTeamRef, {
                'stats.scrimsWon': admin.firestore.FieldValue.increment(1)
            });
            // Opcional: Recalcular y actualizar winRate para ambos equipos
            // Necesitarías leer las stats actuales en la transacción
            const winnerSnap = await transaction.get(winnerTeamRef);
            const loserSnap = await transaction.get(loserTeamRef);
            const winnerStats = (_d = (_c = winnerSnap.data()) === null || _c === void 0 ? void 0 : _c.stats) !== null && _d !== void 0 ? _d : { scrimsPlayed: 1, scrimsWon: 1 };
            const loserStats = (_f = (_e = loserSnap.data()) === null || _e === void 0 ? void 0 : _e.stats) !== null && _f !== void 0 ? _f : { scrimsPlayed: 1, scrimsWon: 0 };
            const newWinnerWR = (winnerStats.scrimsWon + 1) / winnerStats.scrimsPlayed;
            const newLoserWR = loserStats.scrimsWon / loserStats.scrimsPlayed;
            transaction.update(winnerTeamRef, { winRate: newWinnerWR });
            transaction.update(loserTeamRef, { winRate: newLoserWR });
        });
        return { success: true, message: "Resultado reportado correctamente." };
    }
    catch (error) {
        console.error(`Error reporting result for scrim ${scrimId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to report result.');
    }
});
//# sourceMappingURL=scrims.js.map