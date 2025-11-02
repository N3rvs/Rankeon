"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsReportBracketResult = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const _auth_1 = require("./_auth");
const _types_1 = require("./_types");
exports.tournamentsReportBracketResult = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const { role } = (0, _auth_1.requireAuth)(req);
    (0, _auth_1.requireModOrAdmin)(role);
    const { tournamentId, matchId, winnerId } = _types_1.ReportBracketMatchResultSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const mRef = tRef.collection("matches").doc(matchId);
    await db.runTransaction(async (tx) => {
        const m = await tx.get(mRef);
        if (!m.exists)
            throw new https_1.HttpsError("not-found", "Match no encontrado.");
        const md = m.data();
        if (!md.teamA || !md.teamB)
            throw new https_1.HttpsError("failed-precondition", "Match no listo.");
        if (md.winnerId)
            throw new https_1.HttpsError("failed-precondition", "Match ya tiene ganador.");
        const win = winnerId === md.teamA.id ? md.teamA :
            winnerId === md.teamB.id ? md.teamB : null;
        if (!win)
            throw new https_1.HttpsError("invalid-argument", "WinnerId inválido.");
        tx.update(mRef, { winnerId, status: "completed" });
        if (md.nextMatchId) {
            const nextRef = tRef.collection("matches").doc(md.nextMatchId);
            const next = await tx.get(nextRef);
            if (!next.exists)
                throw new https_1.HttpsError("internal", "Next match roto.");
            const nx = next.data();
            if (!nx.teamA) {
                tx.update(nextRef, { teamA: win, status: nx.teamB ? "pending" : "awaiting_opponent" });
            }
            else if (!nx.teamB) {
                tx.update(nextRef, { teamB: win, status: "pending" });
            }
        }
        else {
            tx.update(tRef, { winnerId, status: "completed" });
        }
    });
    return { success: true, message: "Resultado reportado." };
});
//# sourceMappingURL=reportBracketResult.js.map