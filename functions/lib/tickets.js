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
// functions/src/tickets.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// *** Añadida región ***
exports.createSupportTicket = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to create a ticket.");
    const { subject, description } = data;
    if (!subject || !description)
        throw new https_1.HttpsError("invalid-argument", "Subject and description are required.");
    try {
        const userDoc = await db.collection('users').doc(auth.uid).get();
        if (!userDoc.exists)
            throw new https_1.HttpsError("not-found", "User profile not found.");
        const userData = userDoc.data(); // Non-null assertion, assuming userDoc exists means data exists
        const ticketRef = db.collection("supportTickets").doc();
        await ticketRef.set({
            id: ticketRef.id,
            userId: auth.uid,
            userName: userData.name || 'Unknown User', // Fallback for name
            userEmail: userData.email, // Assume email exists if user exists
            subject,
            description,
            status: 'open',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "Support ticket created successfully." };
    }
    catch (error) {
        console.error(`Error creating ticket for user ${auth.uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to create support ticket.');
    }
});
// *** Añadida región ***
exports.respondToTicket = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    var _a;
    // Check permissions first
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new https_1.HttpsError("permission-denied", "You must be a moderator or admin to respond to tickets.");
    }
    const { ticketId, content } = data;
    if (!ticketId || !content) {
        throw new https_1.HttpsError("invalid-argument", "Ticket ID and content are required.");
    }
    try {
        const modDoc = await db.collection('users').doc(auth.uid).get();
        // It's possible the mod/admin user doc doesn't exist, handle gracefully
        const modName = modDoc.exists ? (_a = modDoc.data()) === null || _a === void 0 ? void 0 : _a.name : 'Support Staff';
        const ticketRef = db.collection('supportTickets').doc(ticketId);
        // Get ticket data to ensure it exists and get userId for notification
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) {
            throw new https_1.HttpsError("not-found", `Ticket ${ticketId} not found.`);
        }
        const ticketData = ticketSnap.data();
        const messageRef = ticketRef.collection('conversation').doc();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();
        // Add message to conversation subcollection
        batch.set(messageRef, {
            senderId: auth.uid,
            senderName: modName,
            content,
            createdAt: timestamp,
        });
        // Update last message timestamp on the main ticket doc
        batch.update(ticketRef, { lastMessageAt: timestamp, status: 'replied' }); // Optionally update status
        // Send notification to the user who created the ticket
        if (ticketData.userId) {
            const userNotifRef = db.collection(`inbox/${ticketData.userId}/notifications`).doc();
            batch.set(userNotifRef, {
                type: "support_ticket_response",
                from: auth.uid, // Could be mod/admin ID
                read: false,
                timestamp: timestamp,
                content: `New response on your ticket: "${ticketData.subject}"`,
                extraData: { ticketId }
            });
        }
        await batch.commit();
        return { success: true, message: "Response sent successfully." };
    }
    catch (error) {
        console.error(`Error responding to ticket ${ticketId} by user ${auth.uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to respond to ticket.');
    }
});
// *** Añadida región ***
exports.resolveTicket = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    var _a;
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new https_1.HttpsError("permission-denied", "You must be a moderator or admin to resolve tickets.");
    }
    const { ticketId } = data;
    if (!ticketId) {
        throw new https_1.HttpsError("invalid-argument", "Ticket ID is required.");
    }
    const ticketRef = db.collection('supportTickets').doc(ticketId);
    try {
        // Optionally check if ticket exists before updating
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) {
            throw new https_1.HttpsError("not-found", `Ticket ${ticketId} not found.`);
        }
        // Optionally check if ticket is already closed
        if (((_a = ticketSnap.data()) === null || _a === void 0 ? void 0 : _a.status) === 'closed') {
            return { success: true, message: "Ticket was already closed." };
        }
        await ticketRef.update({
            status: 'closed',
            resolvedBy: auth.uid,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Optionally notify the user
        // const ticketData = ticketSnap.data();
        // if (ticketData?.userId) { ... send notification ... }
        return { success: true, message: "Ticket has been closed." };
    }
    catch (error) {
        console.error(`Error resolving ticket ${ticketId} by user ${auth.uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to resolve ticket.');
    }
});
//# sourceMappingURL=tickets.js.map