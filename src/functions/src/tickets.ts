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
    });

    return { success: true, message: "Support ticket created successfully." };
});
