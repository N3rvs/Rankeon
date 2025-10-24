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
exports.resolveTicket = exports.respondToTicket = exports.createSupportTicket = void 0;
// src/functions/tickets.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.createSupportTicket = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to create a ticket.");
    const { subject, description } = data;
    if (!subject || !description)
        throw new https_1.HttpsError("invalid-argument", "Subject and description are required.");
    const userDoc = await db.collection('users').doc(auth.uid).get();
    if (!userDoc.exists)
        throw new https_1.HttpsError("not-found", "User profile not found.");
    const userData = userDoc.data();
    const ticketRef = db.collection("supportTickets").doc();
    await ticketRef.set({
        id: ticketRef.id,
        userId: auth.uid,
        userName: userData.name,
        userEmail: userData.email,
        subject,
        description,
        status: 'open',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Support ticket created successfully." };
});
exports.respondToTicket = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a;
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new https_1.HttpsError("permission-denied", "You must be a moderator or admin to respond to tickets.");
    }
    const { ticketId, content } = data;
    if (!ticketId || !content) {
        throw new https_1.HttpsError("invalid-argument", "Ticket ID and content are required.");
    }
    const modDoc = await db.collection('users').doc(auth.uid).get();
    if (!modDoc.exists) {
        throw new https_1.HttpsError("internal", "Could not find moderator profile.");
    }
    const modName = ((_a = modDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || 'Support Staff';
    const ticketRef = db.collection('supportTickets').doc(ticketId);
    const messageRef = ticketRef.collection('conversation').doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(messageRef, {
        senderId: auth.uid,
        senderName: modName,
        content,
        createdAt: timestamp,
    });
    batch.update(ticketRef, { lastMessageAt: timestamp });
    const ticketSnap = await ticketRef.get();
    const ticketData = ticketSnap.data();
    if (ticketData === null || ticketData === void 0 ? void 0 : ticketData.userId) {
        const userNotifRef = db.collection(`inbox/${ticketData.userId}/notifications`).doc();
        batch.set(userNotifRef, {
            type: "support_ticket_response",
            from: auth.uid,
            read: false,
            timestamp: timestamp,
            content: `New response on your ticket: "${ticketData.subject}"`,
            extraData: { ticketId }
        });
    }
    await batch.commit();
    return { success: true, message: "Response sent." };
});
exports.resolveTicket = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new https_1.HttpsError("permission-denied", "You must be a moderator or admin to resolve tickets.");
    }
    const { ticketId } = data;
    if (!ticketId) {
        throw new https_1.HttpsError("invalid-argument", "Ticket ID is required.");
    }
    const ticketRef = db.collection('supportTickets').doc(ticketId);
    await ticketRef.update({
        status: 'closed',
        resolvedBy: auth.uid,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Ticket has been closed." };
});
//# sourceMappingURL=tickets.js.map