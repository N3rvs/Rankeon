// friendBlock.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

export const friendBlock = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { targetUid, block } = (req.data ?? {}) as { targetUid?: string; block?: boolean };
  if(!targetUid || block===undefined) throw new HttpsError("invalid-argument","Datos requeridos.");

  const db = getFirestore();
  const ref = db.collection("blocks").doc(req.auth.uid).collection("list").doc(targetUid);
  if (block) {
    await ref.set({ createdAt: Date.now() });
    // opcional: elimina amistad si existía
    await Promise.all([
      db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).delete(),
      db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).delete(),
    ]);
  } else {
    await ref.delete();
  }
  return { success:true };
});
