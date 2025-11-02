import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";
import { createNotification } from "../notify/_notify";

const Input = z.object({ teamId: z.string(), targetUid: z.string() });

export const teamInviteMember = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated","Login requerido.");
  const { teamId, targetUid } = Input.parse(req.data ?? {});
  const db = getFirestore();

  const teamRef = db.collection("teams").doc(teamId);
  const [team, actor, targetMember] = await Promise.all([
    teamRef.get(),
    teamRef.collection("members").doc(req.auth.uid).get(),
    teamRef.collection("members").doc(targetUid).get(),
  ]);
  if (!team.exists) throw new HttpsError("not-found","Equipo no existe.");
  if (!actor.exists || !["owner","manager"].includes(actor.get("roleInTeam")))
    throw new HttpsError("permission-denied","No autorizado.");
  if (targetMember.exists) throw new HttpsError("failed-precondition","El usuario ya está en el equipo.");

  // crear/actualizar invite
  await teamRef.collection("invites").doc(targetUid).set({
    status: "pending",
    by: req.auth.uid,
    createdAt: Date.now(),
    ttlAt: Date.now() + 7*24*3600*1000, // vence en 7 días
  }, { merge: true });

  await createNotification(targetUid, req.auth.uid, "TEAM_INVITE", {
    teamId, teamName: team.get("name"), slug: team.get("slug")
  });

  return { success: true };
});
