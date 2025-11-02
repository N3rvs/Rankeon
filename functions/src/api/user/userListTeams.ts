
import { z } from "zod";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

const Filters = z.object({
  q: z.string().max(64).optional(),          // búsqueda por nombre (prefijo)
  country: z.string().length(2).optional(),
  region: z.string().max(8).optional(),
  rankMin: z.number().int().optional(),
  rankMax: z.number().int().optional(),
  role: z.string().optional(),               // un rol requerido
  pageSize: z.number().int().min(1).max(50).default(10),
  cursor: z.object({ createdAt: z.number(), id: z.string() }).optional()
});

export const userListTeams = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
    const f = Filters.parse(req.data ?? {});
    const db = getFirestore();

    let q = db.collection("teams")
      .where("isListed","==",true);

    if (f.country) q = q.where("country","==", f.country);
    if (f.region)  q = q.where("region","==",  f.region);
    if (f.rankMin !== undefined) q = q.where("rank", ">=", f.rankMin);
    if (f.rankMax !== undefined) q = q.where("rank", "<=", f.rankMax);
    if (f.role) q = q.where("rolesWanted", "array-contains", f.role);

    // orden + cursor
    q = q.orderBy("createdAt","desc").orderBy("__name__","desc");
    if (f.cursor) q = q.startAfter(f.cursor.createdAt, f.cursor.id);

  // ...
const snap = await q.limit(f.pageSize).get();

let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
if (f.q) {
  const term = f.q.toLowerCase();
  items = items.filter((it: any) => (it.name_lc ?? it.name?.toLowerCase() ?? "").startsWith(term));
}

const last = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
const nextCursor = last ? { createdAt: last.get("createdAt") as number, id: last.id } : null;

return { items, nextCursor };

  }
);
