import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import "../../lib/admin";
import { requireAuth, requireModOrAdmin } from "./_auth";
import { ReviewTournamentSchema } from "./_types";

export const tournamentsReviewProposal = onCall(
  { region:"europe-west1", enforceAppCheck:true, timeoutSeconds:15 },
  async (req) => {
    const { uid, role } = requireAuth(req);
    requireModOrAdmin(role);

    const { proposalId, status } = ReviewTournamentSchema.parse(req.data ?? {});
    const db = getFirestore();
    const pRef = db.collection("tournamentProposals").doc(proposalId);

    await db.runTransaction(async (tx)=>{
      const p = await tx.get(pRef);
      if (!p.exists) throw new HttpsError("not-found","Propuesta no encontrada.");
      const pr = p.data() as any;
      if (pr.status !== "pending") throw new HttpsError("failed-precondition","Propuesta ya revisada.");

      const reviewedAt = Timestamp.now();
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

    return { success:true, message:`Propuesta ${status}.` };
  }
);
