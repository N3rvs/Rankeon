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
exports.toggleSubtask = exports.addSubtask = exports.updateTaskV2 = exports.listMyTasks = exports.createTaskV2 = void 0;
// functions/src/tasks.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const db = admin.firestore();
const PAGE_SIZE = 20;
function assertAuth(ctx) { if (!ctx.auth)
    throw new https_1.HttpsError('unauthenticated', 'You must be logged in.'); return ctx.auth.uid; }
const Priority = ['low', 'normal', 'high'];
const Status = ['todo', 'doing', 'done', 'archived'];
const CreateTask = zod_1.z.object({
    title: zod_1.z.string().min(3).max(160),
    due: zod_1.z.string().datetime().optional(),
    priority: zod_1.z.enum(Priority).default('normal'),
    tags: zod_1.z.array(zod_1.z.string().min(1)).max(10).optional(),
});
const UpdateTask = zod_1.z.object({
    taskId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(3).max(160).optional(),
    due: zod_1.z.string().datetime().nullable().optional(),
    priority: zod_1.z.enum(Priority).optional(),
    status: zod_1.z.enum(Status).optional(),
    tags: zod_1.z.array(zod_1.z.string().min(1)).max(10).optional(),
});
const Cursor = zod_1.z.object({ cursor: zod_1.z.string().optional(), status: zod_1.z.enum(Status).optional(), tag: zod_1.z.string().optional() });
exports.createTaskV2 = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { title, due, priority, tags } = CreateTask.parse(req.data);
    const ref = db.collection('tasks').doc();
    await ref.set({ owner: uid, title, due: due ?? null, priority, status: 'todo', tags: tags ?? [], createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { id: ref.id };
});
exports.listMyTasks = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { cursor, status, tag } = Cursor.parse(req.data ?? {});
    let q = db.collection('tasks')
        .where('owner', '==', uid)
        .orderBy('createdAt', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
        .limit(PAGE_SIZE);
    if (status)
        q = q.where('status', '==', status);
    if (tag)
        q = q.where('tags', 'array-contains', tag);
    if (cursor) {
        const cur = await db.collection('tasks').doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return { items: res.docs.map(d => ({ id: d.id, ...d.data() })), nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null };
});
exports.updateTaskV2 = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const patch = UpdateTask.parse(req.data);
    const ref = db.doc(`tasks/${patch.taskId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Task not found');
    if (snap.data().owner !== uid)
        throw new https_1.HttpsError('permission-denied', 'Not your task');
    const { taskId, ...update } = patch;
    await ref.update({ ...update, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true };
});
exports.addSubtask = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
    const uid = assertAuth(req);
    const { taskId, title } = zod_1.z.object({ taskId: zod_1.z.string().min(1), title: zod_1.z.string().min(1).max(160) }).parse(req.data);
    const parent = await db.doc(`tasks/${taskId}`).get();
    if (!parent.exists)
        throw new https_1.HttpsError('not-found', 'Task not found');
    if (parent.data().owner !== uid)
        throw new https_1.HttpsError('permission-denied', 'Not your task');
    const subRef = db.doc(`tasks/${taskId}/subtasks/${db.collection('_').doc().id}`);
    await subRef.set({ title, done: false, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { id: subRef.id };
});
exports.toggleSubtask = (0, https_1.onCall)({ region: 'europe-west1' }, async (req) => {
});
//# sourceMappingURL=tasks.js.map