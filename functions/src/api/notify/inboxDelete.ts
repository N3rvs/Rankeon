import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { w4 } from "../_options";

const db = getFirestore();

const Input = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const inboxDelete = onCall(w4, async (req) => {
  // auth requerida
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const { ids } = Input.parse(req.data ?? {});

  // Trae todos los docs y borra solo los que pertenecen al usuario
  const snaps = await db.getAll(...ids.map((id) => db.doc(`notifications/${id}`)));

  const batch = db.batch();
  for (const s of snaps) {
    if (!s.exists) continue;
    const to = (s.data() as any)?.to;
    if (to === uid) batch.delete(s.ref);
  }

  await batch.commit();
  return { success: true, message: "Notificaciones eliminadas." };
});
