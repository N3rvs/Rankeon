import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

export const teamKickMember = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const { teamId, targetUid } = (req.data ?? {}) as { teamId?: string; targetUid?: string; };
  if (!teamId || !targetUid) throw new HttpsError("invalid-argument", "Datos requeridos.");

  const db = getFirestore();
  const teamRef = db.collection("teams").doc(teamId);
  const [teamDoc, actorDoc, targetDoc] = await Promise.all([
    teamRef.get(),
    teamRef.collection("members").doc(req.auth.uid).get(),
    teamRef.collection("members").doc(targetUid).get(),
  ]);

  if (!teamDoc.exists) throw new HttpsError("not-found", "Equipo no existe.");
  if (!actorDoc.exists || !["owner", "manager"].includes(actorDoc.get("roleInTeam")))
    throw new HttpsError("permission-denied", "No autorizado.");
  if (!targetDoc.exists) throw new HttpsError("not-found", "Miembro no existe.");
  if (targetDoc.get("roleInTeam") === "owner") throw new HttpsError("failed-precondition", "No puedes expulsar al owner.");

  await teamRef.collection("members").doc(targetUid).delete();
  const current = (teamDoc.get("memberCount") ?? 1) as number;
  await teamRef.set({ memberCount: Math.max(current - 1, 0) }, { merge: true });

  return { success: true };
});
