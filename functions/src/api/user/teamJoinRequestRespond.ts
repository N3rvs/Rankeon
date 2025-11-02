import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { createNotification } from "../notify/_notify";

const Input = z.object({ teamId: z.string(), targetUid: z.string(), accept: z.boolean() });

export const teamJoinRequestRespond = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { teamId, targetUid, accept } = Input.parse(req.data ?? {});
  const db = getFirestore();
  const teamRef = db.collection("teams").doc(teamId);

  const [team, actor, reqDoc] = await Promise.all([
    teamRef.get(),
    teamRef.collection("members").doc(req.auth.uid).get(),
    teamRef.collection("joinRequests").doc(targetUid).get(),
  ]);
  if(!team.exists) throw new HttpsError("not-found","Equipo no existe.");
  if(!actor.exists || !["owner","manager"].includes(actor.get("roleInTeam")))
    throw new HttpsError("permission-denied","No autorizado.");
  if(!reqDoc.exists || reqDoc.get("status")!=="pending")
    throw new HttpsError("failed-precondition","No hay solicitud vigente.");

  if (!accept) {
    await reqDoc.ref.set({ status: "rejected", respondedAt: Date.now(), respondedBy: req.auth.uid }, { merge: true });
    await createNotification(targetUid, req.auth.uid, "TEAM_JOIN_REJECTED", { teamId, teamName: team.get("name") });
    return { success: true };
  }

  await db.runTransaction(async (tx)=>{
    tx.set(teamRef.collection("members").doc(targetUid), {
      uid: targetUid, roleInTeam: "player", gameRoles: [], joinedAt: Date.now(),
    }, { merge: true });
    tx.set(teamRef, { memberCount: (team.get("memberCount") ?? 0) + 1 }, { merge: true });
    tx.set(reqDoc.ref, { status: "accepted", respondedAt: Date.now(), respondedBy: req.auth!.uid }, { merge: true });
  });

  await createNotification(targetUid, req.auth.uid, "TEAM_JOIN_ACCEPTED", { teamId, teamName: team.get("name") });
  return { success: true, teamPath: `/teams/${team.get("slug")}` };
});
