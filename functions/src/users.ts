// functions/src/users.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}
function assertStaff(req: any) {
  const role = (req.auth?.token as any)?.role;
  if (role !== 'admin' && role !== 'moderator') {
    throw new HttpsError('permission-denied', 'Admin/Moderator only.');
  }
}

const UpdateRoleSchema = z.object({
  uid: z.string().min(1),
  // Aceptamos cualquier string no vacío por compatibilidad con tu tipo UserRole del front
  role: z.string().min(1),
});

const UpdateStatusSchema = z.object({
  uid: z.string().min(1),
  disabled: z.boolean(),
  // horas opcionales
  duration: z.number().int().positive().optional(),
});

const UpdateCertificationSchema = z.object({
  uid: z.string().min(1),
  isCertified: z.boolean(),
});

// Estados de presencia comunes; si prefieres más flexibilidad, cámbialo por z.string().min(1)
const PresenceSchema = z.object({
  status: z.enum(['online', 'offline', 'busy', 'away', 'in_game']),
});

/**
 * Actualiza el rol del usuario (Auth custom claims + espejo en /users)
 */
export const updateUserRole = onCall({ region: 'europe-west1' }, async (req) => {
  assertAuth(req);
  assertStaff(req);

  const { uid, role } = UpdateRoleSchema.parse(req.data ?? {});

  // 1) Custom claims
  const user = await admin.auth().getUser(uid);
  const existing = user.customClaims ?? {};
  await admin.auth().setCustomUserClaims(uid, { ...existing, role });

  // 2) Espejo en Firestore
  const uRef = db.doc(`users/${uid}`);
  await uRef.set(
    {
      role,
      customClaims: { ...(existing as any), role },
      _claimsRefreshedAt: now(),
      updatedAt: now(),
    },
    { merge: true }
  );

  return { success: true, message: 'User role updated.' };
});

/**
 * Deshabilita/Habilita usuario en Auth y marca banUntil (si duration)
 */
export const updateUserStatus = onCall({ region: 'europe-west1' }, async (req) => {
  assertAuth(req);
  assertStaff(req);

  const { uid, disabled, duration } = UpdateStatusSchema.parse(req.data ?? {});
  await admin.auth().updateUser(uid, { disabled });

  const uRef = db.doc(`users/${uid}`);
  const updates: Record<string, any> = { updatedAt: now(), disabled };

  if (disabled && duration) {
    const until = new Date(Date.now() + duration * 60 * 60 * 1000);
    updates.banUntil = admin.firestore.Timestamp.fromDate(until);
  } else if (!disabled) {
    updates.banUntil = null;
  }

  await uRef.set(updates, { merge: true });
  return { success: true, message: `User ${disabled ? 'disabled' : 'enabled'}.` };
});

/**
 * Marca/Desmarca al usuario como streamer certificado
 */
export const updateUserCertification = onCall({ region: 'europe-west1' }, async (req) => {
  assertAuth(req);
  assertStaff(req);

  const { uid, isCertified } = UpdateCertificationSchema.parse(req.data ?? {});
  const user = await admin.auth().getUser(uid);
  const existing = user.customClaims ?? {};
  await admin.auth().setCustomUserClaims(uid, { ...existing, isCertifiedStreamer: isCertified });

  const uRef = db.doc(`users/${uid}`);
  await uRef.set(
    {
      isCertifiedStreamer: isCertified,
      customClaims: { ...(existing as any), isCertifiedStreamer: isCertified },
      _claimsRefreshedAt: now(),
      updatedAt: now(),
    },
    { merge: true }
  );

  return { success: true, message: 'User certification updated.' };
});

/**
 * Actualiza presencia del usuario autenticado
 * Front: updateUserPresence({ status })
 */
export const updateUserPresence = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { status } = PresenceSchema.parse(req.data ?? {});

  const uRef = db.doc(`users/${uid}`);
  await uRef.set(
    {
      presence: {
        status,
        lastActiveAt: now(),
      },
      updatedAt: now(),
    },
    { merge: true }
  );

  return { success: true, message: 'Presence updated.' };
});
