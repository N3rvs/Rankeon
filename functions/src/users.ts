
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type UserRole = 'admin' | 'moderator' | 'player' | 'founder';

const db = admin.firestore();
const auth = admin.auth();

const VALID_ROLES: UserRole[] = ['admin', 'moderator', 'player', 'founder'];

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

        await auth.setCustomUserClaims(uid, { ...existingClaims, role });
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
}

export const updateUserStatus = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: UpdateStatusData }) => {
    checkAdmin(callerAuth);

    const { uid, disabled } = data;
     if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }
    try {
        await auth.updateUser(uid, { disabled });
        await db.collection('users').doc(uid).update({ disabled });
        return { success: true, message: `User ${disabled ? 'banned' : 'unbanned'} successfully.` };
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
        await auth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
        await db.collection('users').doc(uid).update({ isCertifiedStreamer: isCertified });
        return { success: true, message: `User certification status updated successfully.` };
    } catch (error: any) {
        console.error('Error updating user certification:', error);
        throw new HttpsError('internal', `Failed to update certification: ${error.message}`);
    }
});
