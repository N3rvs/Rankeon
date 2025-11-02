"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsReviewProposal = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const _auth_1 = require("./_auth");
const _types_1 = require("./_types");
exports.tournamentsReviewProposal = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const { uid, role } = (0, _auth_1.requireAuth)(req);
    (0, _auth_1.requireModOrAdmin)(role);
    const { proposalId, status } = _types_1.ReviewTournamentSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const pRef = db.collection("tournamentProposals").doc(proposalId);
    await db.runTransaction(async (tx) => {
        const p = await tx.get(pRef);
        if (!p.exists)
            throw new https_1.HttpsError("not-found", "Propuesta no encontrada.");
        const pr = p.data();
        if (pr.status !== "pending")
            throw new https_1.HttpsError("failed-precondition", "Propuesta ya revisada.");
        const reviewedAt = firestore_1.Timestamp.now();
        tx.update(pRef, { status, reviewedBy: uid, reviewedAt });
        if (status === "approved") {
            const { tournamentName, game, description, proposedDate, format, maxTeams } = pr;
            const tRef = db.collection("tournaments").doc();
            tx.set(tRef, {
                id: tRef.id,
                name: tournamentName,
                game,
                description,
                startsAt: proposedDate,
                format,
                maxTeams,
                registeredTeamsCount: 0,
                winnerId: null,
                status: "upcoming",
                createdAt: reviewedAt,
                proposalId,
            });
        }
    });
    return { success: true, message: `Propuesta ${status}.` };
});
//# sourceMappingURL=reviewProposal.js.map