// functions/src/tickets.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

function assertAuth(ctx: any) {
  if (!ctx.auth?.uid) throw new HttpsError('unauthenticated', 'You must be logged in.');
  return ctx.auth.uid as string;
}
function isStaff(req: any) {
  const role = (req.auth?.token as any)?.role;
  return role === 'admin' || role === 'moderator' || role === 'support';
}

// ===== Schemas =====
const CreateTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(10).max(2000),
});

const RespondSchema = z.object({
  ticketId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

const ResolveSchema = z.object({
  ticketId: z.string().min(1),
});

// Colección usada:
// tickets/{ticketId}
//   - { ownerId, subject, description, status, createdAt, updatedAt, lastMessageAt, lastMessageBy }
// tickets/{ticketId}/messages/{messageId}
//   - { authorId, content, createdAt, authorRole }

export const createSupportTicket = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const data = CreateTicketSchema.parse(req.data ?? {});
  const ticketRef = db.collection('tickets').doc();

  await ticketRef.set({
    ownerId: uid,
    subject: data.subject,
    description: data.description,
    status: 'open', // open | resolved
    createdAt: now(),
    updatedAt: now(),
    lastMessageAt: now(),
    lastMessageBy: uid,
  });

  // primer mensaje (opcional, para hilo)
  const msgRef = ticketRef.collection('messages').doc();
  await msgRef.set({
    authorId: uid,
    authorRole: 'user',
    content: data.description,
    createdAt: now(),
  });

  return { success: true, message: 'Ticket created successfully.' };
});

export const respondToTicket = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { ticketId, content } = RespondSchema.parse(req.data ?? {});

  const tRef = db.doc(`tickets/${ticketId}`);
  const tSnap = await tRef.get();
  if (!tSnap.exists) throw new HttpsError('not-found', 'Ticket not found');

  const t = tSnap.data() as any;
  const owner = t.ownerId as string;

  // Permitir responder al owner y al staff
  if (uid !== owner && !isStaff(req)) {
    throw new HttpsError('permission-denied', 'You cannot reply to this ticket.');
  }
  if (t.status === 'resolved' && !isStaff(req)) {
    throw new HttpsError('failed-precondition', 'Ticket is resolved.');
  }

  const msgRef = tRef.collection('messages').doc();
  await msgRef.set({
    authorId: uid,
    authorRole: uid === owner ? 'user' : 'staff',
    content,
    createdAt: now(),
  });

  await tRef.update({
    updatedAt: now(),
    lastMessageAt: now(),
    lastMessageBy: uid,
    // si estaba resuelto y escribe el usuario, reabrimos
    status: uid === owner && t.status === 'resolved' ? 'open' : t.status,
  });

  return { success: true, message: 'Reply posted.' };
});

export const resolveTicket = onCall({ region: 'europe-west1' }, async (req) => {
  const uid = assertAuth(req);
  const { ticketId } = ResolveSchema.parse(req.data ?? {});

  const tRef = db.doc(`tickets/${ticketId}`);
  const tSnap = await tRef.get();
  if (!tSnap.exists) throw new HttpsError('not-found', 'Ticket not found');

  const t = tSnap.data() as any;

  // Puede cerrar el staff o el owner
  const owner = t.ownerId as string;
  if (uid !== owner && !isStaff(req)) {
    throw new HttpsError('permission-denied', 'You cannot resolve this ticket.');
  }

  await tRef.update({
    status: 'resolved',
    updatedAt: now(),
    lastMessageAt: now(),
    lastMessageBy: uid,
  });

  return { success: true, message: 'Ticket resolved.' };
});
