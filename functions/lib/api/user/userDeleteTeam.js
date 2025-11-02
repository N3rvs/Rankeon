"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDeleteTeam = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.userDeleteTeam = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId } = (req.data ?? {});
    if (!teamId)
        throw new https_1.HttpsError("invalid-argument", "teamId requerido.");
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const team = await teamRef.get();
    if (!team.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    const data = team.data();
    const isTeamOwner = data.ownerUid === req.auth.uid;
    const isGlobalOwner = req.auth.token?.role === "owner";
    if (!(isTeamOwner || isGlobalOwner))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    const batch = db.batch();
    batch.delete(db.collection("team_slugs").doc(data.slug));
    batch.delete(teamRef);
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=userDeleteTeam.js.map