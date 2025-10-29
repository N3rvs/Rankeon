import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';


const db = admin.firestore();
const PAGE_SIZE = 20 as const;


const notifTypes = [ 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'MESSAGE', 'SYSTEM' ] as const;


function assertAuth(ctx:any){ if(!ctx.auth) throw new HttpsError('unauthenticated','You must be logged in.'); return ctx.auth.uid as string; }


const AddNotifSchema = z.object({ to: z.string().min(1), type: z.enum(notifTypes), extraData: z.record(z.any()).optional() });


export const addInboxNotification = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { to, type, extraData } = AddNotifSchema.parse(req.data);
if (await db.doc(`blocks/${to}/targets/${uid}`).get().then(d => d.exists)) throw new HttpsError('permission-denied','Recipient blocks you');
const doc = db.collection('notifications').doc();
await doc.set({ to, from: uid, type, extraData: extraData ?? {}, createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false });
return { ok: true };
});


export const markNotificationsAsRead = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { ids } = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }).parse(req.data);
const snaps = await db.getAll(...ids.map(id => db.doc(`notifications/${id}`)));
const batch = db.batch();
snaps.forEach(s => { if (s.exists && (s.data() as any).to === uid) batch.update(s.ref, { read: true, readAt: admin.firestore.FieldValue.serverTimestamp() }); });
await batch.commit();
return { ok: true };
});


export const deleteNotifications = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { ids } = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }).parse(req.data);
const snaps = await db.getAll(...ids.map(id => db.doc(`notifications/${id}`)));
const batch = db.batch();
snaps.forEach(s => { if (s.exists && (s.data() as any).to === uid) batch.delete(s.ref); });
await batch.commit();
return { ok: true };
});


export const getInbox = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { cursor } = z.object({ cursor: z.string().optional() }).parse(req.data ?? {});
let q = db.collection('notifications').where('to', '==', uid).orderBy('createdAt', 'desc').orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(PAGE_SIZE);
if (cursor) { const cur = await db.collection('notifications').doc(cursor).get(); if (cur.exists) q = q.startAfter(cur); }
const res = await q.get();
return { items: res.docs.map(d=>({ id:d.id, ...d.data()})), nextCursor: res.size===PAGE_SIZE? res.docs[res.docs.length-1].id: null };
});


export const blockUser = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { userId } = z.object({ userId: z.string().min(1) }).parse(req.data);
await db.doc(`blocks/${uid}/targets/${userId}`).set({ by: uid, target: userId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
return { ok: true };
});


export const unblockUser = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { userId } = z.object({ userId: z.string().min(1) }).parse(req.data);
await db.doc(`blocks/${uid}/targets/${userId}`).delete();
return { ok: true };
});