"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamGenerateInvite = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
function code8() { return Math.random().toString(36).slice(2, 10); }
exports.teamGenerateInvite = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId } = (req.data ?? {});
    if (!teamId)
        throw new https_1.HttpsError("invalid-argument", "teamId requerido.");
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const [teamDoc, actorDoc] = await Promise.all([
        teamRef.get(),
        teamRef.collection("members").doc(req.auth.uid).get(),
    ]);
    if (!teamDoc.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (!actorDoc.exists || !["owner", "manager"].includes(actorDoc.get("roleInTeam")))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    const code = code8();
    await teamRef.set({ inviteCode: code, inviteAt: Date.now() }, { merge: true });
    return { success: true, code };
});
//# sourceMappingURL=teamGenerateInvite.js.map