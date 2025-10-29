import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';


const db = admin.firestore();


export const cleanUpOldData = onSchedule({ schedule: 'every 24 hours', timeZone: 'Europe/Madrid', region: 'europe-west1' }, async () => {
const now = Date.now();
const ago = (days:number) => admin.firestore.Timestamp.fromDate(new Date(now - days*24*60*60*1000));


// 1) Friend requests pendientes > 30 días -> cancelar
const frSnap = await db.collection('friendRequests').where('status','==','PENDING').where('createdAt','<=',ago(30)).get();
if (!frSnap.empty) {
const batch = db.batch();
frSnap.docs.forEach(d => batch.update(d.ref, { status: 'EXPIRED', updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
await batch.commit();
}


// 2) Notificaciones leídas > 60 días -> borrar en lotes
const notifSnap = await db.collection('notifications').where('read','==',true).where('readAt','<=',ago(60)).limit(500).get();
if (!notifSnap.empty) {
const batch = db.batch();
notifSnap.docs.forEach(d => batch.delete(d.ref));
await batch.commit();
}


// 3) Chats sin mensajes -> limpiar
const emptyChats = await db.collection('chats').where('lastMessageText','==',null).limit(200).get();
for (const doc of emptyChats.docs) {
// Borrar subcolección messages
while (true) {
const msgs = await doc.ref.collection('messages').limit(300).get();
if (msgs.empty) break;
const batch = db.batch();
msgs.docs.forEach(m => batch.delete(m.ref));
await batch.commit();
} // Borrar doc chat
await doc.ref.delete();
}});