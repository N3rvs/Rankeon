"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsRegisterTeam = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
require("../../lib/admin");
const _auth_1 = require("./_auth");
const _types_1 = require("./_types");
exports.tournamentsRegisterTeam = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const { uid } = (0, _auth_1.requireAuth)(req);
    const { tournamentId, teamId } = _types_1.RegisterTeamSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const tRef = db.collection("tournaments").doc(tournamentId);
    const teamRef = db.collection("teams").doc(teamId);
    const memberRef = teamRef.collection("members").doc(uid);
    const regRef = tRef.collection("teams").doc(teamId);
    await db.runTransaction(async (tx) => {
        const [tSnap, teamSnap, memberSnap, regSnap] = await Promise.all([
            tx.get(tRef), tx.get(teamRef), tx.get(memberRef), tx.get(regRef)
        ]);
        if (!tSnap.exists)
            throw new https_1.HttpsError("not-found", "Torneo no existe.");
        if (!teamSnap.exists)
            throw new https_1.HttpsError("not-found", "Equipo no existe.");
        if (!memberSnap.exists || !["founder", "coach"].includes(memberSnap.data()?.role)) {
            throw new https_1.HttpsError("permission-denied", "Solo founder/coach registra.");
        }
        if (regSnap.exists)
            throw new https_1.HttpsError("already-exists", "Equipo ya registrado.");
        const td = tSnap.data();
        if (td.status !== "upcoming")
            throw new https_1.HttpsError("failed-precondition", "Torneo no abierto.");
        const regs = await tx.get(tRef.collection("teams").limit(td.maxTeams));
        if (regs.size >= td.maxTeams)
            throw new https_1.HttpsError("failed-precondition", "Torneo lleno.");
        tx.set(regRef, {
            teamId,
            teamName: teamSnap.data()?.name ?? "",
            teamAvatarUrl: teamSnap.data()?.avatarUrl ?? null,
            registeredAt: Date.now(),
        });
        tx.update(tRef, { registeredTeamsCount: firestore_1.FieldValue.increment(1) });
    });
    return { success: true, message: "Equipo registrado." };
});
//# sourceMappingURL=registerTeam.js.map