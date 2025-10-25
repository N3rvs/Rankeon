// src/functions/chat.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
const CHAT_PAGE_SIZE = 20;

// *** Añadida región y paginación ***
export const getChats = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
  if (!auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  const { uid } = auth;
  const { lastTimestamp } = (data ?? {}) as { lastTimestamp: string | null };

  try {
    let query = db.collection("chats")
        .where("members", "array-contains", uid)
        .orderBy("lastMessageAt", "desc")
        .limit(CHAT_PAGE_SIZE);

    if (lastTimestamp) {
        const lastDate = new Date(lastTimestamp);
        if (!isNaN(lastDate.getTime())) {
            query = query.startAfter(admin.firestore.Timestamp.fromDate(lastDate));
        } else {
            console.warn(`Invalid lastTimestamp received: ${lastTimestamp}`);
        }
    }

    const chatsSnap = await query.get();

    const chats = chatsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            members: data.members,
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt?.toDate().toISOString() || null,
            createdAt: data.createdAt?.toDate().toISOString() || null,
        }
    });

    const lastDocInBatch = chatsSnap.docs[chatsSnap.docs.length - 1];
    const nextLastTimestamp = lastDocInBatch?.data()?.lastMessageAt?.toDate().toISOString() ?? null;

    return {
        chats: chats,
        nextLastTimestamp: nextLastTimestamp,
     };
  } catch (error: any) {
    console.error(`Error getting chats for user ${uid}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to retrieve chat list.");
  }
});

// *** Añadida región y corrección .empty ***
export const deleteChatHistory = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  const { uid } = request.auth;
  const { chatId } = request.data;
  if (!chatId) throw new HttpsError("invalid-argument", "Missing chat ID.");

  const chatRef = db.collection("chats").doc(chatId);

  try {
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) {
          console.log(`Chat ${chatId} not found, possibly already deleted.`);
          return { success: true, message: "Chat history already cleared or chat not found." };
      }

      const chatData = chatSnap.data();
      if (!chatData?.members.includes(uid)) {
        throw new HttpsError("permission-denied", "You are not a member of this chat.");
      }

      // Borrar mensajes
      console.log(`Deleting messages for chat ${chatId}...`);
      await deleteCollection(db, `chats/${chatId}/messages`);

      // Borrar notificaciones asociadas
      console.log(`Deleting notifications for chat ${chatId}...`);
      const members: string[] = chatData.members;
      const notificationDeleteBatch = db.batch();
      // *** CORRECCIÓN .empty ***
      let notificationsToDeleteCount = 0; // 1. Inicializa contador
      await Promise.all(members.map(async (memberId) => {
          const notifSnap = await db.collection(`inbox/${memberId}/notifications`).where('chatId', '==', chatId).get();
          notifSnap.forEach(doc => {
              notificationDeleteBatch.delete(doc.ref);
              notificationsToDeleteCount++; // 2. Incrementa contador
          });
      }));

      // 3. Comprueba el contador antes de commitear
      if (notificationsToDeleteCount > 0) {
          await notificationDeleteBatch.commit();
          console.log(`${notificationsToDeleteCount} notifications deleted for chat ${chatId}.`);
      } else {
          console.log(`No notifications found for chat ${chatId}.`);
      }
      // *** FIN CORRECCIÓN .empty ***

      // Actualizar último mensaje
      await chatRef.update({
        lastMessage: { content: 'Historial de chat borrado.', sender: uid },
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Chat history marked as cleared for chat ${chatId}.`);

      return { success: true, message: "Chat history cleared." };

  } catch (error: any) {
    console.error(`Error deleting chat history for chat ${chatId} by user ${uid}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to delete chat history.");
  }
});

// *** Añadida región ***
export const sendMessageToFriend = onCall({ region: 'europe-west1' }, async ({ auth, data }) => {
  const from = auth?.uid;
  const { to, content } = data;

  if (!from) throw new HttpsError("unauthenticated", "You must be logged in.");
  if (!to || !content) throw new HttpsError("invalid-argument", "Missing recipient (to) or message content.");
  if (content.length > 1000) throw new HttpsError("invalid-argument", "Message content is too long (max 1000 chars).");
  if (from === to) throw new HttpsError("invalid-argument", "Cannot send message to yourself.");

  try {
      const senderDoc = await db.collection("users").doc(from).get();
      const senderData = senderDoc.data();
      if (!senderDoc.exists) throw new HttpsError("not-found", "Your user profile was not found.");
      if (!senderData?.friends?.includes(to)) throw new HttpsError("permission-denied", "You can only message your friends.");

      // Comprobar bloqueo (opcional)
      const recipientDoc = await db.collection("users").doc(to).get();
       if (!recipientDoc.exists) throw new HttpsError("not-found", "Recipient user profile was not found.");
      const recipientData = recipientDoc.data();
      if (recipientData?.blocked?.includes(from)) {
          console.log(`Message blocked: User ${to} has blocked user ${from}.`);
          const membersForId = [from, to].sort(); // Necesario para el ID determinista
          return { success: true, chatId: membersForId.join('_') }; // Éxito silencioso
      }

      const members = [from, to].sort();
      const chatId = members.join('_');
      const chatRef = db.collection("chats").doc(chatId);
      const messageRef = chatRef.collection('messages').doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const lastMessage = { content, sender: from };
      const notificationContent = content.length > 100 ? content.substring(0, 97) + '...' : content;
      const batch = db.batch();

      batch.set(chatRef, { members, lastMessageAt: timestamp, lastMessage }, { merge: true });
      batch.set(messageRef, { sender: from, content, createdAt: timestamp });
      const notificationRef = db.collection(`inbox/${to}/notifications`).doc();
      batch.set(notificationRef, { type: "new_message", from, chatId, read: false, content: notificationContent, timestamp });
      await batch.commit();

      return { success: true, chatId };

  } catch (error: any) {
      console.error(`Error sending message from ${from} to ${to}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Failed to send message.');
  }
});

// Helper para borrar colecciones
async function deleteCollection(
    db: admin.firestore.Firestore,
    collectionPath: string,
    batchSize: number = 400
) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    let docsDeleted = 0;
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        docsDeleted += snapshot.size;
        if (snapshot.size < batchSize) break; // Optimization: exit if last batch was not full
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
     console.log(`Finished deleting ${docsDeleted} documents from collection: ${collectionPath}`);
}