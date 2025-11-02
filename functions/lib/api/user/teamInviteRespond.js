"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamInviteRespond = void 0;
// functions/src/api/user/teamInviteRespond.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const _notify_1 = require("../notify/_notify");
const Input = zod_1.z.object({ teamId: zod_1.z.string(), accept: zod_1.z.boolean() });
exports.teamInviteRespond = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { teamId, accept } = Input.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const teamRef = db.collection("teams").doc(teamId);
    const [team, invite] = await Promise.all([
        teamRef.get(),
        teamRef.collection("invites").doc(req.auth.uid).get(),
    ]);
    if (!team.exists)
        throw new https_1.HttpsError("not-found", "Equipo no existe.");
    if (!invite.exists || invite.get("status") !== "pending")
        throw new https_1.HttpsError("failed-precondition", "No hay invitación vigente.");
    if (!accept) {
        await invite.ref.set({ status: "rejected", respondedAt: Date.now() }, { merge: true });
        // avisar a owner/manager que invitó
        const by = invite.get("by");
        await (0, _notify_1.createNotification)(by, req.auth.uid, "TEAM_INVITE_REJECTED", { teamId, teamName: team.get("name") });
        return { success: true };
    }
    // aceptar → agregar miembro
    await db.runTransaction(async (tx) => {
        tx.set(teamRef.collection("members").doc(req.auth.uid), {
            uid: req.auth.uid, roleInTeam: "player", gameRoles: [], joinedAt: Date.now(),
        }, { merge: true });
        tx.set(teamRef, { memberCount: (team.get("memberCount") ?? 0) + 1 }, { merge: true });
        tx.set(invite.ref, { status: "accepted", respondedAt: Date.now() }, { merge: true });
    });
    // notificar a quien invitó
    const by = invite.get("by");
    await (0, _notify_1.createNotification)(by, req.auth.uid, "TEAM_INVITE_ACCEPTED", {
        teamId, teamName: team.get("name")
    });
    return { success: true, teamPath: `/teams/${team.get("slug")}` };
});
//# sourceMappingURL=teamInviteRespond.js.map