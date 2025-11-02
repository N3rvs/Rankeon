import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";


export const userDeleteTeam = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const { teamId } = (req.data ?? {}) as { teamId?: string };
  if (!teamId) throw new HttpsError("invalid-argument", "teamId requerido.");

  const db = getFirestore();
  const teamRef = db.collection("teams").doc(teamId);
  const team = await teamRef.get();
  if (!team.exists) throw new HttpsError("not-found", "Equipo no existe.");

  const data = team.data()!;
  const isTeamOwner = data.ownerUid === req.auth.uid;
  const isGlobalOwner = req.auth.token?.role === "owner";

  if (!(isTeamOwner || isGlobalOwner)) throw new HttpsError("permission-denied", "No autorizado.");

  const batch = db.batch();
  batch.delete(db.collection("team_slugs").doc(data.slug));
  batch.delete(teamRef);
  await batch.commit();

  return { success: true };
});
