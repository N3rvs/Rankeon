import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const clasificacionesGetScrims = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    try {
      const { cursor, pageSize } = Input.parse(req.data ?? {});
      const db = getFirestore();

      let q = db.collection("teams")
        .orderBy("elo", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(pageSize);

      if (cursor) {
        const cur = await db.collection("teams").doc(cursor).get();
        if (cur.exists) q = q.startAfter(cur);
      }

      const res = await q.get();
      const rankings = res.docs.map(d => {
        const x = d.data() as any;
        const played = Number(x.scrimsPlayed ?? x.played ?? 0);
        const won = Number(x.scrimsWon ?? x.won ?? 0);
        const winRate = played > 0 ? won / played : 0;
        return {
          id: d.id,
          name: x.name ?? "",
          logoUrl: x.logoUrl ?? null,
          elo: x.elo ?? 0,
          played, won, winRate,
          createdAt: x.createdAt ?? null,
          updatedAt: x.updatedAt ?? null,
        };
      });

      const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;
      return { rankings, nextCursor };
    } catch (e:any) {
      throw new HttpsError("internal", e?.message ?? "Unexpected error");
    }
  }
);
