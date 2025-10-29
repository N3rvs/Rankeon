// functions/src/tasks.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';


const db = admin.firestore();
const PAGE_SIZE = 20 as const;


function assertAuth(ctx:any){ if(!ctx.auth) throw new HttpsError('unauthenticated','You must be logged in.'); return ctx.auth.uid as string; }


const Priority = [ 'low','normal','high' ] as const;
const Status = [ 'todo','doing','done','archived' ] as const;


const CreateTask = z.object({
title: z.string().min(3).max(160),
due: z.string().datetime().optional(),
priority: z.enum(Priority).default('normal'),
tags: z.array(z.string().min(1)).max(10).optional(),
});


const UpdateTask = z.object({
taskId: z.string().min(1),
title: z.string().min(3).max(160).optional(),
due: z.string().datetime().nullable().optional(),
priority: z.enum(Priority).optional(),
status: z.enum(Status).optional(),
tags: z.array(z.string().min(1)).max(10).optional(),
});


const Cursor = z.object({ cursor: z.string().optional(), status: z.enum(Status).optional(), tag: z.string().optional() });


export const createTaskV2 = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { title, due, priority, tags } = CreateTask.parse(req.data);
const ref = db.collection('tasks').doc();
await ref.set({ owner: uid, title, due: due ?? null, priority, status: 'todo', tags: tags ?? [], createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
return { id: ref.id };
});


export const listMyTasks = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { cursor, status, tag } = Cursor.parse(req.data ?? {});
let q: FirebaseFirestore.Query = db.collection('tasks')
.where('owner','==',uid)
.orderBy('createdAt','desc')
.orderBy(admin.firestore.FieldPath.documentId(),'desc')
.limit(PAGE_SIZE);
if (status) q = q.where('status','==',status);
if (tag) q = q.where('tags','array-contains',tag);
if (cursor) { const cur = await db.collection('tasks').doc(cursor).get(); if (cur.exists) q = q.startAfter(cur); }
const res = await q.get();
return { items: res.docs.map(d=>({ id:d.id, ...d.data()})), nextCursor: res.size===PAGE_SIZE? res.docs[res.docs.length-1].id: null };
});


export const updateTaskV2 = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const patch = UpdateTask.parse(req.data);
const ref = db.doc(`tasks/${patch.taskId}`);
const snap = await ref.get();
if (!snap.exists) throw new HttpsError('not-found','Task not found');
if ((snap.data() as any).owner !== uid) throw new HttpsError('permission-denied','Not your task');
const { taskId, ...update } = patch as any;
await ref.update({ ...update, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
return { ok: true };
});


export const addSubtask = onCall({ region: 'europe-west1' }, async (req) => {
const uid = assertAuth(req);
const { taskId, title } = z.object({ taskId: z.string().min(1), title: z.string().min(1).max(160) }).parse(req.data);
const parent = await db.doc(`tasks/${taskId}`).get();
if (!parent.exists) throw new HttpsError('not-found','Task not found');
if ((parent.data() as any).owner !== uid) throw new HttpsError('permission-denied','Not your task');
const subRef = db.doc(`tasks/${taskId}/subtasks/${db.collection('_').doc().id}`);
await subRef.set({ title, done: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
return { id: subRef.id };
});


export const toggleSubtask = onCall({ region: 'europe-west1' }, async (req) => {
});