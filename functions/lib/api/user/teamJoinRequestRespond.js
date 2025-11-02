"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamJoinRequestRespond = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const _notify_1 = require("../notify/_notify");
const Input = zod_1.z.object({ teamId: zod_1.z.string(), targetUid: zod_1.z.string(), accept: zod_1.z.boolean() });
exports.teamJoinRequestRespond = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId, targetUid, accept } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const [team, actor, reqDoc] = await Promise.all([
        teamRef.get(),
        teamRef.collection("members").doc(req.auth.uid).get(),
        teamRef.collection("joinRequests").doc(targetUid).get(),
    ]);
    if (!team.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (!actor.exists || !["owner", "manager"].includes(actor.get("roleInTeam")))
        throw new https_1.HttpsError("permission-denied", "No autorizado.");
    if (!reqDoc.exists || reqDoc.get("status") !== "pending")
        throw new https_1.HttpsError("failed-precondition", "No hay solicitud vigente.");
    if (!accept) {
        await reqDoc.ref.set({ status: "rejected", respondedAt: Date.now(), respondedBy: req.auth.uid }, { merge: true });
        await (0, _notify_1.createNotification)(targetUid, req.auth.uid, "TEAM_JOIN_REJECTED", { teamId, teamName: team.get("name") });
        return { success: true };
    }
    await db.runTransaction(async (tx) => {
        tx.set(teamRef.collection("members").doc(targetUid), {
            uid: targetUid, roleInTeam: "player", gameRoles: [], joinedAt: Date.now(),
        }, { merge: true });
        tx.set(teamRef, { memberCount: (team.get("memberCount") ?? 0) + 1 }, { merge: true });
        tx.set(reqDoc.ref, { status: "accepted", respondedAt: Date.now(), respondedBy: req.auth.uid }, { merge: true });
    });
    await (0, _notify_1.createNotification)(targetUid, req.auth.uid, "TEAM_JOIN_ACCEPTED", { teamId, teamName: team.get("name") });
    return { success: true, teamPath: `/teams/${team.get("slug")}` };
});
//# sourceMappingURL=teamJoinRequestRespond.js.map