"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamJoinRequestCreate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const _notify_1 = require("../notify/_notify");
const Input = zod_1.z.object({ teamId: zod_1.z.string() });
exports.teamJoinRequestCreate = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const [team, existing, member] = await Promise.all([
        teamRef.get(),
        teamRef.collection("joinRequests").doc(req.auth.uid).get(),
        teamRef.collection("members").doc(req.auth.uid).get(),
    ]);
    if (!team.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (member.exists)
        throw new https_1.HttpsError("failed-precondition", "Ya perteneces al equipo.");
    if (existing.exists && existing.get("status") === "pending")
        return { success: true }; // idempotente
    await teamRef.collection("joinRequests").doc(req.auth.uid).set({
        status: "pending",
        by: req.auth.uid,
        createdAt: Date.now(),
        ttlAt: Date.now() + 7 * 24 * 3600 * 1000,
    }, { merge: true });
    // notificar a owner (y opcional: managers)
    const ownerUid = team.get("ownerUid");
    await (0, _notify_1.createNotification)(ownerUid, req.auth.uid, "TEAM_JOIN_REQUEST", {
        teamId, teamName: team.get("name")
    });
    return { success: true };
});
//# sourceMappingURL=teamJoinRequestCreate.js.map