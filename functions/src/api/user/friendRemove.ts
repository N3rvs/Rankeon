// friendRemove.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

export const friendRemove = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { targetUid } = (req.data ?? {}) as { targetUid?: string };
  if(!targetUid) throw new HttpsError("invalid-argument","targetUid requerido.");

  const db = getFirestore();
  await Promise.all([
    db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).delete(),
    db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).delete(),
  ]);
  return { success:true };
});
