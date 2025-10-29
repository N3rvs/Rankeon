"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPresence = exports.updateUserCertification = exports.updateUserStatus = exports.updateUserRole = void 0;
// functions/src/users.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
function assertAuth(ctx) {
    if (!ctx.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
function assertStaff(req) {
    const role = req.auth?.token?.role;
    if (role !== 'admin' && role !== 'moderator') {
        throw new https_1.HttpsError('permission-denied', 'Admin/Moderator only.');
    }
}
const UpdateRoleSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    // Aceptamos cualquier string no vacío por compatibilidad con tu tipo UserRole del front
    role: zod_1.z.string().min(1),
});
const UpdateStatusSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    disabled: zod_1.z.boolean(),
    // horas opcionales
    duration: zod_1.z.number().int().positive().optional(),
});
const UpdateCertificationSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    isCertified: zod_1.z.boolean(),
});
// Estados de presencia comunes; si prefieres más flexibilidad, cámbialo por z.string().min(1)
const PresenceSchema = zod_1.z.object({
    status: zod_1.z.enum(['online', 'offline', 'busy', 'away', 'in_game']),
});
/**
 * Actualiza el rol del usuario (Auth custom claims + espejo en /users)
 */
exports.updateUserRole = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    assertAuth(req);
    assertStaff(req);
    const { uid, role } = UpdateRoleSchema.parse(req.data ?? {});
    // 1) Custom claims
    const user = await admin.auth().getUser(uid);
    const existing = user.customClaims ?? {};
    await admin.auth().setCustomUserClaims(uid, { ...existing, role });
    // 2) Espejo en Firestore
    const uRef = db.doc(`users/${uid}`);
    await uRef.set({
        role,
        customClaims: { ...existing, role },
        _claimsRefreshedAt: now(),
        updatedAt: now(),
    }, { merge: true });
    return { success: true, message: 'User role updated.' };
});
/**
 * Deshabilita/Habilita usuario en Auth y marca banUntil (si duration)
 */
exports.updateUserStatus = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    assertAuth(req);
    assertStaff(req);
    const { uid, disabled, duration } = UpdateStatusSchema.parse(req.data ?? {});
    await admin.auth().updateUser(uid, { disabled });
    const uRef = db.doc(`users/${uid}`);
    const updates = { updatedAt: now(), disabled };
    if (disabled && duration) {
        const until = new Date(Date.now() + duration * 60 * 60 * 1000);
        updates.banUntil = admin.firestore.Timestamp.fromDate(until);
    }
    else if (!disabled) {
        updates.banUntil = null;
    }
    await uRef.set(updates, { merge: true });
    return { success: true, message: `User ${disabled ? 'disabled' : 'enabled'}.` };
});
/**
 * Marca/Desmarca al usuario como streamer certificado
 */
exports.updateUserCertification = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    assertAuth(req);
    assertStaff(req);
    const { uid, isCertified } = UpdateCertificationSchema.parse(req.data ?? {});
    const user = await admin.auth().getUser(uid);
    const existing = user.customClaims ?? {};
    await admin.auth().setCustomUserClaims(uid, { ...existing, isCertifiedStreamer: isCertified });
    const uRef = db.doc(`users/${uid}`);
    await uRef.set({
        isCertifiedStreamer: isCertified,
        customClaims: { ...existing, isCertifiedStreamer: isCertified },
        _claimsRefreshedAt: now(),
        updatedAt: now(),
    }, { merge: true });
    return { success: true, message: 'User certification updated.' };
});
/**
 * Actualiza presencia del usuario autenticado
 * Front: updateUserPresence({ status })
 */
exports.updateUserPresence = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { status } = PresenceSchema.parse(req.data ?? {});
    const uRef = db.doc(`users/${uid}`);
    await uRef.set({
        presence: {
            status,
            lastActiveAt: now(),
        },
        updatedAt: now(),
    }, { merge: true });
    return { success: true, message: 'Presence updated.' };
});
//# sourceMappingURL=users.js.map