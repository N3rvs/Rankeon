"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToFriend = exports.deleteChatHistory = exports.getChats = void 0;
// src/functions/chat.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const CHAT_PAGE_SIZE = 20;
// *** Añadida región y paginación ***
exports.getChats = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    var _a, _b, _c;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    const { uid } = auth;
    const { lastTimestamp } = (data !== null && data !== void 0 ? data : {});
    try {
        let query = db.collection("chats")
            .where("members", "array-contains", uid)
            .orderBy("lastMessageAt", "desc")
            .limit(CHAT_PAGE_SIZE);
        if (lastTimestamp) {
            const lastDate = new Date(lastTimestamp);
            if (!isNaN(lastDate.getTime())) {
                query = query.startAfter(admin.firestore.Timestamp.fromDate(lastDate));
            }
            else {
                console.warn(`Invalid lastTimestamp received: ${lastTimestamp}`);
            }
        }
        const chatsSnap = await query.get();
        const chats = chatsSnap.docs.map(doc => {
            var _a, _b;
            const data = doc.data();
            return {
                id: doc.id,
                members: data.members,
                lastMessage: data.lastMessage,
                lastMessageAt: ((_a = data.lastMessageAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString()) || null,
                createdAt: ((_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate().toISOString()) || null,
            };
        });
        const lastDocInBatch = chatsSnap.docs[chatsSnap.docs.length - 1];
        const nextLastTimestamp = (_c = (_b = (_a = lastDocInBatch === null || lastDocInBatch === void 0 ? void 0 : lastDocInBatch.data()) === null || _a === void 0 ? void 0 : _a.lastMessageAt) === null || _b === void 0 ? void 0 : _b.toDate().toISOString()) !== null && _c !== void 0 ? _c : null;
        return {
            chats: chats,
            nextLastTimestamp: nextLastTimestamp,
        };
    }
    catch (error) {
        console.error(`Error getting chats for user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to retrieve chat list.");
    }
});
// *** Añadida región y corrección .empty ***
exports.deleteChatHistory = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    const { uid } = request.auth;
    const { chatId } = request.data;
    if (!chatId)
        throw new https_1.HttpsError("invalid-argument", "Missing chat ID.");
    const chatRef = db.collection("chats").doc(chatId);
    try {
        const chatSnap = await chatRef.get();
        if (!chatSnap.exists) {
            console.log(`Chat ${chatId} not found, possibly already deleted.`);
            return { success: true, message: "Chat history already cleared or chat not found." };
        }
        const chatData = chatSnap.data();
        if (!(chatData === null || chatData === void 0 ? void 0 : chatData.members.includes(uid))) {
            throw new https_1.HttpsError("permission-denied", "You are not a member of this chat.");
        }
        // Borrar mensajes
        console.log(`Deleting messages for chat ${chatId}...`);
        await deleteCollection(db, `chats/${chatId}/messages`);
        // Borrar notificaciones asociadas
        console.log(`Deleting notifications for chat ${chatId}...`);
        const members = chatData.members;
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
        }
        else {
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
    }
    catch (error) {
        console.error(`Error deleting chat history for chat ${chatId} by user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to delete chat history.");
    }
});
// *** Añadida región ***
exports.sendMessageToFriend = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    var _a, _b;
    const from = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { to, content } = data;
    if (!from)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!to || !content)
        throw new https_1.HttpsError("invalid-argument", "Missing recipient (to) or message content.");
    if (content.length > 1000)
        throw new https_1.HttpsError("invalid-argument", "Message content is too long (max 1000 chars).");
    if (from === to)
        throw new https_1.HttpsError("invalid-argument", "Cannot send message to yourself.");
    try {
        const senderDoc = await db.collection("users").doc(from).get();
        const senderData = senderDoc.data();
        if (!senderDoc.exists)
            throw new https_1.HttpsError("not-found", "Your user profile was not found.");
        if (!((_a = senderData === null || senderData === void 0 ? void 0 : senderData.friends) === null || _a === void 0 ? void 0 : _a.includes(to)))
            throw new https_1.HttpsError("permission-denied", "You can only message your friends.");
        // Comprobar bloqueo (opcional)
        const recipientDoc = await db.collection("users").doc(to).get();
        if (!recipientDoc.exists)
            throw new https_1.HttpsError("not-found", "Recipient user profile was not found.");
        const recipientData = recipientDoc.data();
        if ((_b = recipientData === null || recipientData === void 0 ? void 0 : recipientData.blocked) === null || _b === void 0 ? void 0 : _b.includes(from)) {
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
    }
    catch (error) {
        console.error(`Error sending message from ${from} to ${to}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to send message.');
    }
});
// Helper para borrar colecciones
async function deleteCollection(db, collectionPath, batchSize = 400) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    let docsDeleted = 0;
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0)
            break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        docsDeleted += snapshot.size;
        if (snapshot.size < batchSize)
            break; // Optimization: exit if last batch was not full
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
    console.log(`Finished deleting ${docsDeleted} documents from collection: ${collectionPath}`);
}
//# sourceMappingURL=chat.js.map