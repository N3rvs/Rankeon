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
exports.createScrim = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a;
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { teamId, date, format, type, notes, rankMin, rankMax } = data; // Añadidos rankMin/Max
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!teamId || !date || !format || !type) {
        throw new https_1.HttpsError("invalid-argument", "Missing required scrim details.");
    }
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid);
    const [teamSnap, memberSnap] = await Promise.all([teamRef.get(), memberRef.get()]);
    if (!teamSnap.exists)
        throw new https_1.HttpsError("not-found", "Team not found.");
    if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
        throw new https_1.HttpsError("permission-denied", "You must be staff to create a scrim for this team.");
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
        // Guardamos Rango y País para facilitar filtros en el frontend
        rankMin: rankMin || null,
        rankMax: rankMax || null,
        country: teamData.country || null, // País del equipo A
    });
    return { success: true, scrimId: scrimRef.id, message: "Scrim creada, esperando rival." };
});
// Mantenemos acceptScrim por si se usa, pero también añade participantIds
exports.acceptScrim = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId, acceptingTeamId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!scrimId || !acceptingTeamId)
        throw new https_1.HttpsError("invalid-argument", "Missing scrim or team ID.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    const acceptingTeamRef = db.collection("teams").doc(acceptingTeamId);
    const memberRef = acceptingTeamRef.collection("members").doc(uid);
    return db.runTransaction(async (transaction) => {
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
            throw new https_1.HttpsError("failed-precondition", "This scrim is no longer available.");
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
            // *** AÑADIDO PARA MEJORA DE CONSULTA ***
            participantIds: [scrimData.teamAId, acceptingTeamId]
        });
        // Aquí podrías crear un chat temporal o enviar notificaciones
    });
    // Devuelve un mensaje genérico ya que la transacción se encarga de errores
    return { success: true, message: "Scrim aceptada." };
});
exports.cancelScrim = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a, _b;
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    const scrimSnap = await scrimRef.get();
    if (!scrimSnap.exists)
        throw new https_1.HttpsError("not-found", "Scrim not found.");
    const scrimData = scrimSnap.data();
    // Comprueba el ROL, no solo si existe
    const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
    const teamASnap = await teamARef.get();
    const teamAStaff = teamASnap.exists && STAFF_ROLES.includes((_a = teamASnap.data()) === null || _a === void 0 ? void 0 : _a.role);
    let teamBStaff = false;
    // Solo comprueba el equipo B si la scrim fue confirmada o completada
    if (scrimData.teamBId && (scrimData.status === 'confirmed' || scrimData.status === 'completed')) {
        const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        const teamBSnap = await teamBRef.get();
        teamBStaff = teamBSnap.exists && STAFF_ROLES.includes((_b = teamBSnap.data()) === null || _b === void 0 ? void 0 : _b.role);
    }
    if (!teamAStaff && !teamBStaff) {
        throw new https_1.HttpsError("permission-denied", "You are not authorized to cancel this scrim.");
    }
    if (scrimData.status === 'cancelled' || scrimData.status === 'completed') {
        throw new https_1.HttpsError("failed-precondition", `Cannot cancel a scrim that is already ${scrimData.status}.`);
    }
    // Si la scrim estaba confirmada y se cancela, restar estadísticas
    if (scrimData.status === 'confirmed' && scrimData.teamBId) {
        const batch = db.batch();
        const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
        const teamBRefUpdate = db.collection("teams").doc(scrimData.teamBId);
        batch.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
        batch.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(-1) });
        // También actualiza la scrim a 'cancelled'
        batch.update(scrimRef, { status: 'cancelled' });
        await batch.commit();
    }
    else {
        // Si estaba 'pending' o 'challenged', solo cambia el estado
        await scrimRef.update({ status: 'cancelled' });
    }
    return { success: true, message: "Scrim cancelada." };
});
exports.challengeScrim = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId, challengingTeamId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !challengingTeamId)
        throw new https_1.HttpsError("invalid-argument", "Faltan IDs.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    const challengingTeamRef = db.collection("teams").doc(challengingTeamId);
    const memberRef = challengingTeamRef.collection("members").doc(uid); // Miembro del equipo desafiante
    return db.runTransaction(async (transaction) => {
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
        if (scrimData.status !== 'pending') { // Cambiado de 'open' a 'pending'
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
        // Aquí notificar al Equipo A
    });
    return { success: true, message: "Desafío enviado al equipo A." };
});
exports.respondToScrimChallenge = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid; // UID del miembro del Equipo A que responde
    const { scrimId, accept } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || typeof accept !== 'boolean')
        throw new https_1.HttpsError("invalid-argument", "Faltan datos.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    return db.runTransaction(async (transaction) => {
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
                // *** AÑADIDO PARA MEJORA DE CONSULTA ***
                participantIds: [scrimData.teamAId, scrimData.challengerTeamId],
                // Limpia los campos del desafío
                challengerTeamId: admin.firestore.FieldValue.delete(),
                challengerTeamName: admin.firestore.FieldValue.delete(),
                challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
            });
            // Aquí notificar al Equipo B que fue aceptado y sumar stats.scrimsPlayed a ambos
            const teamARefUpdate = db.collection("teams").doc(scrimData.teamAId);
            const teamBRefUpdate = db.collection("teams").doc(scrimData.challengerTeamId);
            transaction.update(teamARefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
            transaction.update(teamBRefUpdate, { 'stats.scrimsPlayed': admin.firestore.FieldValue.increment(1) });
        }
        else {
            transaction.update(scrimRef, {
                status: "pending", // Vuelve a estar disponible
                // Limpia los campos del desafío
                challengerTeamId: admin.firestore.FieldValue.delete(),
                challengerTeamName: admin.firestore.FieldValue.delete(),
                challengerTeamAvatarUrl: admin.firestore.FieldValue.delete(),
            });
            // Aquí notificar al Equipo B que fue rechazado
        }
    });
    return { success: true, message: `Desafío ${accept ? 'aceptado' : 'rechazado'}.` };
});
exports.reportScrimResult = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId, winnerId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    if (!scrimId || !winnerId)
        throw new https_1.HttpsError("invalid-argument", "Faltan IDs.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    return db.runTransaction(async (transaction) => {
        var _a, _b;
        const scrimSnap = await transaction.get(scrimRef);
        if (!scrimSnap.exists)
            throw new https_1.HttpsError("not-found", "Scrim no encontrada.");
        const scrimData = scrimSnap.data();
        if (scrimData.status !== 'confirmed') {
            throw new https_1.HttpsError("failed-precondition", `No se puede reportar resultado de una scrim ${scrimData.status}.`);
        }
        if (!scrimData.teamBId) { // Asegura que el equipo B exista
            throw new https_1.HttpsError("failed-precondition", `La scrim no tiene dos equipos confirmados.`);
        }
        const memberARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
        const memberBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        const [memberASnap, memberBSnap] = await Promise.all([
            transaction.get(memberARef),
            transaction.get(memberBRef)
        ]);
        const isStaffA = memberASnap.exists && STAFF_ROLES.includes((_a = memberASnap.data()) === null || _a === void 0 ? void 0 : _a.role);
        const isStaffB = memberBSnap.exists && STAFF_ROLES.includes((_b = memberBSnap.data()) === null || _b === void 0 ? void 0 : _b.role);
        if (!isStaffA && !isStaffB) {
            throw new https_1.HttpsError("permission-denied", "Debes ser staff de uno de los equipos participantes.");
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
        // 2. Actualiza stats (scrimsPlayed ya se sumó al confirmar)
        const winnerTeamRef = db.collection("teams").doc(winnerId);
        const loserTeamRef = db.collection("teams").doc(loserId); // No necesitamos leer/actualizar al perdedor aquí
        transaction.update(winnerTeamRef, {
            'stats.scrimsWon': admin.firestore.FieldValue.increment(1)
        });
        transaction.update(loserTeamRef, { /* recalcular winRate */});
    });
    return { success: true, message: "Resultado reportado correctamente." };
});
//# sourceMappingURL=scrims.js.map