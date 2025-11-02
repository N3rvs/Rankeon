import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(50).default(20),
  // opcional: solo finalizados
  onlyFinished: z.boolean().optional()
});

export const clasificacionesGetTorneos = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    try {
      const { cursor, pageSize, onlyFinished } = Input.parse(req.data ?? {});
      const db = getFirestore();

      let q = db.collection("tournaments")
        // ajusta si tu modelo usa "elo" o "rating"
        .orderBy("rating", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(pageSize);

      if (onlyFinished) q = q.where("status", "==", "finished");

      if (cursor) {
        const cur = await db.collection("tournaments").doc(cursor).get();
        if (cur.exists) q = q.startAfter(cur);
      }

      const res = await q.get();
      const tournaments = res.docs.map(d => {
        const x = d.data() as any;
        return {
          id: d.id,
          name: x.name ?? "",
          game: x.game ?? null,
          rating: x.rating ?? x.elo ?? 0,
          participants: x.participants ?? x.participantsCount ?? 0,
          startDate: x.startDate ?? null,
          status: x.status ?? null,
          createdAt: x.createdAt ?? null,
          updatedAt: x.updatedAt ?? null,
        };
      });

      const nextCursor = res.size === pageSize ? res.docs[res.docs.length - 1].id : null;
      return { tournaments, nextCursor };
    } catch (e:any) {
      throw new HttpsError("internal", e?.message ?? "Unexpected error");
    }
  }
);
