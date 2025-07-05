// functions/src/notifications.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AddInboxNotificationData {
  to: string;
  type: string;
  extraData?: any;
}

export const addInboxNotification = onCall(async ({ auth, data }) => {
  if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");
  
  const uid = auth.uid;
  const { to, type, extraData } = data as AddInboxNotificationData;

  if (!to || !type) {
    throw new HttpsError("invalid-argument", "Missing recipient or notification type.");
  }

  await db.collection(`inbox/${to}/notifications`).add({
    from: uid,
    type,
    extraData: extraData || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  return { success: true };
});

export const markNotificationsAsRead = onCall(async ({ auth, data }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");

    const uid = auth.uid;
    const { notificationIds } = data as { notificationIds: string[] };

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

// Deletes only SPECIFIC notifications by their IDs.
export const deleteNotifications = onCall(async ({ auth, data }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");

    const uid = auth.uid;
    const { notificationIds } = data as { notificationIds: string[] };

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
        console.error("Error in deleteNotifications:", error);
        throw new HttpsError("internal", "Failed to clear notifications.");
    }
});

// Clears the ENTIRE notification history for a user.
export const clearAllNotifications = onCall(async ({ auth }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in.");

    const uid = auth.uid;
    const notificationsRef = db.collection(`inbox/${uid}/notifications`);

    try {
        const batchSize = 400;
        let hasMore = true;

        while (hasMore) {
            const snapshot = await notificationsRef.limit(batchSize).get();
            if (snapshot.empty) {
                hasMore = false;
                continue;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        return { success: true, message: "All notifications cleared." };
    } catch (error: any) {
        console.error("Error in clearAllNotifications:", error);
        throw new HttpsError("internal", "Failed to clear notifications.");
    }
});


interface BlockUserData {
  blockedUid: string;
}

interface UnblockUserData {
  blockedUid: string;
}

export const blockUser = onCall(async ({ auth, data }) => {
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const uid = auth.uid;
  const { blockedUid } = data as BlockUserData;

  if (!blockedUid) {
    throw new HttpsError("invalid-argument", "User ID required.");
  }
  if (uid === blockedUid) {
    throw new HttpsError("invalid-argument", "You cannot block yourself.");
  }

  const currentUserRef = db.doc(`users/${uid}`);
  const otherUserRef = db.doc(`users/${blockedUid}`);

  await db.runTransaction(async (transaction) => {
      transaction.update(currentUserRef, {
          blocked: admin.firestore.FieldValue.arrayUnion(blockedUid)
      });
      transaction.update(currentUserRef, {
          friends: admin.firestore.FieldValue.arrayRemove(blockedUid)
      });
      transaction.update(otherUserRef, {
          friends: admin.firestore.FieldValue.arrayRemove(uid)
      });
  });

  return { success: true, message: "User blocked successfully." };
});

export const unblockUser = onCall(async ({ auth, data }) => {
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  
  const uid = auth.uid;
  const { blockedUid } = data as UnblockUserData;

  if (!blockedUid) {
    throw new HttpsError("invalid-argument", "User ID required.");
  }

  const currentUserRef = db.doc(`users/${uid}`);
  
  await currentUserRef.update({
      blocked: admin.firestore.FieldValue.arrayRemove(blockedUid)
  });

  return { success: true, message: "User unblocked successfully." };
});
