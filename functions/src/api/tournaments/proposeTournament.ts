import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import "../../admin";
import { requireAuth } from "./_auth";
import { ProposeTournamentSchema } from "./_types";

export const tournamentsPropose = onCall(
  { region:"europe-west1", enforceAppCheck:true, timeoutSeconds:15 },
  async (req) => {
    const { uid, role, isCertifiedStreamer } = requireAuth(req);
    if (!isCertifiedStreamer && !["admin","moderator"].includes(role)) {
      throw new HttpsError("permission-denied","Solo certificados o staff.");
    }
    const data = ProposeTournamentSchema.parse(req.data ?? {});
    const db = getFirestore();

    const user = await db.collection("users").doc(uid).get();
    if (!user.exists) throw new HttpsError("not-found","Perfil no encontrado.");
    const u = user.data() as any;

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
      proposedDate: Timestamp.fromDate(new Date(data.proposedDate)),
      rankMin: data.rankMin ?? "",
      rankMax: data.rankMax ?? "",
      prize: data.prize ?? null,
      currency: data.currency ?? "",
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success:true, message:"Propuesta enviada." };
  }
);
