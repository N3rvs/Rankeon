// functions/src/tasks.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const STAFF_ROLES = ['founder', 'coach'];

// Helper to check staff permissions
async function checkStaffPermissions(uid: string, teamId: string) {
    const memberRef = db.collection('teams').doc(teamId).collection('members').doc(uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists || !STAFF_ROLES.includes(memberSnap.data()?.role)) {
        throw new HttpsError("permission-denied", "You must be a founder or coach to manage tasks.");
    }
}

export const addTask = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");
    const { teamId, title } = data;
    if (!teamId || !title) throw new HttpsError("invalid-argument", "Missing teamId or title.");

    await checkStaffPermissions(auth.uid, teamId);

    try {
        await db.collection('teams').doc(teamId).collection('tasks').add({
            title,
            completed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: auth.uid,
        });
        return { success: true, message: 'Task added successfully.' };
    } catch (error: any) {
        console.error("Error adding task:", error);
        throw new HttpsError("internal", "Failed to add task.");
    }
});

export const updateTaskStatus = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");
    const { teamId, taskId, completed } = data;
    if (!teamId || !taskId || typeof completed !== 'boolean') {
        throw new HttpsError("invalid-argument", "Missing teamId, taskId, or completed status.");
    }

    await checkStaffPermissions(auth.uid, teamId);

    try {
        const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc(taskId);
        await taskRef.update({ completed });
        return { success: true, message: 'Task status updated.' };
    } catch (error: any) {
        console.error("Error updating task status:", error);
        throw new HttpsError("internal", "Failed to update task status.");
    }
});

export const deleteTask = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");
    const { teamId, taskId } = data;
    if (!teamId || !taskId) throw new HttpsError("invalid-argument", "Missing teamId or taskId.");

    await checkStaffPermissions(auth.uid, teamId);

    try {
        await db.collection('teams').doc(teamId).collection('tasks').doc(taskId).delete();
        return { success: true, message: 'Task deleted.' };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        throw new HttpsError("internal", "Failed to delete task.");
    }
});
