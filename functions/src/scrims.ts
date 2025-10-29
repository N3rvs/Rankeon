import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();

const ChallengeSchema = z.object({
  scrimId: z.string().min(1),
  challengingTeamId: z.string().min(1), // <- lo que llega desde el cliente
});

function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}

export const challengeScrim = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { scrimId, challengingTeamId } = ChallengeSchema.parse(req.data ?? {});

  const ref = db.doc(`scrims/${scrimId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Scrim not found');

    const scrim = snap.data() as any;

    // No permitir desafiar scrims canceladas o ya aceptadas
    if (scrim.status && scrim.status !== 'open') {
      throw new HttpsError('failed-precondition', `Scrim is not open (status: ${scrim.status})`);
    }

    // El creador original de la scrim no puede “desafiar” su propia scrim
    if (scrim.teamId === challengingTeamId) {
      throw new HttpsError('failed-precondition', 'You cannot challenge your own scrim.');
    }

    // (Opcional) comprueba que el usuario pertenece al equipo que desafía
    const membership = await db.collection('teamMembers')
      .where('teamId', '==', challengingTeamId)
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (membership.empty) {
      throw new HttpsError('permission-denied', 'You are not a member of the challenging team.');
    }

    // ✅ FIX: usar clave -> valor
    tx.update(ref, {
      status: 'challenged',
      challengerTeamId: challengingTeamId, // ← aquí el arreglo
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true, message: 'Scrim challenged successfully.' };
});
