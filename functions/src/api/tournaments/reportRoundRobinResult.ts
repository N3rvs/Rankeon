import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import "../../lib/admin";
import { requireAuth, requireModOrAdmin } from "./_auth";
import { ReportRoundRobinMatchResultSchema } from "./_types";

export const tournamentsReportResult = onCall(
  { region:"europe-west1", enforceAppCheck:true, timeoutSeconds:15 },
  async (req) => {
    const { role } = requireAuth(req);
    requireModOrAdmin(role);

    const { tournamentId, matchId, winnerId, loserId } = ReportRoundRobinMatchResultSchema.parse(req.data ?? {});
    const db = getFirestore();
    const tRef = db.doc(`tournaments/${tournamentId}`);
    const mRef = tRef.collection("schedule").doc(matchId);
    const wRef = tRef.collection("standings").doc(winnerId);
    const lRef = tRef.collection("standings").doc(loserId);

    await db.runTransaction(async (tx)=>{
      const [m,w,l] = await Promise.all([tx.get(mRef), tx.get(wRef), tx.get(lRef)]);
      if (!m.exists || (m.data() as any)?.status === "completed") {
        throw new HttpsError("failed-precondition","Match no reportable.");
      }
      if (!w.exists || !l.exists) throw new HttpsError("not-found","Standings no encontrados.");
      tx.update(mRef, { status:"completed", winnerId });
      tx.update(wRef, { wins: FieldValue.increment(1) });
      tx.update(lRef, { losses: FieldValue.increment(1) });
    });

    return { success:true, message:"Resultado reportado." };
  }
);
