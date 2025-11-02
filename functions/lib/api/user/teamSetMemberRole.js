"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamSetMemberRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const Input = zod_1.z.object({
    teamId: zod_1.z.string(),
    targetUid: zod_1.z.string(),
    roleInTeam: zod_1.z.enum(["manager", "player"]) // "owner" se gestiona con transferencia aparte
});
exports.teamSetMemberRole = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const d = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(d.teamId);
    const [teamDoc, actorDoc, targetDoc] = await Promise.all([
        teamRef.get(),
        teamRef.collection("members").doc(req.auth.uid).get(),
        teamRef.collection("members").doc(d.targetUid).get(),
    ]);
    if (!teamDoc.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (!actorDoc.exists || !["owner", "manager"].includes(actorDoc.get("roleInTeam")))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    if (!targetDoc.exists)
        throw new https_1.HttpsError("not-found", "Miembro no existe.");
    // Solo OWNER del equipo puede tocar managers (promover o degradar)
    const isTeamOwner = teamDoc.get("ownerUid") === req.auth.uid;
    if (d.roleInTeam === "manager" || targetDoc.get("roleInTeam") === "manager") {
        if (!isTeamOwner)
            throw new https_1.HttpsError("permission-denied", "Solo el owner del equipo puede cambiar managers.");
    }
    await teamRef.collection("members").doc(d.targetUid).set({ roleInTeam: d.roleInTeam }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=teamSetMemberRole.js.map