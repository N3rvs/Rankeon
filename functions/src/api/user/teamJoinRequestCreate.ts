import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../lib/admin";
import { createNotification } from "../notify/_notify";

const Input = z.object({ teamId: z.string() });

export const teamJoinRequestCreate = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { teamId } = Input.parse(req.data ?? {});
  const db = getFirestore();

  const teamRef = db.collection("teams").doc(teamId);
  const [team, existing, member] = await Promise.all([
    teamRef.get(),
    teamRef.collection("joinRequests").doc(req.auth.uid).get(),
    teamRef.collection("members").doc(req.auth.uid).get(),
  ]);
  if(!team.exists) throw new HttpsError("not-found","Equipo no existe.");
  if(member.exists) throw new HttpsError("failed-precondition","Ya perteneces al equipo.");
  if(existing.exists && existing.get("status")==="pending")
    return { success: true }; // idempotente

  await teamRef.collection("joinRequests").doc(req.auth.uid).set({
    status: "pending",
    by: req.auth.uid,
    createdAt: Date.now(),
    ttlAt: Date.now() + 7*24*3600*1000,
  }, { merge: true });

  // notificar a owner (y opcional: managers)
  const ownerUid = team.get("ownerUid") as string;
  await createNotification(ownerUid, req.auth.uid, "TEAM_JOIN_REQUEST", {
    teamId, teamName: team.get("name")
  });

  return { success: true };
});
