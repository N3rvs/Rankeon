// src/functions/users.ts
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// --- Definiciones de Tipos ---
type UserRole = 'admin' | 'moderator' | 'player' | 'founder' | 'coach';
// *** CORRECCIÓN: Añadido 'busy' para el estado "Ocupado" ***
type UserStatus = 'available' | 'away' | 'offline' | 'busy';

const db = admin.firestore();
const auth = admin.auth();

const VALID_ROLES: UserRole[] = ['admin', 'moderator', 'player', 'founder', 'coach'];
// *** CORRECCIÓN: Añadido 'busy' a la lista de validación ***
const VALID_STATUSES: UserStatus[] = ['available', 'away', 'offline', 'busy'];

// --- Helpers de Permisos ---
const checkAdmin = (callerAuth: admin.auth.DecodedIdToken | undefined) => {
    if (!callerAuth || callerAuth.role !== 'admin') {
        throw new HttpsError('permission-denied', 'This action requires administrator privileges.');
    }
};

const checkModOrAdmin = (callerAuth: admin.auth.DecodedIdToken | undefined) => {
    if (!callerAuth || (callerAuth.role !== 'admin' && callerAuth.role !== 'moderator')) {
        throw new HttpsError('permission-denied', 'This action requires moderator or administrator privileges.');
    }
};

// --- Interfaces ---
interface UpdateRoleData {
    uid: string;
    role: UserRole;
}
interface UpdateStatusData {
    uid: string;
    disabled: boolean;
    duration?: number; // in hours
}
interface UpdatePresenceData {
  status: UserStatus;
}
interface UpdateCertificationData {
    uid: string;
    isCertified: boolean;
}

// --- FUNCIONES (Región añadida a onCall) ---

export const updateUserRole = onCall({ region: 'europe-west1' }, async (request: CallableRequest<UpdateRoleData>) => {
    checkAdmin(request.auth?.token);
    
    const { uid, role } = request.data;
    if (!uid || !role || !VALID_ROLES.includes(role)) {
        throw new HttpsError('invalid-argument', 'Invalid arguments provided (uid, role).');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};

        if (existingClaims.role === 'admin' && request.auth?.token.role !== 'admin') {
             throw new HttpsError('permission-denied', 'Cannot change the role of another admin.');
        }

        // 1. Set claim
        await auth.setCustomUserClaims(uid, { ...existingClaims, role });
        // 2. Update Firestore (con _claimsRefreshedAt)
        await db.collection('users').doc(uid).set({
            role,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp() // <-- BUENA PRÁCTICA AÑADIDA
        }, { merge: true });

        return { success: true, message: `Role "${role}" assigned to user ${uid}` };
    } catch (error: any) {
        console.error(`Error updating role for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || `Failed to update role.`);
    }
});

export const updateUserStatus = onCall({ region: 'europe-west1' }, async (request: CallableRequest<UpdateStatusData>) => {
    checkModOrAdmin(request.auth?.token);

    const { uid, disabled, duration } = request.data;
     if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID (uid) is required.');
    }
    if (typeof disabled !== 'boolean') {
         throw new HttpsError('invalid-argument', 'Disabled status must be true or false.');
    }
    if (request.auth?.uid === uid) { // Comprobación segura
        throw new HttpsError('failed-precondition', 'You cannot change your own status.');
    }

    try {
        const userToUpdate = await auth.getUser(uid);
        const targetClaims = userToUpdate.customClaims || {};
        const targetRole = targetClaims.role;
        const callerRole = request.auth!.token.role; // Sabemos que token existe por checkModOrAdmin

        if (callerRole === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
            throw new HttpsError('permission-denied', 'Moderators cannot ban other moderators or admins.');
        }

        const userDocRef = db.collection('users').doc(uid);
        let banUntil: admin.firestore.Timestamp | null = null;
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
        } else { // Unbanning
            await userDocRef.update({
                disabled,
                banUntil: admin.firestore.FieldValue.delete(),
                _claimsRefreshedAt: claimsRefreshTime // <-- Correcto
            });
        }

        const action = disabled ? (duration ? 'temporarily banned' : 'banned') : 'unbanned';
        return { success: true, message: `User ${action} successfully.` };
    } catch (error: any) {
        console.error(`Error updating status for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || `Failed to update user status.`);
    }
});

export const updateUserCertification = onCall({ region: 'europe-west1' }, async (request: CallableRequest<UpdateCertificationData>) => {
    checkModOrAdmin(request.auth?.token);

    const { uid, isCertified } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }
    if (typeof isCertified !== 'boolean') {
         throw new HttpsError('invalid-argument', 'Certification status must be true or false.');
    }

    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};

        // 1. Set claim
        await auth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
        // 2. Update Firestore (con _claimsRefreshedAt)
        await db.collection('users').doc(uid).update({
            isCertifiedStreamer: isCertified,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp() // <-- BUENA PRÁCTICA AÑADIDA
        });
        return { success: true, message: `User certification status updated successfully.` };
    } catch (error: any) {
        console.error(`Error updating certification for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || `Failed to update certification.`);
    }
});

// *** FUNCIÓN DE PRESENCIA (Añadida) ***
export const updateUserPresence = onCall({ region: 'europe-west1' }, async (request: CallableRequest<UpdatePresenceData>) => {
    // 1. Autenticación y Validación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para actualizar tu estado.');
    }
    const uid = request.auth.uid;
    const { status } = request.data;

    // *** Validación actualizada para incluir 'busy' ***
    if (!status || !VALID_STATUSES.includes(status)) {
        throw new HttpsError('invalid-argument', `Se proporcionó un estado inválido: ${status}`);
    }

    const userRef = db.collection('users').doc(uid);

    try {
        // 2. Actualizar Firestore
        await userRef.update({
            status: status,
            lastSeen: admin.firestore.FieldValue.serverTimestamp() // Guarda la última vez que se actualizó
        });

        return { success: true, message: `Estado actualizado a "${status}".` };
    } catch (error: any) {
        console.error(`Error al actualizar la presencia para el usuario ${uid}:`, error);
        if (error.code === 5) { // NOT_FOUND
             throw new HttpsError('not-found', 'No se encontró el perfil de usuario.');
        }
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocurrió un error inesperado.');
    }
});