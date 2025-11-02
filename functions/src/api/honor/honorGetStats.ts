import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

export const honorGetStats = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  const { uid } = z.object({ uid: z.string().min(1) }).parse(req.data ?? {});
  const snap = await getFirestore().collection("honorStats").doc(uid).get();
  if (!snap.exists) return { pos: 0, neg: 0, total: 0, stars: 3.5 };
  const { pos = 0, neg = 0, total = 0, stars = 3.5 } = snap.data() as any;
  return { pos, neg, total, stars };
});
