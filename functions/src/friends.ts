
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface FriendRequestData {
  to: string;
}

interface RespondToFriendRequestData {
  requestId: string;
  accept: boolean;
}

interface RemoveFriendData {
  friendUid: string;
}

export const sendFriendRequest = onCall(async ({ auth, data }: { auth?: any, data: FriendRequestData }) => {
  const from = auth?.uid;
  const { to } = data;

  if (!from) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!to || from === to) throw new HttpsError("invalid-argument", "Invalid user ID.");

  const fromDoc = await db.collection("users").doc(from).get();
  const fromData = fromDoc.data();
  if (fromData?.friends?.includes(to)) {
    throw new HttpsError("already-exists", "User is already your friend.");
  }

  const existingReqSnap = await db.collection("friendRequests")
    .where("from", "in", [from, to])
    .where("to", "in", [from, to])
    .where("status", "==", "pending")
    .get();

  if (!existingReqSnap.empty) {
      throw new HttpsError("already-exists", "A pending friend request already exists.");
  }
  
  const batch = db.batch();
  const requestRef = db.collection("friendRequests").doc();

  batch.set(requestRef, {
    from,
    to,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const notificationRef = db.collection(`inbox/${to}/notifications`).doc();
  batch.set(notificationRef, {
    type: "friend_request",
    from,
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    extraData: { requestId: requestRef.id } // Pass the request ID
  });
  
  await batch.commit();

  return { success: true };
});

export const respondToFriendRequest = onCall(async ({ auth, data }: { auth?: any; data: RespondToFriendRequestData }) => {
  const uid = auth?.uid;
  const { requestId, accept } = data;

  if (!uid || typeof accept !== "boolean" || !requestId) {
    throw new HttpsError("invalid-argument", "Invalid data.");
  }

  const requestRef = db.collection("friendRequests").doc(requestId);
  
  return db.runTransaction(async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists) {
        throw new HttpsError("not-found", "Friend request not found. It may have been withdrawn.");
    }
    const req = requestSnap.data();
    if (!req || req.to !== uid) {
        throw new HttpsError("permission-denied", "This is not your friend request to respond to.");
    }
    if (req.status !== 'pending') {
        throw new HttpsError("failed-precondition", "This friend request has already been resolved.");
    }
    
    transaction.update(requestRef, { status: accept ? "accepted" : "rejected" });

    if (accept) {
        const fromId = req.from;
        const userRef = db.doc(`users/${uid}`);
        const fromRef = db.doc(`users/${fromId}`);
        
        // This is safe. arrayUnion creates the array if it doesn't exist.
        transaction.update(userRef, { friends: admin.firestore.FieldValue.arrayUnion(fromId) });
        transaction.update(fromRef, { friends: admin.firestore.FieldValue.arrayUnion(uid) });

        // Notify the original sender that their request was accepted
        const notificationRef = db.collection(`inbox/${fromId}/notifications`).doc();
        transaction.set(notificationRef, {
            type: "friend_accepted",
            from: uid,
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create a chat document so they can start messaging immediately
        const members = [uid, fromId].sort();
        const chatId = members.join('_');
        const chatRef = db.collection("chats").doc(chatId);
        transaction.set(chatRef, {
            members: members,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }); // Use merge to not overwrite if it somehow exists
    }
    
    return { success: true, accepted: accept };
  });
});


export const removeFriend = onCall(async ({ auth, data }: { auth?: any, data: RemoveFriendData }) => {
  const uid = auth?.uid;
  const { friendUid } = data;

  if (!uid || !friendUid) {
    throw new HttpsError("invalid-argument", "Missing friend UID.");
  }

  const batch = db.batch();
  const currentUserRef = db.doc(`users/${uid}`);
  const friendUserRef = db.doc(`users/${friendUid}`);

  // Remove friend from both users' friend lists
  batch.update(currentUserRef, { friends: admin.firestore.FieldValue.arrayRemove(friendUid) });
  batch.update(friendUserRef, { friends: admin.firestore.FieldValue.arrayRemove(uid) });

  // Optional: Clean up the friend request document(s) between them.
  // This is a "fire-and-forget" query, but should be quick.
  const requestsSnap = await db.collection("friendRequests")
    .where("from", "in", [uid, friendUid])
    .where("to", "in", [uid, friendUid])
    .get();
  
  requestsSnap.forEach(doc => batch.delete(doc.ref));

  await batch.commit();

  return { success: true };
});
