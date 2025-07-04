
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AddInboxNotificationData {
  to: string;
  type: string;
  extraData?: any;
}

export const addInboxNotification = onCall(async ({ auth, data }: { auth?: any, data: AddInboxNotificationData }) => {
  const uid = auth?.uid;
  const { to, type, extraData } = data;

  if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!to || !type) {
    throw new HttpsError("invalid-argument", "Missing recipient or notification type.");
  }

  await db.collection(`inbox/${to}/notifications`).add({
    from: uid,
    type,
    extraData: extraData || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    read: false, // Ensure new notifications are unread
  });

  return { success: true };
});

export const markNotificationsAsRead = onCall(async ({ auth, data }: { auth?: any; data: { notificationIds: string[] } }) => {
    const uid = auth?.uid;
    const { notificationIds } = data;

    if (!uid) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new HttpsError("invalid-argument", "An array of notification IDs is required.");
    }

    try {
        const batch = db.batch();
        const notificationsRef = db.collection(`inbox/${uid}/notifications`);
        notificationIds.forEach(id => {
            const docRef = notificationsRef.doc(id);
            batch.update(docRef, { read: true });
        });
        await batch.commit();
        return { success: true, message: "Notifications marked as read." };
    } catch (error: any) {
        console.error("Error in markNotificationsAsRead:", error);
        throw new HttpsError("internal", "Failed to mark notifications as read.");
    }
});


export const clearNotifications = onCall(async ({ auth, data }: { auth?: any; data: { notificationIds: string[] } }) => {
    const uid = auth?.uid;
    const { notificationIds } = data;

    if (!uid) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new HttpsError("invalid-argument", "An array of notification IDs is required.");
    }

    try {
        const batch = db.batch();
        const notificationsRef = db.collection(`inbox/${uid}/notifications`);
        notificationIds.forEach(id => {
            const docRef = notificationsRef.doc(id);
            batch.delete(docRef);
        });
        await batch.commit();
        return { success: true, message: "Notifications cleared." };
    } catch (error: any) {
        console.error("Error in clearNotifications:", error);
        throw new HttpsError("internal", "Failed to clear notifications.");
    }
});

interface BlockUserData {
  blockedUid: string;
}

interface UnblockUserData {
  blockedUid: string;
}

export const blockUser = onCall(async ({ auth, data }: { auth?: any, data: BlockUserData }) => {
  const uid = auth?.uid;
  const { blockedUid } = data;

  if (!uid || !blockedUid) {
    throw new HttpsError("invalid-argument", "User ID required.");
  }
  if (uid === blockedUid) {
    throw new HttpsError("invalid-argument", "You cannot block yourself.");
  }

  const currentUserRef = db.doc(`users/${uid}`);
  const otherUserRef = db.doc(`users/${blockedUid}`);

  // Use a transaction to ensure atomicity
  await db.runTransaction(async (transaction) => {
      // 1. Add user to blocker's block list
      transaction.update(currentUserRef, {
          blocked: admin.firestore.FieldValue.arrayUnion(blockedUid)
      });
      // 2. Remove the blocked user from the blocker's friend list
      transaction.update(currentUserRef, {
          friends: admin.firestore.FieldValue.arrayRemove(blockedUid)
      });
      // 3. Remove the blocker from the blocked user's friend list
      transaction.update(otherUserRef, {
          friends: admin.firestore.FieldValue.arrayRemove(uid)
      });
  });

  return { success: true, message: "User blocked successfully." };
});

export const unblockUser = onCall(async ({ auth, data }: { auth?: any, data: UnblockUserData }) => {
  const uid = auth?.uid;
  const { blockedUid } = data;

  if (!uid || !blockedUid) {
    throw new HttpsError("invalid-argument", "User ID required.");
  }

  const currentUserRef = db.doc(`users/${uid}`);
  
  await currentUserRef.update({
      blocked: admin.firestore.FieldValue.arrayRemove(blockedUid)
  });

  return { success: true, message: "User unblocked successfully." };
});
