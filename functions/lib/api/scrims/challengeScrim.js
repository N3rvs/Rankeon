"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrimsChallenge = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const ChallengeSchema = zod_1.z.object({
    scrimId: zod_1.z.string().min(1),
    challengingTeamId: zod_1.z.string().min(1),
    clientId: zod_1.z.string().min(8).max(64).optional(),
});
exports.scrimsChallenge = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    if (!req.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    const uid = req.auth.uid;
    const { scrimId, challengingTeamId, clientId } = ChallengeSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const scrimRef = db.doc(`scrims/${scrimId}`);
    const idempRef = clientId ? db.doc(`idempotency/${uid}_challenge_${clientId}`) : null;
    await db.runTransaction(async (tx) => {
        if (idempRef) {
            const idem = await tx.get(idempRef);
            if (idem.exists)
                return;
        }
        const sSnap = await tx.get(scrimRef);
        if (!sSnap.exists)
            throw new https_1.HttpsError("not-found", "Scrim no encontrada.");
        const scrim = sSnap.data();
        const status = scrim.status ?? "open";
        if (status !== "open") {
            throw new https_1.HttpsError("failed-precondition", `La scrim no está abierta (status: ${status}).`);
        }
        if (scrim.teamId && scrim.teamId === challengingTeamId) {
            throw new https_1.HttpsError("failed-precondition", "No puedes desafiar tu propia scrim.");
        }
        const memberRef = db.doc(`teams/${challengingTeamId}/members/${uid}`);
        const memberSnap = await tx.get(memberRef);
        if (!memberSnap.exists) {
            const flat = await db
                .collection("teamMembers")
                .where("teamId", "==", challengingTeamId)
                .where("uid", "==", uid)
                .limit(1)
                .get();
            if (flat.empty)
                throw new https_1.HttpsError("permission-denied", "No perteneces al equipo desafiador.");
        }
        if (sSnap.get("status") === "challenged" || sSnap.get("challengerTeamId")) {
            throw new https_1.HttpsError("already-exists", "La scrim ya fue desafiada.");
        }
        tx.update(scrimRef, {
            status: "challenged",
            challengerTeamId: challengingTeamId,
            challengedBy: uid,
            challengedAt: Date.now(),
            updatedAt: Date.now(),
        });
        if (idempRef) {
            tx.set(idempRef, { at: Date.now(), type: "challenge_scrim", scrimId, challengingTeamId });
        }
    });
    return { success: true, message: "Scrim desafiada correctamente." };
});
//# sourceMappingURL=challengeScrim.js.map