// friendRequestRespond.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

export const friendRequestRespond = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { requesterUid, accept } = (req.data ?? {}) as { requesterUid?: string; accept?: boolean };
  if(!requesterUid || accept===undefined) throw new HttpsError("invalid-argument","Datos requeridos.");

  const db = getFirestore();
  const myDoc = await db.collection("friends").doc(req.auth.uid).collection("list").doc(requesterUid).get();
  if(!myDoc.exists || myDoc.get("status")!=="pending") throw new HttpsError("failed-precondition","No hay solicitud.");

  const status = accept ? "accepted" : undefined;
  const batch = db.batch();
  if (accept) {
    batch.set(db.collection("friends").doc(req.auth.uid).collection("list").doc(requesterUid), { status, createdAt: Date.now() }, { merge:true });
    batch.set(db.collection("friends").doc(requesterUid).collection("list").doc(req.auth.uid), { status, createdAt: Date.now() }, { merge:true });
  } else {
    batch.delete(db.collection("friends").doc(req.auth.uid).collection("list").doc(requesterUid));
    batch.delete(db.collection("friends").doc(requesterUid).collection("list").doc(req.auth.uid));
  }
  await batch.commit();
  return { success:true };
});
