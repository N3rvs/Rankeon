import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

export const inboxMarkRead = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { ids } = Input.parse(req.data ?? {});
  const db = getFirestore();
  const base = db.collection("notifications").doc(req.auth.uid).collection("items");

  const snaps = await db.getAll(...ids.map(id => base.doc(id)));
  const batch = db.batch();
  snaps.forEach(s => { if (s.exists) batch.update(s.ref, { read: true, readAt: Date.now() }); });
  await batch.commit();

  return { ok: true };
});
