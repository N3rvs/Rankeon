"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateUserStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../../lib/admin");
const OWNER_UID = process.env.OWNER_UID ?? "OWNER_UID_GOES_HERE";
const Input = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    disabled: zod_1.z.boolean(), // true = banear, false = desbanear
    duration: zod_1.z.number().int().positive().max(24 * 365).optional(), // horas (opcional; si falta => ban permanente)
    reason: zod_1.z.string().max(300).optional()
});
function assertAuth(req) {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    return req.auth.uid;
}
function getCallerRole(req) {
    return (req.auth?.token?.role ?? "player");
}
function isStaff(role) {
    return role === "owner" || role === "admin" || role === "moderator";
}
exports.adminUpdateUserStatus = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const callerUid = assertAuth(req);
    const callerRole = getCallerRole(req);
    const { uid: targetUid, disabled, duration, reason } = Input.parse(req.data ?? {});
    const auth = (0, auth_1.getAuth)();
    const db = (0, firestore_1.getFirestore)();
    if (callerUid === targetUid) {
        throw new https_1.HttpsError("failed-precondition", "No puedes cambiar tu propio estado.");
    }
    // Lee claims de ambos
    const [targetUser] = await Promise.all([
        auth.getUser(callerUid),
        auth.getUser(targetUid),
    ]);
    const targetRole = (targetUser.customClaims?.role ?? "player");
    // Reglas de poder:
    // - OWNER nunca puede ser baneado.
    // - Solo OWNER o ADMIN pueden banear a ADMIN/MOD.
    // - MODERADOR no puede banear a ADMIN/MOD.
    if (targetUid === OWNER_UID) {
        throw new https_1.HttpsError("permission-denied", "No puedes banear al owner.");
    }
    if (callerRole === "moderator" && isStaff(targetRole)) {
        throw new https_1.HttpsError("permission-denied", "Un moderador no puede banear a admin/mod.");
    }
    if (callerRole !== "owner" && callerRole !== "admin" && disabled) {
        throw new https_1.HttpsError("permission-denied", "Solo admin/owner pueden banear.");
    }
    // Calcula banUntil (en ms epoch) si es temporal
    const now = Date.now();
    const banUntil = disabled && duration ? now + duration * 60 * 60 * 1000 : null;
    // Actualiza Auth y Firestore
    await auth.updateUser(targetUid, { disabled });
    const userRef = db.collection("users").doc(targetUid);
    const updates = {
        disabled,
        _moderationUpdatedAt: now,
    };
    if (disabled) {
        updates.banUntil = banUntil ?? null; // null => permanente
        updates.banReason = reason ?? null;
        updates.bannedBy = callerUid;
    }
    else {
        updates.banUntil = firestore_1.FieldValue.delete();
        updates.banReason = firestore_1.FieldValue.delete();
        updates.bannedBy = firestore_1.FieldValue.delete();
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
});
//# sourceMappingURL=adminUpdateUserStatus.js.map