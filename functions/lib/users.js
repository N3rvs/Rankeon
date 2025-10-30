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
exports.updateUserCertification = exports.updateUserStatus = exports.updateUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const auth = admin.auth();
const VALID_ROLES = ['admin', 'moderator', 'player', 'founder', 'coach'];
const checkAdmin = (auth) => {
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'This action requires administrator privileges.');
    }
};
const checkModOrAdmin = (auth) => {
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new https_1.HttpsError('permission-denied', 'This action requires moderator or administrator privileges.');
    }
};
exports.updateUserRole = (0, https_1.onCall)(async ({ auth: callerAuth, data }) => {
    checkAdmin(callerAuth);
    const { uid, role } = data;
    if (!uid || !role || !VALID_ROLES.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid arguments provided.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        // Step 1: Set the secure custom claim. This is the source of truth.
        await auth.setCustomUserClaims(uid, { ...existingClaims, role });
        // Step 2: Update the denormalized role in Firestore for client display.
        await db.collection('users').doc(uid).set({ role }, { merge: true });
        return { success: true, message: `Role "${role}" assigned to user ${uid}` };
    }
    catch (error) {
        console.error('Error updating role:', error);
        throw new https_1.HttpsError('internal', `Failed to update role: ${error.message}`);
    }
});
exports.updateUserStatus = (0, https_1.onCall)(async ({ auth: callerAuth, data }) => {
    checkModOrAdmin(callerAuth);
    const { uid, disabled, duration } = data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User ID is required.');
    }
    if (callerAuth.uid === uid) {
        throw new https_1.HttpsError('failed-precondition', 'You cannot change your own status.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const targetClaims = userToUpdate.customClaims || {};
        const targetRole = targetClaims.role;
        const callerRole = callerAuth.token.role;
        // Rule: Moderators can't ban other moderators or admins.
        if (callerRole === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
            throw new https_1.HttpsError('permission-denied', 'Moderators cannot ban other moderators or admins.');
        }
        const userDocRef = db.collection('users').doc(uid);
        let banUntil = null;
        if (disabled && duration) {
            // Temporary ban
            const now = admin.firestore.Timestamp.now();
            banUntil = admin.firestore.Timestamp.fromMillis(now.toMillis() + duration * 60 * 60 * 1000);
        }
        // Update Auth
        await auth.updateUser(uid, { disabled });
        // Update Firestore
        if (disabled) { // Banning
            await userDocRef.update({
                disabled,
                banUntil: banUntil // Will be null for permanent, or a timestamp for temporary
            });
        }
        else { // Unbanning
            await userDocRef.update({
                disabled,
                banUntil: admin.firestore.FieldValue.delete()
            });
        }
        const action = disabled ? (duration ? 'temporarily banned' : 'banned') : 'unbanned';
        return { success: true, message: `User ${action} successfully.` };
    }
    catch (error) {
        console.error('Error updating user status:', error);
        throw new https_1.HttpsError('internal', `Failed to update user status: ${error.message}`);
    }
});
exports.updateUserCertification = (0, https_1.onCall)(async ({ auth: callerAuth, data }) => {
    checkModOrAdmin(callerAuth);
    const { uid, isCertified } = data;
    if (!uid) {
        throw new https_1.HttpsError('invalid-argument', 'User ID is required.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        // Step 1: Set the secure custom claim.
        await auth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
        // Step 2: Update the denormalized field in Firestore for client display.
        await db.collection('users').doc(uid).update({ isCertifiedStreamer: isCertified });
        return { success: true, message: `User certification status updated successfully.` };
    }
    catch (error) {
        console.error('Error updating user certification:', error);
        throw new https_1.HttpsError('internal', `Failed to update certification: ${error.message}`);
    }
});
//# sourceMappingURL=users.js.map