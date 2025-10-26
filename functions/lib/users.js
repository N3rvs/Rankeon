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
// src/functions/users.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const auth = admin.auth();
const VALID_ROLES = ['admin', 'moderator', 'player', 'founder', 'coach'];
// *** CORRECCIÓN: Añadido 'busy' a la lista de validación ***
const VALID_STATUSES = ['available', 'away', 'offline', 'busy'];
// --- Helpers de Permisos ---
const checkAdmin = (callerAuth) => {
    if (!callerAuth || callerAuth.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'This action requires administrator privileges.');
    }
};
const checkModOrAdmin = (callerAuth) => {
    if (!callerAuth || (callerAuth.role !== 'admin' && callerAuth.role !== 'moderator')) {
        throw new https_1.HttpsError('permission-denied', 'This action requires moderator or administrator privileges.');
    }
};
// --- FUNCIONES (Región añadida a onCall) ---
exports.updateUserRole = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    var _a, _b;
    checkAdmin((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token);
    const { uid, role } = request.data;
    if (!uid || !role || !VALID_ROLES.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid arguments provided (uid, role).');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        if (existingClaims.role === 'admin' && ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.token.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Cannot change the role of another admin.');
        }
        // 1. Set claim
        await auth.setCustomUserClaims(uid, Object.assign(Object.assign({}, existingClaims), { role }));
        // 2. Update Firestore (con _claimsRefreshedAt)
        await db.collection('users').doc(uid).set({
            role,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp() // <-- BUENA PRÁCTICA AÑADIDA
        }, { merge: true });
        return { success: true, message: `Role "${role}" assigned to user ${uid}` };
    }
    catch (error) {
        console.error(`Error updating role for user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || `Failed to update role.`);
    }
});
exports.updateUserStatus = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    var _a, _b;
    checkModOrAdmin((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token);
    const { uid, disabled, duration } = request.data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User ID (uid) is required.');
    }
    if (typeof disabled !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'Disabled status must be true or false.');
    }
    if (((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) === uid) { // Comprobación segura
        throw new https_1.HttpsError('failed-precondition', 'You cannot change your own status.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const targetClaims = userToUpdate.customClaims || {};
        const targetRole = targetClaims.role;
        const callerRole = request.auth.token.role; // Sabemos que token existe por checkModOrAdmin
        if (callerRole === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
            throw new https_1.HttpsError('permission-denied', 'Moderators cannot ban other moderators or admins.');
        }
        const userDocRef = db.collection('users').doc(uid);
        let banUntil = null;
        const claimsRefreshTime = admin.firestore.FieldValue.serverTimestamp();
        if (disabled && duration && duration > 0) {
            const now = admin.firestore.Timestamp.now();
            banUntil = admin.firestore.Timestamp.fromMillis(now.toMillis() + duration * 60 * 60 * 1000);
        }
        // Update Auth
        await auth.updateUser(uid, { disabled });
        // Update Firestore
        if (disabled) { // Banning
            await userDocRef.update({
                disabled,
                banUntil: banUntil,
                _claimsRefreshedAt: claimsRefreshTime // <-- Correcto
            });
        }
        else { // Unbanning
            await userDocRef.update({
                disabled,
                banUntil: admin.firestore.FieldValue.delete(),
                _claimsRefreshedAt: claimsRefreshTime // <-- Correcto
            });
        }
        const action = disabled ? (duration ? 'temporarily banned' : 'banned') : 'unbanned';
        return { success: true, message: `User ${action} successfully.` };
    }
    catch (error) {
        console.error(`Error updating status for user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || `Failed to update user status.`);
    }
});
exports.updateUserCertification = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    var _a;
    checkModOrAdmin((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token);
    const { uid, isCertified } = request.data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User ID is required.');
    }
    if (typeof isCertified !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'Certification status must be true or false.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        // 1. Set claim
        await auth.setCustomUserClaims(uid, Object.assign(Object.assign({}, existingClaims), { isCertifiedStreamer: isCertified }));
        // 2. Update Firestore (con _claimsRefreshedAt)
        await db.collection('users').doc(uid).update({
            isCertifiedStreamer: isCertified,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp() // <-- BUENA PRÁCTICA AÑADIDA
        });
        return { success: true, message: `User certification status updated successfully.` };
    }
    catch (error) {
        console.error(`Error updating certification for user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || `Failed to update certification.`);
    }
});
// *** FUNCIÓN DE PRESENCIA (Añadida) ***
exports.updateUserPresence = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    // 1. Autenticación y Validación
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión para actualizar tu estado.');
    }
    const uid = request.auth.uid;
    const { status } = request.data;
    // *** Validación actualizada para incluir 'busy' ***
    if (!status || !VALID_STATUSES.includes(status)) {
        throw new https_1.HttpsError('invalid-argument', `Se proporcionó un estado inválido: ${status}`);
    }
    const userRef = db.collection('users').doc(uid);
    try {
        // 2. Actualizar Firestore
        await userRef.update({
            status: status,
            lastSeen: admin.firestore.FieldValue.serverTimestamp() // Guarda la última vez que se actualizó
        });
        return { success: true, message: `Estado actualizado a "${status}".` };
    }
    catch (error) {
        console.error(`Error al actualizar la presencia para el usuario ${uid}:`, error);
        if (error.code === 5) { // NOT_FOUND
            throw new https_1.HttpsError('not-found', 'No se encontró el perfil de usuario.');
        }
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Ocurrió un error inesperado.');
    }
});
//# sourceMappingURL=users.js.map