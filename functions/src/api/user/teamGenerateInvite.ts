import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

function code8() { return Math.random().toString(36).slice(2, 10); }

export const teamGenerateInvite = onCall({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  const { teamId } = (req.data ?? {}) as { teamId?: string };
  if (!teamId) throw new HttpsError("invalid-argument", "teamId requerido.");

  const db = getFirestore();
  const teamRef = db.collection("teams").doc(teamId);
  const [teamDoc, actorDoc] = await Promise.all([
    teamRef.get(),
    teamRef.collection("members").doc(req.auth.uid).get(),
  ]);

  if (!teamDoc.exists) throw new HttpsError("not-found", "Equipo no existe.");
  if (!actorDoc.exists || !["owner", "manager"].includes(actorDoc.get("roleInTeam")))
    throw new HttpsError("permission-denied", "No autorizado.");

  const code = code8();
  await teamRef.set({ inviteCode: code, inviteAt: Date.now() }, { merge: true });
  return { success: true, code };
});
