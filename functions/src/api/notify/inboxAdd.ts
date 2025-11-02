import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";


const notifTypes = ["FRIEND_REQUEST","FRIEND_ACCEPTED","MESSAGE","SYSTEM"] as const;

const Input = z.object({
  to: z.string().min(1),
  type: z.enum(notifTypes),
  extraData: z.record(z.any()).optional()
});

export const inboxAdd = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { to, type, extraData } = Input.parse(req.data ?? {});
  const from = req.auth.uid;

  if (from === to) throw new HttpsError("failed-precondition","No puedes notificarte a ti mismo.");

  const db = getFirestore();
  // ¿el destinatario me bloqueó?
  const blocked = await db.collection("blocks").doc(to).collection("list").doc(from).get();
  if (blocked.exists) throw new HttpsError("permission-denied","El receptor te tiene bloqueado.");

  const ref = db.collection("notifications").doc(to).collection("items").doc();
  await ref.set({
    id: ref.id,
    to,
    from,
    type,
    extraData: extraData ?? {},
    createdAt: Date.now(),
    read: false
  });

  return { ok: true, id: ref.id };
});
