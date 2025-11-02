"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamSetMemberGameRoles = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const Input = zod_1.z.object({
    teamId: zod_1.z.string(),
    targetUid: zod_1.z.string(),
    gameRoles: zod_1.z.array(zod_1.z.string()).max(3)
});
exports.teamSetMemberGameRoles = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const d = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(d.teamId);
    const actorDoc = await teamRef.collection("members").doc(req.auth.uid).get();
    if (!actorDoc.exists)
        throw new https_1.HttpsError("permission-denied", "No perteneces al equipo.");
    // manager/owner pueden editar a cualquiera; un jugador puede editarse a sí mismo
    const actorRole = actorDoc.get("roleInTeam");
    const canEditOthers = ["owner", "manager"].includes(actorRole);
    if (!canEditOthers && req.auth.uid !== d.targetUid)
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    await teamRef.collection("members").doc(d.targetUid).set({ gameRoles: d.gameRoles }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=teamSetMemberGameRoles.js.map