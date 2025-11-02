import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

const Input = z.object({
  teamId: z.string(),
  targetUid: z.string(),
  gameRoles: z.array(z.string()).max(3)
});

export const teamSetMemberGameRoles = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const d = Input.parse(req.data ?? {});
  const db = getFirestore();
  const teamRef = db.collection("teams").doc(d.teamId);

  const actorDoc = await teamRef.collection("members").doc(req.auth.uid).get();
  if (!actorDoc.exists) throw new HttpsError("permission-denied", "No perteneces al equipo.");

  // manager/owner pueden editar a cualquiera; un jugador puede editarse a sí mismo
  const actorRole = actorDoc.get("roleInTeam");
  const canEditOthers = ["owner", "manager"].includes(actorRole);
  if (!canEditOthers && req.auth.uid !== d.targetUid)
    throw new HttpsError("permission-denied", "No autorizado.");

  await teamRef.collection("members").doc(d.targetUid).set({ gameRoles: d.gameRoles }, { merge: true });
  return { success: true };
});
