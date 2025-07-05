
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AddInboxNotificationData {
  to: string;
  type: string;
  extraData?: any;
}

export const addInboxNotification = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be logged in.");
  
  const uid = request.auth.uid;
  const { to, type, extraData } = request.data as AddInboxNotificationData;

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

export const markNotificationsAsRead = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be logged in.");

    const uid = request.auth.uid;
    const { notificationIds } = request.data as { notificationIds: string[] };

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


export const clearNotifications = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be logged in.");

    const uid = request.auth.uid;
    const { notificationIds } = request.data as { notificationIds: string[] };

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

export const blockUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const uid = request.auth.uid;
  const { blockedUid } = request.data as BlockUserData;

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

export const unblockUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  
  const uid = request.auth.uid;
  const { blockedUid } = request.data as UnblockUserData;

  if (!blockedUid) {
    throw new HttpsError("invalid-argument", "User ID required.");
  }

  const currentUserRef = db.doc(`users/${uid}`);
  
  await currentUserRef.update({
      blocked: admin.firestore.FieldValue.arrayRemove(blockedUid)
  });

  return { success: true, message: "User unblocked successfully." };
});
