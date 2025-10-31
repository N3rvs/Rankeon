import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../lib/admin";

const Input = z.object({ cursor: z.string().optional(), pageSize: z.number().int().min(1).max(50).default(100) });

export const userListFriendsWithProfiles = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { cursor, pageSize } = Input.parse(req.data ?? {});
  const db = getFirestore();
  const base = db.collection("friends").doc(req.auth.uid).collection("list");

  let q = base.where("status","==","accepted")
              .orderBy("createdAt","desc")
              .orderBy(FieldPath.documentId(),"desc")
              .limit(pageSize);

  if (cursor) {
    const cur = await base.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }

  const snap = await q.get();
  const ids = snap.docs.map(d => d.id);
  const userRefs = ids.map(id => db.collection("users").doc(id));
  const users = userRefs.length ? await db.getAll(...userRefs) : [];

  const profiles = users.filter(s => s.exists).map(s => {
    const u = s.data() as any;
    return {
      id: s.id,
      name: u.displayName ?? u.name ?? "",
      avatarUrl: u.photoURL ?? u.avatarUrl ?? null,
      country: u.country ?? null,
      presence: u.presence ?? "offline",
      createdAt: u.createdAt ?? null,
    };
  });

  const nextCursor = snap.size === pageSize ? snap.docs[snap.docs.length - 1].id : null;
  return { profiles, nextCursor };
});
