import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth, requireModOrAdmin } from "./_auth";
import { DeleteTournamentSchema } from "./_types";

export const tournamentsDelete = onCall(
  { region:"europe-west1", enforceAppCheck:true, timeoutSeconds:60 },
  async (req) => {
    const { role } = requireAuth(req);
    requireModOrAdmin(role);

    const { tournamentId } = DeleteTournamentSchema.parse(req.data ?? {});
    const db = getFirestore();
    const tRef = db.collection("tournaments").doc(tournamentId);
    const tSnap = await tRef.get();
    if (!tSnap.exists) return { success:true, message:"Ya estaba borrado." };
    const proposalId = (tSnap.data() as any)?.proposalId;

    // borrar subcolecciones grandes en lotes
    await deleteCollection(db, `tournaments/${tournamentId}/teams`);
    await deleteCollection(db, `tournaments/${tournamentId}/matches`);
    await deleteCollection(db, `tournaments/${tournamentId}/schedule`);
    await deleteCollection(db, `tournaments/${tournamentId}/standings`);

    const batch = db.batch();
    batch.delete(tRef);
    if (proposalId) batch.delete(db.collection("tournamentProposals").doc(proposalId));
    await batch.commit();

    return { success:true, message:"Torneo borrado." };
  }
);

async function deleteCollection(db: FirebaseFirestore.Firestore, path: string, batchSize = 400) {
  const col = db.collection(path);
  let q = col.orderBy("__name__").limit(batchSize);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await q.get();
    if (snap.empty) break;
    const b = db.batch();
    snap.docs.forEach(d => b.delete(d.ref));
    await b.commit();
    if (snap.size < batchSize) break;
    q = col.orderBy("__name__").startAfter(snap.docs[snap.docs.length - 1]).limit(batchSize);
  }
}
