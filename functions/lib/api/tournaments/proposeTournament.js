"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsPropose = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const _auth_1 = require("./_auth");
const _types_1 = require("./_types");
exports.tournamentsPropose = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const { uid, role, isCertifiedStreamer } = (0, _auth_1.requireAuth)(req);
    if (!isCertifiedStreamer && !["admin", "moderator"].includes(role)) {
        throw new https_1.HttpsError("permission-denied", "Solo certificados o staff.");
    }
    const data = _types_1.ProposeTournamentSchema.parse(req.data ?? {});
    const db = (0, firestore_1.getFirestore)();
    const user = await db.collection("users").doc(uid).get();
    if (!user.exists)
        throw new https_1.HttpsError("not-found", "Perfil no encontrado.");
    const u = user.data();
    const pRef = db.collection("tournamentProposals").doc();
    await pRef.set({
        id: pRef.id,
        proposerUid: uid,
        proposerName: u?.name ?? u?.displayName ?? "User",
        proposerCountry: u?.country ?? "",
        tournamentName: data.name,
        game: data.game,
        description: data.description,
        format: data.format,
        maxTeams: data.maxTeams,
        proposedDate: firestore_1.Timestamp.fromDate(new Date(data.proposedDate)),
        rankMin: data.rankMin ?? "",
        rankMax: data.rankMax ?? "",
        prize: data.prize ?? null,
        currency: data.currency ?? "",
        status: "pending",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Propuesta enviada." };
});
//# sourceMappingURL=proposeTournament.js.map