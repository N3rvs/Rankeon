import { onCall} from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../lib/admin";

const Input = z.object({ cursor: z.string().optional(), pageSize: z.number().int().min(1).max(50).default(20) });

export const honorGetRankings = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  const { cursor, pageSize } = Input.parse(req.data ?? {});
  const db = getFirestore();

  let q = db.collection("honorStats")
            .orderBy("stars","desc")
            .orderBy("total","desc")
            .orderBy(FieldPath.documentId(),"desc")
            .limit(pageSize);

  if (cursor) {
    const cur = await db.collection("honorStats").doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }

  const res = await q.get();

  const userRefs = res.docs.map(d => db.collection("users").doc(d.id));
  const users = userRefs.length ? await db.getAll(...userRefs) : [];
  const usersById = new Map(users.filter(s => s.exists).map(s => [s.id, s.data() as any]));

  const rankings = res.docs.map(d => {
    const st = d.data() as any;
    const u = usersById.get(d.id) ?? {};
    return {
      id: d.id,
      name: u.displayName ?? u.name ?? "",
      avatarUrl: u.photoURL ?? u.avatarUrl ?? null,
      stars: st.stars ?? 1,
      pos: st.pos ?? 0,
      neg: st.neg ?? 0,
      total: st.total ?? 0,
      country: u.country ?? null,
    };
  });

  const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;
  return { rankings, nextCursor };
});
