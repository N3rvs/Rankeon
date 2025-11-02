"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamInviteMember = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const _notify_1 = require("../notify/_notify");
const Input = zod_1.z.object({ teamId: zod_1.z.string(), targetUid: zod_1.z.string() });
exports.teamInviteMember = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId, targetUid } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const [team, actor, targetMember] = await Promise.all([
        teamRef.get(),
        teamRef.collection("members").doc(req.auth.uid).get(),
        teamRef.collection("members").doc(targetUid).get(),
    ]);
    if (!team.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (!actor.exists || !["owner", "manager"].includes(actor.get("roleInTeam")))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    if (targetMember.exists)
        throw new https_1.HttpsError("failed-precondition", "El usuario ya está en el equipo.");
    // crear/actualizar invite
    await teamRef.collection("invites").doc(targetUid).set({
        status: "pending",
        by: req.auth.uid,
        createdAt: Date.now(),
        ttlAt: Date.now() + 7 * 24 * 3600 * 1000, // vence en 7 días
    }, { merge: true });
    await (0, _notify_1.createNotification)(targetUid, req.auth.uid, "TEAM_INVITE", {
        teamId, teamName: team.get("name"), slug: team.get("slug")
    });
    return { success: true };
});
//# sourceMappingURL=teamInviteMember.js.map