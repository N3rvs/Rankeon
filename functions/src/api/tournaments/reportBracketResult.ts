import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth, requireModOrAdmin } from "./_auth";
import { ReportBracketMatchResultSchema } from "./_types";

export const tournamentsReportBracketResult = onCall(
  { region:"europe-west1", enforceAppCheck:true, timeoutSeconds:15 },
  async (req) => {
    const { role } = requireAuth(req);
    requireModOrAdmin(role);

    const { tournamentId, matchId, winnerId } = ReportBracketMatchResultSchema.parse(req.data ?? {});
    const db = getFirestore();
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const mRef = tRef.collection("matches").doc(matchId);

    await db.runTransaction(async (tx) => {
      const m = await tx.get(mRef);
      if (!m.exists) throw new HttpsError("not-found","Match no encontrado.");
      const md = m.data() as any;

      if (!md.teamA || !md.teamB) throw new HttpsError("failed-precondition","Match no listo.");
      if (md.winnerId) throw new HttpsError("failed-precondition","Match ya tiene ganador.");

      const win =
        winnerId === md.teamA.id ? md.teamA :
        winnerId === md.teamB.id ? md.teamB : null;

      if (!win) throw new HttpsError("invalid-argument","WinnerId inválido.");
      tx.update(mRef, { winnerId, status:"completed" });

      if (md.nextMatchId) {
        const nextRef = tRef.collection("matches").doc(md.nextMatchId);
        const next = await tx.get(nextRef);
        if (!next.exists) throw new HttpsError("internal","Next match roto.");

        const nx = next.data() as any;
        if (!nx.teamA) {
          tx.update(nextRef, { teamA: win, status: nx.teamB ? "pending":"awaiting_opponent" });
        } else if (!nx.teamB) {
          tx.update(nextRef, { teamB: win, status: "pending" });
        }
      } else {
        tx.update(tRef, { winnerId, status:"completed" });
      }
    });

    return { success:true, message:"Resultado reportado." };
  }
);
