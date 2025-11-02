import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

export const friendRequestSend = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { targetUid } = (req.data ?? {}) as { targetUid?: string };
  if(!targetUid) throw new HttpsError("invalid-argument","targetUid requerido.");
  if(targetUid === req.auth.uid) throw new HttpsError("failed-precondition","No puedes auto-agregarte.");

  const db = getFirestore();
  // bloqueos
  const blockA = await db.collection("blocks").doc(targetUid).collection("list").doc(req.auth.uid).get();
  if(blockA.exists) throw new HttpsError("permission-denied","El usuario te bloqueó.");

  // ya son amigos?
  const [a, b] = await Promise.all([
    db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).get(),
    db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).get(),
  ]);
  
  const yaAmigos =
    (a.exists && a.get("status") === "accepted") ||
    (b.exists && b.get("status") === "accepted");
  
  if (yaAmigos) return { success: true, message: "Ya son amigos." };
  

  const now = Date.now();
  await Promise.all([
    db.collection("friends").doc(req.auth.uid).collection("list").doc(targetUid).set({ status:"pending", createdAt: now }, { merge:true }),
    db.collection("friends").doc(targetUid).collection("list").doc(req.auth.uid).set({ status:"pending", createdAt: now }, { merge:true }),
  ]);
  return { success:true };
});
