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
exports.sendMessageToFriend = exports.deleteChatHistory = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.deleteChatHistory = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    const { uid } = request.auth;
    const { chatId } = request.data;
    if (!chatId)
        throw new https_1.HttpsError("invalid-argument", "Missing chat ID.");
    const chatRef = db.collection("chats").doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists)
        throw new https_1.HttpsError("not-found", "Chat not found.");
    const chatData = chatSnap.data();
    if (!(chatData === null || chatData === void 0 ? void 0 : chatData.members.includes(uid))) {
        throw new https_1.HttpsError("permission-denied", "You are not a member of this chat.");
    }
    const messagesRef = chatRef.collection("messages");
    try {
        const batchSize = 400;
        let lastDoc = null;
        let hasMore = true;
        while (hasMore) {
            let query = messagesRef.orderBy("__name__").limit(batchSize);
            if (lastDoc)
                query = query.startAfter(lastDoc);
            const snapshot = await query.get();
            hasMore = !snapshot.empty;
            if (!hasMore)
                break;
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        // NEW: Delete all notifications for this chat for ALL members
        const members = chatData.members;
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
    }
    catch (error) {
        console.error("Error deleting chat history:", error);
        throw new https_1.HttpsError("internal", "Failed to delete chat history.");
    }
});
exports.sendMessageToFriend = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a;
    const from = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { to, content } = data;
    if (!from)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!to || !content)
        throw new https_1.HttpsError("invalid-argument", "Missing recipient or message.");
    const senderDoc = await db.collection("users").doc(from).get();
    const senderData = senderDoc.data();
    if (!((_a = senderData === null || senderData === void 0 ? void 0 : senderData.friends) === null || _a === void 0 ? void 0 : _a.includes(to))) {
        throw new https_1.HttpsError("permission-denied", "You can only message your friends.");
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
//# sourceMappingURL=chat.js.map