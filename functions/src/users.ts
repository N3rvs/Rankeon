

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type UserRole = 'admin' | 'moderator' | 'player' | 'founder' | 'coach';

const db = admin.firestore();
const auth = admin.auth();

const VALID_ROLES: UserRole[] = ['admin', 'moderator', 'player', 'founder', 'coach'];

interface UpdateRoleData {
    uid: string;
    role: UserRole;
}

const checkAdmin = (auth: any) => {
    if (!auth || auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'This action requires administrator privileges.');
    }
};

export const updateUserRole = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: UpdateRoleData }) => {
    checkAdmin(callerAuth);
    
    const { uid, role } = data;
    if (!uid || !role || !VALID_ROLES.includes(role)) {
        throw new HttpsError('invalid-argument', 'Invalid arguments provided.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};

        // Step 1: Set the secure custom claim. This is the source of truth.
        await auth.setCustomUserClaims(uid, { ...existingClaims, role });
        // Step 2: Update the denormalized role in Firestore for client display.
        await db.collection('users').doc(uid).set({ role }, { merge: true });

        return { success: true, message: `Role "${role}" assigned to user ${uid}` };
    } catch (error: any) {
        console.error('Error updating role:', error);
        throw new HttpsError('internal', `Failed to update role: ${error.message}`);
    }
});

interface UpdateStatusData {
    uid: string;
    disabled: boolean;
    duration?: number; // in hours
}

export const updateUserStatus = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: UpdateStatusData }) => {
    checkAdmin(callerAuth);

    const { uid, disabled, duration } = data;
     if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }
    try {
        const userDocRef = db.collection('users').doc(uid);
        let banUntil: admin.firestore.Timestamp | null = null;

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
        } else { // Unbanning
            await userDocRef.update({ 
                disabled, 
                banUntil: admin.firestore.FieldValue.delete() 
            });
        }
        
        const action = disabled ? (duration ? 'temporarily banned' : 'banned') : 'unbanned';
        return { success: true, message: `User ${action} successfully.` };
    } catch (error: any) {
        console.error('Error updating user status:', error);
        throw new HttpsError('internal', `Failed to update user status: ${error.message}`);
    }
});


interface UpdateCertificationData {
    uid: string;
    isCertified: boolean;
}

export const updateUserCertification = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: UpdateCertificationData }) => {
    checkAdmin(callerAuth);
    
    const { uid, isCertified } = data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        // Step 1: Set the secure custom claim.
        await auth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
        // Step 2: Update the denormalized field in Firestore for client display.
        await db.collection('users').doc(uid).update({ isCertifiedStreamer: isCertified });
        return { success: true, message: `User certification status updated successfully.` };
    } catch (error: any) {
        console.error('Error updating user certification:', error);
        throw new HttpsError('internal', `Failed to update certification: ${error.message}`);
    }
});
