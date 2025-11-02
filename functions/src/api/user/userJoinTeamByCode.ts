// functions/src/api/user/userJoinTeamByCode.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import "../../lib/admin";
import { defaultOpts } from "../_options"; // mismo archivo de opciones que usas en /api/user

const db = getFirestore();

const Input = z.object({
  code: z.string().trim().min(6).max(32),
});

// /**
//  * Estructura esperada (recomendada):
//  * teamInvites/{code} -> {
//  *   teamId: string,
//  *   createdBy: string,
//  *   createdAt: Timestamp,
//  *   expiresAt?: Timestamp | null,
//  *   maxUses?: number | null,
//  *   usedCount?: number,
//  *   disabled?: boolean
//  * }
//  *
//  * teams/{teamId}
//  * teams/{teamId}/members/{uid} -> { role: "player" | "coach" | "founder", gameRoles?: string[], joinedAt: Timestamp }
//  * users/{uid} -> (opcional) currentTeamId
//  */
export const userJoinTeamByCode = onCall(defaultOpts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const uid = req.auth.uid;
  const { code } = Input.parse(req.data ?? {});

  const inviteRef = db.doc(`teamInvites/${code}`);

  await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(inviteRef);
    if (!invSnap.exists) {
      throw new HttpsError("not-found", "El código de invitación no es válido.");
    }

    const inv = invSnap.data() as any;
    const teamId: string | undefined = inv.teamId;
    if (!teamId) throw new HttpsError("failed-precondition", "Invitación corrupta (sin teamId).");

    if (inv.disabled) {
      throw new HttpsError("failed-precondition", "Esta invitación está deshabilitada.");
    }

    if (inv.expiresAt?.toMillis && inv.expiresAt.toMillis() < Date.now()) {
      throw new HttpsError("failed-precondition", "Esta invitación ha expirado.");
    }

    // límite de usos si existe
    const maxUses: number | null = Number.isFinite(inv.maxUses) ? Number(inv.maxUses) : null;
    const usedCount: number = Number(inv.usedCount ?? 0);
    if (maxUses !== null && usedCount >= maxUses) {
      throw new HttpsError("failed-precondition", "Esta invitación ya no tiene usos disponibles.");
    }

    // Info del equipo
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "El equipo de la invitación no existe.");
    }
    const team = teamSnap.data() as any;

    // capacidad opcional del equipo
    const maxMembers: number | null = Number.isFinite(team?.maxMembers) ? Number(team.maxMembers) : null;
    // contador aproximado (mejor si mantienes membersCount)
    // si no tienes membersCount, puedes contar rápido con limit (no exacto si muy grande)
    const membersCount: number = Number(team?.membersCount ?? 0);

    if (maxMembers !== null && membersCount >= maxMembers) {
      throw new HttpsError("failed-precondition", "El equipo está completo.");
    }

    const memberRef = teamRef.collection("members").doc(uid);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists) {
      // Ya es miembro -> idempotente OK
      return;
    }

    // Crea la membresía básica
    tx.set(memberRef, {
      role: "player",
      joinedAt: FieldValue.serverTimestamp(),
    });

    // Actualiza contadores del team si los manejas
    tx.set(
      teamRef,
      {
        membersCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Marca uso de la invitación
    tx.set(
      inviteRef,
      {
        usedCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
        // si al llegar al máximo quieres auto-desactivar:
        ...(maxUses !== null && usedCount + 1 >= maxUses ? { disabled: true } : null),
      } as any,
      { merge: true }
    );

    // (Opcional) guarda referencia en el perfil del usuario
    const userRef = db.doc(`users/${uid}`);
    tx.set(
      userRef,
      {
        currentTeamId: teamId,
        lastJoinedTeamAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { success: true, message: "Te uniste al equipo con éxito." };
});
