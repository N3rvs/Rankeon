// functions/src/tickets.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateTicketData {
    subject: string;
    description: string;
}

// *** Añadida región ***
export const createSupportTicket = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: CreateTicketData }) => {
    if (!auth) throw new HttpsError("unauthenticated", "You must be logged in to create a ticket.");

    const { subject, description } = data;
    if (!subject || !description) throw new HttpsError("invalid-argument", "Subject and description are required.");

    try {
        const userDoc = await db.collection('users').doc(auth.uid).get();
        if (!userDoc.exists) throw new HttpsError("not-found", "User profile not found.");

        const userData = userDoc.data()!; // Non-null assertion, assuming userDoc exists means data exists

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
    } catch (error: any) {
        console.error(`Error creating ticket for user ${auth.uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to create support ticket.');
    }
});

interface RespondToTicketData {
    ticketId: string;
    content: string;
}

// *** Añadida región ***
export const respondToTicket = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: RespondToTicketData }) => {
    // Check permissions first
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new HttpsError("permission-denied", "You must be a moderator or admin to respond to tickets.");
    }
    const { ticketId, content } = data;
    if (!ticketId || !content) {
        throw new HttpsError("invalid-argument", "Ticket ID and content are required.");
    }

    try {
        const modDoc = await db.collection('users').doc(auth.uid).get();
        // It's possible the mod/admin user doc doesn't exist, handle gracefully
        const modName = modDoc.exists ? modDoc.data()?.name : 'Support Staff';

        const ticketRef = db.collection('supportTickets').doc(ticketId);
        // Get ticket data to ensure it exists and get userId for notification
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) {
            throw new HttpsError("not-found", `Ticket ${ticketId} not found.`);
        }
        const ticketData = ticketSnap.data()!;

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

    } catch (error: any) {
        console.error(`Error responding to ticket ${ticketId} by user ${auth.uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to respond to ticket.');
    }
});

interface ResolveTicketData {
    ticketId: string;
}

// *** Añadida región ***
export const resolveTicket = onCall({ region: 'europe-west1' }, async ({ auth, data }: { auth?: any, data: ResolveTicketData }) => {
    if (!auth || (auth.token.role !== 'admin' && auth.token.role !== 'moderator')) {
        throw new HttpsError("permission-denied", "You must be a moderator or admin to resolve tickets.");
    }
    const { ticketId } = data;
    if (!ticketId) {
        throw new HttpsError("invalid-argument", "Ticket ID is required.");
    }

    const ticketRef = db.collection('supportTickets').doc(ticketId);

    try {
        // Optionally check if ticket exists before updating
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) {
            throw new HttpsError("not-found", `Ticket ${ticketId} not found.`);
        }
        // Optionally check if ticket is already closed
        if (ticketSnap.data()?.status === 'closed') {
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
    } catch (error: any) {
        console.error(`Error resolving ticket ${ticketId} by user ${auth.uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to resolve ticket.');
    }
});