// functions/src/api/user/teamInviteRespond.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { createNotification } from "../notify/_notify";

const Input = z.object({ teamId: z.string(), accept: z.boolean() });

export const teamInviteRespond = onCall({ region:"europe-west1", enforceAppCheck:true }, async (req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { teamId, accept } = Input.parse(req.data ?? {});
  const db = getFirestore();
  const teamRef = db.collection("teams").doc(teamId);

  const [team, invite] = await Promise.all([
    teamRef.get(),
    teamRef.collection("invites").doc(req.auth.uid).get(),
  ]);
  if(!team.exists) throw new HttpsError("not-found","Equipo no existe.");
  if(!invite.exists || invite.get("status")!=="pending")
    throw new HttpsError("failed-precondition","No hay invitación vigente.");

  if (!accept) {
    await invite.ref.set({ status: "rejected", respondedAt: Date.now() }, { merge: true });
    // avisar a owner/manager que invitó
    const by = invite.get("by") as string;
    await createNotification(by, req.auth.uid, "TEAM_INVITE_REJECTED", { teamId, teamName: team.get("name") });
    return { success: true };
  }

  // aceptar → agregar miembro
  await db.runTransaction(async (tx) => {
    tx.set(teamRef.collection("members").doc(req.auth!.uid), {
      uid: req.auth!.uid, roleInTeam: "player", gameRoles: [], joinedAt: Date.now(),
    }, { merge: true });
    tx.set(teamRef, { memberCount: (team.get("memberCount") ?? 0) + 1 }, { merge: true });
    tx.set(invite.ref, { status: "accepted", respondedAt: Date.now() }, { merge: true });
  });

  // notificar a quien invitó
  const by = invite.get("by") as string;
  await createNotification(by, req.auth.uid, "TEAM_INVITE_ACCEPTED", {
    teamId, teamName: team.get("name")
  });

  return { success: true, teamPath: `/teams/${team.get("slug")}` };
});
