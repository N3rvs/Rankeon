
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const deleteChatHistory = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  const { uid } = request.auth;
  const { chatId } = request.data;
  if (!chatId) throw new HttpsError("invalid-argument", "Missing chat ID.");

  const chatRef = db.collection("chats").doc(chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) throw new HttpsError("not-found", "Chat not found.");

  const chatData = chatSnap.data();
  if (!chatData?.members.includes(uid)) {
    throw new HttpsError("permission-denied", "You are not a member of this chat.");
  }

  const messagesRef = chatRef.collection("messages");
  try {
    const batchSize = 400;
    let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
      let query = messagesRef.orderBy("__name__").limit(batchSize);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      hasMore = !snapshot.empty;
      if (!hasMore) break;
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
    
    // NEW: Delete all notifications for this chat for ALL members
    const members: string[] = chatData.members;
    const notificationDeleteBatch = db.batch();
    for (const memberId of members) {
        const notifSnap = await db.collection(`inbox/${memberId}/notifications`).where('chatId', '==', chatId).get();
        notifSnap.forEach(doc => notificationDeleteBatch.delete(doc.ref));
    }
    await notificationDeleteBatch.commit();

    // Unconditionally update the lastMessage object to ensure the chat remains visible.
    await chatRef.update({
      lastMessage: {
        content: 'Historial de chat borrado.',
        sender: uid, // Use the UID of the user who initiated the action.
      },
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Chat history cleared." };
  } catch (error) {
    console.error("Error deleting chat history:", error);
    throw new HttpsError("internal", "Failed to delete chat history.");
  }
});

export const sendMessageToFriend = onCall(async ({ auth, data }) => {
  const from = auth?.uid;
  const { to, content } = data;

  if (!from) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!to || !content) throw new HttpsError("invalid-argument", "Missing recipient or message.");

  const senderDoc = await db.collection("users").doc(from).get();
  const senderData = senderDoc.data();
  if (!senderData?.friends?.includes(to)) {
    throw new HttpsError("permission-denied", "You can only message your friends.");
  }

  const members = [from, to].sort();
  // Use a deterministic chat ID to avoid querying for existing chats
  const chatId = members.join('_');
  const chatRef = db.collection("chats").doc(chatId);
  const messageRef = chatRef.collection('messages').doc();

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const lastMessage = { content, sender: from };
  const notificationContent = content.length > 100 ? content.substring(0, 97) + '...' : content;
  
  const batch = db.batch();

  // Set the chat document. This will create it if it doesn't exist,
  // or update the last message details if it does.
  batch.set(chatRef, { 
      members, 
      lastMessageAt: timestamp, 
      lastMessage 
  }, { merge: true });

  // Add the new message to the subcollection
  batch.set(messageRef, { sender: from, content, createdAt: timestamp });

  // Create a notification for the recipient
  const notificationRef = db.collection(`inbox/${to}/notifications`).doc();
  batch.set(notificationRef, {
    type: "new_message",
    from: from,
    chatId: chatId,
    read: false,
    content: notificationContent,
    timestamp: timestamp,
  });

  await batch.commit();

  return { success: true, chatId };
});
