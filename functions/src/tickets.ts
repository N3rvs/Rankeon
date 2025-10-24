// src/functions/tickets.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateTicketData {
    subject: string;
    description: string;
}

export const createSupportTicket = onCall(async ({ auth, data }: { auth?: any, data: CreateTicketData }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in to create a ticket.");
    
    const { subject, description } = data;
    if (!subject || !description) throw new HttpsError("invalid-argument", "Subject and description are required.");

    const userDoc = await db.collection('users').doc(auth.uid).get();
    if (!userDoc.exists) throw new HttpsError("not-found", "User profile not found.");
    
    const userData = userDoc.data()!;

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

interface RespondToTicketData {
    ticketId: string;
    content: string;
}

export const respondToTicket = onCall(async ({ auth, data }: { auth?: any, data: RespondToTicketData }) => {
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new HttpsError("permission-denied", "You must be a moderator or admin to respond to tickets.");
    }
    const { ticketId, content } = data;
    if (!ticketId || !content) {
        throw new HttpsError("invalid-argument", "Ticket ID and content are required.");
    }

    const modDoc = await db.collection('users').doc(auth.uid).get();
    if (!modDoc.exists) {
        throw new HttpsError("internal", "Could not find moderator profile.");
    }
    const modName = modDoc.data()?.name || 'Support Staff';

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
    if (ticketData?.userId) {
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

interface ResolveTicketData {
    ticketId: string;
}

export const resolveTicket = onCall(async ({ auth, data }: { auth?: any, data: ResolveTicketData }) => {
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new HttpsError("permission-denied", "You must be a moderator or admin to resolve tickets.");
    }
    const { ticketId } = data;
    if (!ticketId) {
        throw new HttpsError("invalid-argument", "Ticket ID is required.");
    }

    const ticketRef = db.collection('supportTickets').doc(ticketId);
    await ticketRef.update({
        status: 'closed',
        resolvedBy: auth.uid,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Ticket has been closed." };
});
