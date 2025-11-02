import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({
  direction: z.enum(["incoming","outgoing"]).default("incoming"),
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const userListFriendRequests = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const { direction, cursor, pageSize } = Input.parse(req.data ?? {});
  const db = getFirestore();

  // En nuestro modelo, ambas vistas leen de /friends/{uid}/list
  // Para distinguir incoming/outgoing puedes guardar un campo "fromUid" cuando creas el pending.
  const base = db.collection("friends").doc(req.auth.uid).collection("list");

  let q = base.where("status","==","pending")
              .orderBy("createdAt","desc")
              .orderBy(FieldPath.documentId(),"desc")
              .limit(pageSize);

  if (cursor) {
    const cur = await base.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }

  const snap = await q.get();
  // Filtra en memoria por dirección si guardas { fromUid }
  const items = snap.docs
    .map(d => ({ id: d.id, ...d.data() as any }))
    .filter(it => direction === "incoming" ? it.fromUid !== req.auth!.uid : it.fromUid === req.auth!.uid);

  const nextCursor = snap.size === pageSize ? snap.docs[snap.docs.length - 1].id : null;
  return { items, nextCursor };
});
