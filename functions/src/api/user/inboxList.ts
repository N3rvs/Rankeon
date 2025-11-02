import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(50).default(20)
});

export const inboxList = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { cursor, pageSize } = Input.parse(req.data ?? {});
  const db = getFirestore();
  const base = db.collection("notifications").doc(req.auth.uid).collection("items");

  let q = base.orderBy("createdAt","desc").orderBy(FieldPath.documentId(),"desc").limit(pageSize);
  if (cursor) {
    const cur = await base.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }

  const res = await q.get();
  const items = res.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;

  return { items, nextCursor };
});
