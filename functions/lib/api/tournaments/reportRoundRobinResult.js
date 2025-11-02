"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsReportResult = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const _auth_1 = require("./_auth");
const _types_1 = require("./_types");
exports.tournamentsReportResult = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const { role } = (0, _auth_1.requireAuth)(req);
    (0, _auth_1.requireModOrAdmin)(role);
    const { tournamentId, matchId, winnerId, loserId } = _types_1.ReportRoundRobinMatchResultSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const mRef = tRef.collection("schedule").doc(matchId);
    const wRef = tRef.collection("standings").doc(winnerId);
    const lRef = tRef.collection("standings").doc(loserId);
    await db.runTransaction(async (tx) => {
        const [m, w, l] = await Promise.all([tx.get(mRef), tx.get(wRef), tx.get(lRef)]);
        if (!m.exists || m.data()?.status === "completed") {
            throw new https_1.HttpsError("failed-precondition", "Match no reportable.");
        }
        if (!w.exists || !l.exists)
            throw new https_1.HttpsError("not-found", "Standings no encontrados.");
        tx.update(mRef, { status: "completed", winnerId });
        tx.update(wRef, { wins: firestore_1.FieldValue.increment(1) });
        tx.update(lRef, { losses: firestore_1.FieldValue.increment(1) });
    });
    return { success: true, message: "Resultado reportado." };
});
//# sourceMappingURL=reportRoundRobinResult.js.map