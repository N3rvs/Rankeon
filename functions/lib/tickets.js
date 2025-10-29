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
const zod_1 = require("zod");
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();
function assertAuth(ctx) {
    if (!ctx.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    return ctx.auth.uid;
}
function isStaff(req) {
    const role = req.auth?.token?.role;
    return role === 'admin' || role === 'moderator' || role === 'support';
}
// ===== Schemas =====
const CreateTicketSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1),
    description: zod_1.z.string().min(10).max(2000),
});
const RespondSchema = zod_1.z.object({
    ticketId: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1).max(4000),
});
const ResolveSchema = zod_1.z.object({
    ticketId: zod_1.z.string().min(1),
});
// Colección usada:
// tickets/{ticketId}
//   - { ownerId, subject, description, status, createdAt, updatedAt, lastMessageAt, lastMessageBy }
// tickets/{ticketId}/messages/{messageId}
//   - { authorId, content, createdAt, authorRole }
exports.createSupportTicket = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
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
exports.respondToTicket = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { ticketId, content } = RespondSchema.parse(req.data ?? {});
    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        throw new https_1.HttpsError('not-found', 'Ticket not found');
    const t = tSnap.data();
    const owner = t.ownerId;
    // Permitir responder al owner y al staff
    if (uid !== owner && !isStaff(req)) {
        throw new https_1.HttpsError('permission-denied', 'You cannot reply to this ticket.');
    }
    if (t.status === 'resolved' && !isStaff(req)) {
        throw new https_1.HttpsError('failed-precondition', 'Ticket is resolved.');
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
exports.resolveTicket = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { ticketId } = ResolveSchema.parse(req.data ?? {});
    const tRef = db.doc(`tickets/${ticketId}`);
    const tSnap = await tRef.get();
    if (!tSnap.exists)
        throw new https_1.HttpsError('not-found', 'Ticket not found');
    const t = tSnap.data();
    // Puede cerrar el staff o el owner
    const owner = t.ownerId;
    if (uid !== owner && !isStaff(req)) {
        throw new https_1.HttpsError('permission-denied', 'You cannot resolve this ticket.');
    }
    await tRef.update({
        status: 'resolved',
        updatedAt: now(),
        lastMessageAt: now(),
        lastMessageBy: uid,
    });
    return { success: true, message: 'Ticket resolved.' };
});
//# sourceMappingURL=tickets.js.map