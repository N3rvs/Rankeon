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
exports.cancelScrim = exports.acceptScrim = exports.createScrim = void 0;
// src/functions/scrims.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const STAFF_ROLES = ['founder', 'coach', 'admin'];
exports.createScrim = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a;
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { teamId, date, format, type, notes } = data;
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
<<<<<<< HEAD
    if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) { // <--- Correcto
=======
    if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
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
        status: "pending",
        createdAt: Timestamp.now(),
    });
    return { success: true, scrimId: scrimRef.id };
});
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
<<<<<<< HEAD
        if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) { // <--- Correcto
=======
        if (!memberSnap.exists || !STAFF_ROLES.includes((_a = memberSnap.data()) === null || _a === void 0 ? void 0 : _a.role)) {
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
            throw new https_1.HttpsError("permission-denied", "You must be staff to accept a scrim for this team.");
        }
        const scrimData = scrimSnap.data();
        if (scrimData.status !== 'pending') {
            throw new https_1.HttpsError("failed-precondition", "This scrim is no longer available.");
        }
        if (scrimData.teamAId === acceptingTeamId) {
            throw new https_1.HttpsError("invalid-argument", "You cannot accept your own scrim.");
        }
<<<<<<< HEAD
        // *** INICIO DE LA CORRECCIÓN #1 ***
        // Guardamos los datos del equipo B (teamSnap) al aceptar
        const teamData = teamSnap.data();
        transaction.update(scrimRef, {
            teamBId: acceptingTeamId,
            status: "confirmed",
            teamBName: teamData.name, // <-- AÑADIDO
            teamBAvatarUrl: teamData.avatarUrl // <-- AÑADIDO
        });
        // *** FIN DE LA CORRECCIÓN #1 ***
=======
        transaction.update(scrimRef, {
            teamBId: acceptingTeamId,
            status: "confirmed",
        });
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
        // Here you would create the temporary chat
    });
});
exports.cancelScrim = (0, https_1.onCall)(async ({ auth, data }) => {
<<<<<<< HEAD
    var _a, _b;
=======
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { scrimId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const scrimRef = db.collection("scrims").doc(scrimId);
    const scrimSnap = await scrimRef.get();
    if (!scrimSnap.exists)
        throw new https_1.HttpsError("not-found", "Scrim not found.");
    const scrimData = scrimSnap.data();
<<<<<<< HEAD
    // *** INICIO DE LA CORRECCIÓN #2 ***
    // Comprueba el ROL, no solo si existe
    const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
    const teamASnap = await teamARef.get();
    const teamAStaff = teamASnap.exists && STAFF_ROLES.includes((_a = teamASnap.data()) === null || _a === void 0 ? void 0 : _a.role);
    let teamBStaff = false;
    if (scrimData.teamBId) {
        const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        const teamBSnap = await teamBRef.get();
        teamBStaff = teamBSnap.exists && STAFF_ROLES.includes((_b = teamBSnap.data()) === null || _b === void 0 ? void 0 : _b.role);
    }
    // *** FIN DE LA CORRECCIÓN #2 ***
    if (!teamAStaff && !teamBStaff) {
        throw new https_1.HttpsError("permission-denied", "You are not authorized to cancel this scrim.");
    }
    // Solo se puede cancelar si está 'pending' o 'confirmed'
    if (scrimData.status === 'cancelled' || scrimData.status === 'completed') {
        throw new https_1.HttpsError("failed-precondition", `Cannot cancel a scrim that is already ${scrimData.status}.`);
    }
=======
    // Check if user is staff of either team
    const teamARef = db.collection("teams").doc(scrimData.teamAId).collection("members").doc(uid);
    const teamAStaff = (await teamARef.get()).exists;
    let teamBStaff = false;
    if (scrimData.teamBId) {
        const teamBRef = db.collection("teams").doc(scrimData.teamBId).collection("members").doc(uid);
        teamBStaff = (await teamBRef.get()).exists;
    }
    if (!teamAStaff && !teamBStaff) {
        throw new https_1.HttpsError("permission-denied", "You are not authorized to cancel this scrim.");
    }
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    await scrimRef.update({ status: 'cancelled' });
    return { success: true, message: "Scrim cancelled." };
});
//# sourceMappingURL=scrims.js.map