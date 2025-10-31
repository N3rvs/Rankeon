import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import "../lib/admin";

const positiveTypes = ["MVP","FAIR_PLAY","LEADERSHIP"] as const;
const negativeTypes = ["TOXIC","GRIEFING","AFK"] as const; // añade las que necesites

const Input = z.object({
  to: z.string().min(1),
  kind: z.enum(["pos","neg"]),
  type: z.union([z.enum(positiveTypes), z.enum(negativeTypes)]),
  reason: z.string().min(3).max(200).optional(),
});

function starsFromPosNeg(pos: number, neg: number) {
  const n = Math.max(0, (pos|0) + (neg|0));
  const m = 10, p0 = 0.7;
//   const p = n === 0 ? p0 : pos / n;
  const pBayes = (m * p0 + pos) / (m + n);
  const stars = 1 + 4 * pBayes;
  return Math.max(1, Math.min(5, Number(stars.toFixed(2))));
}

export const honorGive = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { to, kind, type, reason } = Input.parse(req.data ?? {});
  const from = req.auth.uid;
  if (from === to) throw new HttpsError("failed-precondition","No puedes darte honor a ti mismo.");

  const db = getFirestore();

  // límites: 5 honores por día por emisor; 1 por día al mismo receptor
  const since = Date.now() - 24*60*60*1000;
  const [countSender, countPair, blocked] = await Promise.all([
    db.collection("honors").where("from","==",from).where("createdAt",">=", since).count().get(),
    db.collection("honors").where("from","==",from).where("to","==",to).where("createdAt",">=", since).count().get(),
    db.collection("blocks").doc(to).collection("list").doc(from).get(),
  ]);
  if (blocked.exists) throw new HttpsError("permission-denied","El usuario no acepta interacciones tuyas.");
  if (countSender.data().count >= 5) throw new HttpsError("resource-exhausted","Límite diario alcanzado.");
  if (countPair.data().count >= 1) throw new HttpsError("resource-exhausted","Ya valoraste a esta persona hoy.");

  const honorRef = db.collection("honors").doc();
  const statsRef = db.collection("honorStats").doc(to);
  const userRef  = db.collection("users").doc(to);

  await db.runTransaction(async (tx) => {
    const statsSnap = await tx.get(statsRef);
    const prev = statsSnap.exists ? (statsSnap.data() as any) : { pos: 0, neg: 0 };

    const next = {
      pos: prev.pos + (kind === "pos" ? 1 : 0),
      neg: prev.neg + (kind === "neg" ? 1 : 0),
    };
    const stars = starsFromPosNeg(next.pos, next.neg);

    tx.set(honorRef, {
      id: honorRef.id, from, to, kind, type, reason: reason ?? null,
      createdAt: Date.now()
    });

    tx.set(statsRef, {
      uid: to,
      pos: next.pos,
      neg: next.neg,
      total: next.pos + next.neg,
      stars,
      updatedAt: Date.now()
    }, { merge: true });

    tx.set(userRef, {
      totalHonors: FieldValue.increment(1),
      _honorUpdatedAt: Date.now()
    }, { merge: true });
  });

  return { ok: true, id: honorRef.id };
});
