"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsDelete = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
require("../../lib/admin");
const _auth_1 = require("./_auth");
const _types_1 = require("./_types");
exports.tournamentsDelete = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 60 }, async (req) => {
    const { role } = (0, _auth_1.requireAuth)(req);
    (0, _auth_1.requireModOrAdmin)(role);
    const { tournamentId } = _types_1.DeleteTournamentSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const tRef = db.collection("tournaments").doc(tournamentId);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        return { success: true, message: "Ya estaba borrado." };
    const proposalId = tSnap.data()?.proposalId;
    // borrar subcolecciones grandes en lotes
    await deleteCollection(db, `tournaments/${tournamentId}/teams`);
    await deleteCollection(db, `tournaments/${tournamentId}/matches`);
    await deleteCollection(db, `tournaments/${tournamentId}/schedule`);
    await deleteCollection(db, `tournaments/${tournamentId}/standings`);
    const batch = db.batch();
    batch.delete(tRef);
    if (proposalId)
        batch.delete(db.collection("tournamentProposals").doc(proposalId));
    await batch.commit();
    return { success: true, message: "Torneo borrado." };
});
async function deleteCollection(db, path, batchSize = 400) {
    const col = db.collection(path);
    let q = col.orderBy("__name__").limit(batchSize);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snap = await q.get();
        if (snap.empty)
            break;
        const b = db.batch();
        snap.docs.forEach(d => b.delete(d.ref));
        await b.commit();
        if (snap.size < batchSize)
            break;
        q = col.orderBy("__name__").startAfter(snap.docs[snap.docs.length - 1]).limit(batchSize);
    }
}
//# sourceMappingURL=deleteTournament.js.map