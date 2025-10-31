import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../lib/admin";

export const dmGetOrCreate = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { targetUid } = (req.data ?? {}) as { targetUid?: string };
  if(!targetUid) throw new HttpsError("invalid-argument","targetUid requerido.");
  if(targetUid === req.auth.uid) throw new HttpsError("failed-precondition","Conversación consigo mismo no permitida.");

  const db = getFirestore();
  // bloqueos mutuos
  const [a,b] = await Promise.all([
    db.collection("blocks").doc(req.auth.uid).collection("list").doc(targetUid).get(),
    db.collection("blocks").doc(targetUid).collection("list").doc(req.auth.uid).get(),
  ]);
  if(a.exists || b.exists) throw new HttpsError("permission-denied","No disponible por bloqueo.");

  // busca conv existente
  const exists = await db.collection("conversations")
    .where("members","array-contains", req.auth.uid).limit(25).get();

  const found = exists.docs.find(d => {
    const m = d.get("members") as string[]; 
    return m.length===2 && m.includes(targetUid);
  });
  if (found) return { convId: found.id };

  // crea conv
  const ref = await db.collection("conversations").add({
    members: [req.auth.uid, targetUid],
    createdAt: Date.now()
  });
  return { convId: ref.id };
});
