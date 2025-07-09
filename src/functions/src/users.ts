

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type UserRole = 'admin' | 'moderator' | 'player' | 'founder' | 'coach';
type UserStatus = "available" | "busy" | "away" | "offline";

const db = admin.firestore();
const auth = admin.auth();

const VALID_ROLES: UserRole[] = ['admin', 'moderator', 'player', 'founder', 'coach'];

const checkAdmin = (auth: any) => {
    if (!auth || auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'This action requires administrator privileges.');
    }
};

const checkModOrAdmin = (auth: any) => {
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new HttpsError('permission-denied', 'This action requires moderator or administrator privileges.');
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
        const userDocRef = db.collection('users').doc(uid);

        // Step 1: Set the secure custom claim. This is the source of truth for permissions.
        await auth.setCustomUserClaims(uid, { ...existingClaims, role });
        
        // Step 2: Update the denormalized role in Firestore for client display.
        await userDocRef.set({ role, _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

        // --- NEW LOGIC ---
        // If the user is in a team, update their role in the team's subcollection as well to keep data in sync.
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();
        if (userData && userData.teamId) {
            const teamId = userData.teamId;
            const memberRef = db.collection('teams').doc(teamId).collection('members').doc(uid);
            
            // Determine the role within the team.
            // A global coach is a 'coach' in the team.
            // A global player is a 'member'.
            const teamRole = role === 'coach' ? 'coach' : 'member';

            const memberDoc = await memberRef.get();
            // Only update if they are not the founder of the team.
            if (memberDoc.exists && memberDoc.data()?.role !== 'founder') {
                await memberRef.update({ role: teamRole });
            }
        }

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
interface UpdateRoleData {
    uid: string;
    role: UserRole;
}

export const updateUserStatus = onCall(async ({ auth: callerAuth, data }: { auth?: any, data: UpdateStatusData }) => {
    checkModOrAdmin(callerAuth);

    const { uid, disabled, duration } = data;
     if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }

    if (callerAuth.uid === uid) {
        throw new HttpsError('failed-precondition', 'You cannot change your own status.');
    }

    try {
        const userToUpdate = await auth.getUser(uid);
        const targetClaims = userToUpdate.customClaims || {};
        const targetRole = targetClaims.role;
        const callerRole = callerAuth.token.role;

        // Rule: Moderators can't ban other moderators or admins.
        if (callerRole === 'moderator' && (targetRole === 'admin' || targetRole === 'moderator')) {
            throw new HttpsError('permission-denied', 'Moderators cannot ban other moderators or admins.');
        }

        const userDocRef = db.collection('users').doc(uid);
        let banUntil: admin.firestore.Timestamp | null = null;
        const claimsRefreshTime = admin.firestore.FieldValue.serverTimestamp();

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
                banUntil: banUntil, // Will be null for permanent, or a timestamp for temporary
                _claimsRefreshedAt: claimsRefreshTime
            });
        } else { // Unbanning
            await userDocRef.update({ 
                disabled, 
                banUntil: admin.firestore.FieldValue.delete(),
                _claimsRefreshedAt: claimsRefreshTime 
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
    checkModOrAdmin(callerAuth);
    
    const { uid, isCertified } = data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
    }
    try {
        const userToUpdate = await auth.getUser(uid);
        const existingClaims = userToUpdate.customClaims || {};
        // Step 1: Set the secure custom claim.
        await auth.setCustomUserClaims(uid, { ...existingClaims, isCertifiedStreamer: isCertified });
        // Step 2: Update the denormalized field in Firestore for client display and add refresh timestamp.
        await db.collection('users').doc(uid).update({ 
            isCertifiedStreamer: isCertified,
            _claimsRefreshedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: `User certification status updated successfully.` };
    } catch (error: any) {
        console.error('Error updating user certification:', error);
        throw new HttpsError('internal', `Failed to update certification: ${error.message}`);
    }
});


export const updateUserPresence = onCall(async ({ auth, data }: { auth?: any, data: { status: UserStatus }}) => {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const { uid } = auth;
    const { status } = data;

    if (!['available', 'busy', 'away', 'offline'].includes(status)) {
        throw new HttpsError('invalid-argument', `Invalid status provided: ${status}`);
    }

    try {
        await db.collection('users').doc(uid).update({ status: status });
        return { success: true, message: `Status updated to ${status}.` };
    } catch (error: any) {
        console.error('Error updating presence:', error);
        throw new HttpsError('internal', 'Failed to update user presence.');
    }
});

export const getManagedUsers = onCall(async ({ auth: callerAuth }) => {
    checkModOrAdmin(callerAuth);

    const listUsersResult = await auth.listUsers(1000);
    const firestoreUsers = await db.collection('users').get();
    const firestoreUsersMap = new Map(firestoreUsers.docs.map(doc => [doc.id, doc.data()]));

    const users = listUsersResult.users.map(userRecord => {
        const firestoreData = firestoreUsersMap.get(userRecord.uid) || {};
        return {
            id: userRecord.uid,
            email: userRecord.email,
            disabled: userRecord.disabled,
            name: firestoreData.name || '',
            avatarUrl: firestoreData.avatarUrl || '',
            role: firestoreData.role || 'player',
            country: firestoreData.country || '',
            createdAt: firestoreData.createdAt?.toDate().toISOString() || null,
            isCertifiedStreamer: firestoreData.isCertifiedStreamer || false,
            banUntil: firestoreData.banUntil?.toDate().toISOString() || null,
        };
    });

    return users;
});

    