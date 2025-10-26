
// src/functions/users.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type UserRole = 'admin' | 'moderator' | 'player' | 'founder' | 'coach';
type UserStatus = 'available' | 'busy' | 'away' | 'offline';

const db = admin.firestore();
const auth = admin.auth();

const VALID_ROLES: UserRole[] = ['admin', 'moderator', 'player', 'founder', 'coach'];
const VALID_STATUSES: UserStatus[] = ['available', 'busy', 'away', 'offline'];

// --- Helpers de Permisos ---
const checkAdmin = (auth: any) => {
    // Añadir verificación de auth.token para seguridad
    if (!auth?.token || auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'This action requires administrator privileges.');
    }
};

const checkModOrAdmin = (auth: any) => {
    // Añadir verificación de auth.token para seguridad
    if (!auth?.token || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
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

export const updateUserRole = onCall({ region: 'europe-west1' }, async ({ auth: callerAuth, data }: { auth?: any, data: UpdateRoleData }) => {
    checkAdmin(callerAuth); // Verifica permisos primero

    const { uid, role } = data;
    if (!uid || !role || !VALID_ROLES.includes(role)) {
        throw new HttpsError('invalid-argument', 'Invalid arguments provided (uid, role).');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};

        // No permitir cambiar rol de otro admin si no eres admin (seguridad extra)
        if (existingClaims.role === 'admin' && callerAuth.token.role !== 'admin') {
             throw new HttpsError('permission-denied', 'Cannot change the role of another admin.');
        }

        // 1. Set claim
        await auth.setCustomUserClaims(uid, { ...existingClaims, role });
        // 2. Update Firestore
        await db.collection('users').doc(uid).set({
            role,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, message: `Role "${role}" assigned to user ${uid}` };
    } catch (error: any) {
        console.error(`Error updating role for user ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || `Failed to update role.`);
    }
});

export const updateUserStatus = onCall({ region: 'europe-west1' }, async ({ auth: callerAuth, data }: { auth?: any, data: UpdateStatusData }) => {
    checkModOrAdmin(callerAuth); // Verifica permisos

    const { uid, disabled, duration } = data;
     if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID (uid) is required.');
    }
    // Asegurarse que disabled sea booleano
    if (typeof disabled !== 'boolean') {
         throw new HttpsError('invalid-argument', 'Disabled status must be true or false.');
    }
    // Asegurarse que duration sea número si existe
    if (duration !== undefined && typeof duration !== 'number') {
         throw new HttpsError('invalid-argument', 'Duration must be a number (in hours).');
    }

    if (callerAuth.uid === uid) {
        throw new HttpsError('failed-precondition', 'You cannot change your own status.');
    }

    try {
        const userToUpdate = await auth.getUser(uid);
        const targetClaims = userToUpdate.customClaims || {};
        const targetRole = targetClaims.role;
        const callerRole = callerAuth.token.role; // Sabemos que token existe por checkModOrAdmin

        // Regla: Mods no pueden banear admins u otros mods
        if (callerRole === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
            throw new HttpsError('permission-denied', 'Moderators cannot ban other moderators or admins.');
        }

        const userDocRef = db.collection('users').doc(uid);
        let banUntil: admin.firestore.Timestamp | null = null;
        const claimsRefreshTime = admin.firestore.FieldValue.serverTimestamp();

        if (disabled && duration && duration > 0) { // Solo calcular si es ban temporal positivo
            const now = admin.firestore.Timestamp.now();
            banUntil = admin.firestore.Timestamp.fromMillis(now.toMillis() + duration * 60 * 60 * 1000);
        }

        // Actualizar Auth (primero por si falla)
        await auth.updateUser(uid, { disabled });

        // Actualizar Firestore
        if (disabled) { // Banning
             await userDocRef.update({
                disabled,
                banUntil: banUntil, // null si es permanente, Timestamp si es temporal
                _claimsRefreshedAt: claimsRefreshTime
            });
        } else { // Unbanning
            await userDocRef.update({
                disabled,
                banUntil: admin.firestore.FieldValue.delete(), // Elimina el campo banUntil
                _claimsRefreshedAt: claimsRefreshTime
            });
        }

        const action = disabled ? (duration ? 'temporarily banned' : 'banned') : 'unbanned';
        return { success: true, message: `User ${action} successfully.` };
    } catch (error: any) {
        console.error(`Error updating status for user ${uid}:`, error);
         // Si falla Firestore después de Auth, intentar revertir Auth (opcional, complejo)
        // Por ahora, solo lanzamos el error
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || `Failed to update user status.`);
    }
});

export const updateUserPresence = onCall({ region: 'europe-west1' }, async ({ auth: requestAuth, data }: { auth?: any, data: UpdatePresenceData }) => {
    // 1. Autenticación y Validación
    if (!requestAuth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para actualizar tu estado.');
    }
    const uid = requestAuth.uid;
    const { status } = data;

    if (!status || !VALID_STATUSES.includes(status)) {
        throw new HttpsError('invalid-argument', 'Se proporcionó un estado inválido.');
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
        // Comprueba si el documento no existe
        if (error.code === 5) { // Código de error NOT_FOUND de Firestore
             throw new HttpsError('not-found', 'No se encontró el perfil de usuario para actualizar el estado.');
        }
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Ocurrió un error inesperado al actualizar el estado.');
    }
});


export const updateUserCertification = onCall({ region: 'europe-west1' }, async ({ auth: callerAuth, data }: { auth?: any, data: UpdateCertificationData }) => {
    checkModOrAdmin(callerAuth); // Verifica permisos

    const { uid, isCertified } = data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID (uid) is required.');
    }
    if (typeof isCertified !== 'boolean') {
         throw new HttpsError('invalid-argument', 'Certification status must be true or false.');
    }

    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};

        // 1. Set claim
        await auth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
        // 2. Update Firestore
        await db.collection('users').doc(uid).update({ // Usar update es más seguro que set merge
            isCertifiedStreamer: isCertified,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: `User certification status updated successfully.` };
    } catch (error: any) {
        console.error(`Error updating certification for user ${uid}:`, error);
        // Si falla Firestore después de Auth, intentar revertir Auth (opcional)
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || `Failed to update certification.`);
    }
});
