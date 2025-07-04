
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AddInboxNotificationData {
  to: string;
  type: string;
  extraData?: any;
}

interface DeleteInboxNotificationData {
  notificationId: string;
}

interface BlockUserData {
  blockedUid: string;
}

interface UnblockUserData {
  blockedUid: string;
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
  });

  return { success: true };
});

export const deleteInboxNotification = onCall(async ({ auth, data }: { auth?: any, data: DeleteInboxNotificationData }) => {
  const uid = auth?.uid;
  const { notificationId } = data;

  if (!uid || !notificationId) {
    throw new HttpsError("invalid-argument", "Missing notification ID.");
  }

  const notifRef = db.doc(`inbox/${uid}/notifications/${notificationId}`);
  
  // We can just delete. If it doesn't exist, it's a no-op.
  await notifRef.delete();

  return { success: true };
});

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
