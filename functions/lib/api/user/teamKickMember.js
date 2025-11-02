"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamKickMember = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
require("../../lib/admin");
exports.teamKickMember = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId, targetUid } = (req.data ?? {});
    if (!teamId || !targetUid)
        throw new https_1.HttpsError("invalid-argument", "Datos requeridos.");
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const [teamDoc, actorDoc, targetDoc] = await Promise.all([
        teamRef.get(),
        teamRef.collection("members").doc(req.auth.uid).get(),
        teamRef.collection("members").doc(targetUid).get(),
    ]);
    if (!teamDoc.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (!actorDoc.exists || !["owner", "manager"].includes(actorDoc.get("roleInTeam")))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    if (!targetDoc.exists)
        throw new https_1.HttpsError("not-found", "Miembro no existe.");
    if (targetDoc.get("roleInTeam") === "owner")
        throw new https_1.HttpsError("failed-precondition", "No puedes expulsar al owner.");
    await teamRef.collection("members").doc(targetUid).delete();
    const current = (teamDoc.get("memberCount") ?? 1);
    await teamRef.set({ memberCount: Math.max(current - 1, 0) }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=teamKickMember.js.map