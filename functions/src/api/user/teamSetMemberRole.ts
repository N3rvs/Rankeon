import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../admin";

const Input = z.object({
  teamId: z.string(),
  targetUid: z.string(),
  roleInTeam: z.enum(["manager", "player"]) // "owner" se gestiona con transferencia aparte
});

export const teamSetMemberRole = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const d = Input.parse(req.data ?? {});

  const db = getFirestore();
  const teamRef = db.collection("teams").doc(d.teamId);
  const [teamDoc, actorDoc, targetDoc] = await Promise.all([
    teamRef.get(),
    teamRef.collection("members").doc(req.auth.uid).get(),
    teamRef.collection("members").doc(d.targetUid).get(),
  ]);

  if (!teamDoc.exists) throw new HttpsError("not-found", "Equipo no existe.");
  if (!actorDoc.exists || !["owner", "manager"].includes(actorDoc.get("roleInTeam")))
    throw new HttpsError("permission-denied", "No autorizado.");
  if (!targetDoc.exists) throw new HttpsError("not-found", "Miembro no existe.");

  // Solo OWNER del equipo puede tocar managers (promover o degradar)
  const isTeamOwner = teamDoc.get("ownerUid") === req.auth.uid;
  if (d.roleInTeam === "manager" || targetDoc.get("roleInTeam") === "manager") {
    if (!isTeamOwner) throw new HttpsError("permission-denied", "Solo el owner del equipo puede cambiar managers.");
  }

  await teamRef.collection("members").doc(d.targetUid).set({ roleInTeam: d.roleInTeam }, { merge: true });
  return { success: true };
});
