import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import "../../lib/admin";


const OWNER_UID = process.env.OWNER_UID ?? "OWNER_UID_GOES_HERE";

const Input = z.object({
  uid: z.string().min(1),
  disabled: z.boolean(),            // true = banear, false = desbanear
  duration: z.number().int().positive().max(24 * 365).optional(), // horas (opcional; si falta => ban permanente)
  reason: z.string().max(300).optional()
});

type Role = "owner" | "admin" | "moderator" | "founder" | "coach" | "player";

function assertAuth(req: any) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login requerido.");
  return req.auth.uid as string;
}
function getCallerRole(req: any): Role {
  return ((req.auth?.token as any)?.role ?? "player") as Role;
}
function isStaff(role: Role) {
  return role === "owner" || role === "admin" || role === "moderator";
}

export const adminUpdateUserStatus = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const callerUid = assertAuth(req);
    const callerRole = getCallerRole(req);

    const { uid: targetUid, disabled, duration, reason } = Input.parse(req.data ?? {});
    const auth = getAuth();
    const db = getFirestore();

    if (callerUid === targetUid) {
      throw new HttpsError("failed-precondition", "No puedes cambiar tu propio estado.");
    }

    // Lee claims de ambos
    const [ targetUser] = await Promise.all([
      auth.getUser(callerUid),
      auth.getUser(targetUid),
    ]);
    const targetRole = ((targetUser.customClaims?.role as Role) ?? "player") as Role;

    // Reglas de poder:
    // - OWNER nunca puede ser baneado.
    // - Solo OWNER o ADMIN pueden banear a ADMIN/MOD.
    // - MODERADOR no puede banear a ADMIN/MOD.
    if (targetUid === OWNER_UID) {
      throw new HttpsError("permission-denied", "No puedes banear al owner.");
    }
    if (callerRole === "moderator" && isStaff(targetRole)) {
      throw new HttpsError("permission-denied", "Un moderador no puede banear a admin/mod.");
    }
    if (callerRole !== "owner" && callerRole !== "admin" && disabled) {
      throw new HttpsError("permission-denied", "Solo admin/owner pueden banear.");
    }

    // Calcula banUntil (en ms epoch) si es temporal
    const now = Date.now();
    const banUntil = disabled && duration ? now + duration * 60 * 60 * 1000 : null;

    // Actualiza Auth y Firestore
    await auth.updateUser(targetUid, { disabled });

    const userRef = db.collection("users").doc(targetUid);
    const updates: Record<string, any> = {
      disabled,
      _moderationUpdatedAt: now,
    };
    if (disabled) {
      updates.banUntil = banUntil ?? null;   // null => permanente
      updates.banReason = reason ?? null;
      updates.bannedBy = callerUid;
    } else {
      updates.banUntil = FieldValue.delete();
      updates.banReason = FieldValue.delete();
      updates.bannedBy = FieldValue.delete();
    }
    await userRef.set(updates, { merge: true });

    // Log de auditoría (opcional)
    await db.collection("adminLogs").add({
      type: "user_status",
      targetUid,
      action: disabled ? "ban" : "unban",
      by: callerUid,
      reason: reason ?? null,
      durationHours: disabled ? (duration ?? null) : null,
      at: now,
    });

    const action = disabled ? (duration ? `baneado por ${duration}h` : "baneado permanentemente") : "desbaneado";
    return { success: true, message: `Usuario ${action}.`, banUntil };
  }
);
