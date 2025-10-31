import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import "../../lib/admin";

const ChallengeSchema = z.object({
  scrimId: z.string().min(1),
  challengingTeamId: z.string().min(1),
  clientId: z.string().min(8).max(64).optional(),
});
type Data = z.infer<typeof ChallengeSchema>;

export const scrimsChallenge = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    const uid = req.auth.uid;

    const { scrimId, challengingTeamId, clientId }: Data =
      ChallengeSchema.parse(req.data ?? {});

    const db = getFirestore();
    const scrimRef = db.doc(`scrims/${scrimId}`);
    const idempRef = clientId ? db.doc(`idempotency/${uid}_challenge_${clientId}`) : null;

    await db.runTransaction(async (tx) => {
      if (idempRef) {
        const idem = await tx.get(idempRef);
        if (idem.exists) return;
      }

      const sSnap = await tx.get(scrimRef);
      if (!sSnap.exists) throw new HttpsError("not-found", "Scrim no encontrada.");
      const scrim = sSnap.data() as any;

      const status = (scrim.status as string) ?? "open";
      if (status !== "open") {
        throw new HttpsError("failed-precondition", `La scrim no está abierta (status: ${status}).`);
      }

      if (scrim.teamId && scrim.teamId === challengingTeamId) {
        throw new HttpsError("failed-precondition", "No puedes desafiar tu propia scrim.");
      }

      const memberRef = db.doc(`teams/${challengingTeamId}/members/${uid}`);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) {
        const flat = await db
          .collection("teamMembers")
          .where("teamId", "==", challengingTeamId)
          .where("uid", "==", uid)
          .limit(1)
          .get();
        if (flat.empty) throw new HttpsError("permission-denied", "No perteneces al equipo desafiador.");
      }

      if (sSnap.get("status") === "challenged" || sSnap.get("challengerTeamId")) {
        throw new HttpsError("already-exists", "La scrim ya fue desafiada.");
      }

      tx.update(scrimRef, {
        status: "challenged",
        challengerTeamId: challengingTeamId,
        challengedBy: uid,
        challengedAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (idempRef) {
        tx.set(idempRef, { at: Date.now(), type: "challenge_scrim", scrimId, challengingTeamId });
      }
    });

    return { success: true, message: "Scrim desafiada correctamente." };
  }
);
