"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subtaskDelete = exports.subtaskToggle = exports.subtaskAdd = exports.taskDelete = exports.taskUpdate = exports.taskListMine = exports.taskCreate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const db = (0, firestore_1.getFirestore)();
const PAGE_SIZE = 20;
function assertAuth(req) {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión.");
    return req.auth.uid;
}
const Priority = ["low", "normal", "high"];
const Status = ["todo", "doing", "done", "archived"];
const CreateTask = zod_1.z.object({
    title: zod_1.z.string().min(3).max(160),
    due: zod_1.z.string().datetime().optional(),
    priority: zod_1.z.enum(Priority).default("normal"),
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
const Cursor = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    status: zod_1.z.enum(Status).optional(),
    tag: zod_1.z.string().optional(),
});
// ================== Create ==================
exports.taskCreate = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { title, due, priority, tags } = CreateTask.parse(req.data ?? {});
    const ref = db.collection("tasks").doc();
    await ref.set({
        owner: uid,
        title,
        due: due ?? null, // ISO string o null
        priority,
        status: "todo",
        tags: tags ?? [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
    return { id: ref.id };
});
// ================== List mine (paginado) ==================
exports.taskListMine = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { cursor, status, tag } = Cursor.parse(req.data ?? {});
    let q = db
        .collection("tasks")
        .where("owner", "==", uid)
        .orderBy("createdAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc")
        .limit(PAGE_SIZE);
    if (status)
        q = q.where("status", "==", status);
    if (tag)
        q = q.where("tags", "array-contains", tag);
    if (cursor) {
        const cur = await db.collection("tasks").doc(cursor).get();
        if (cur.exists)
            q = q.startAfter(cur);
    }
    const res = await q.get();
    return {
        items: res.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
});
// ================== Update ==================
exports.taskUpdate = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const patch = UpdateTask.parse(req.data ?? {});
    const ref = db.doc(`tasks/${patch.taskId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Task not found.");
    if (snap.data().owner !== uid) {
        throw new https_1.HttpsError("permission-denied", "Not your task.");
    }
    const { taskId, ...update } = patch;
    await ref.update({ ...update, updatedAt: Date.now() });
    return { ok: true };
});
// ================== Delete ==================
exports.taskDelete = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { taskId } = zod_1.z.object({ taskId: zod_1.z.string().min(1) }).parse(req.data ?? {});
    const ref = db.doc(`tasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists)
        return { ok: true }; // idempotente
    if (snap.data().owner !== uid) {
        throw new https_1.HttpsError("permission-denied", "Not your task.");
    }
    // borra subtareas en lotes
    const subCol = ref.collection("subtasks");
    while (true) {
        const chunk = await subCol.orderBy(firestore_1.FieldPath.documentId()).limit(400).get();
        if (chunk.empty)
            break;
        const b = db.batch();
        chunk.docs.forEach((d) => b.delete(d.ref));
        await b.commit();
        if (chunk.size < 400)
            break;
    }
    await ref.delete();
    return { ok: true };
});
// ================== Add subtask ==================
exports.subtaskAdd = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { taskId, title } = zod_1.z
        .object({ taskId: zod_1.z.string().min(1), title: zod_1.z.string().min(1).max(160) })
        .parse(req.data ?? {});
    const parent = await db.doc(`tasks/${taskId}`).get();
    if (!parent.exists)
        throw new https_1.HttpsError("not-found", "Task not found.");
    if (parent.data().owner !== uid) {
        throw new https_1.HttpsError("permission-denied", "Not your task.");
    }
    const subRef = db.collection(`tasks/${taskId}/subtasks`).doc();
    await subRef.set({
        title,
        done: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
    // toque al padre
    await parent.ref.update({ updatedAt: Date.now() });
    return { id: subRef.id };
});
// ================== Toggle subtask (✓) ==================
exports.subtaskToggle = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { taskId, subtaskId } = zod_1.z
        .object({ taskId: zod_1.z.string().min(1), subtaskId: zod_1.z.string().min(1) })
        .parse(req.data ?? {});
    const taskRef = db.doc(`tasks/${taskId}`);
    const subRef = taskRef.collection("subtasks").doc(subtaskId);
    await db.runTransaction(async (tx) => {
        const [taskSnap, subSnap] = await Promise.all([tx.get(taskRef), tx.get(subRef)]);
        if (!taskSnap.exists)
            throw new https_1.HttpsError("not-found", "Task not found.");
        if (taskSnap.data().owner !== uid) {
            throw new https_1.HttpsError("permission-denied", "Not your task.");
        }
        if (!subSnap.exists)
            throw new https_1.HttpsError("not-found", "Subtask not found.");
        const done = !!subSnap.data().done;
        tx.update(subRef, { done: !done, updatedAt: Date.now() });
        tx.update(taskRef, { updatedAt: Date.now() });
    });
    return { ok: true };
});
// ================== Delete subtask ==================
exports.subtaskDelete = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 }, async (req) => {
    const uid = assertAuth(req);
    const { taskId, subtaskId } = zod_1.z
        .object({ taskId: zod_1.z.string().min(1), subtaskId: zod_1.z.string().min(1) })
        .parse(req.data ?? {});
    const taskRef = db.doc(`tasks/${taskId}`);
    const [taskSnap] = await Promise.all([taskRef.get()]);
    if (!taskSnap.exists)
        throw new https_1.HttpsError("not-found", "Task not found.");
    if (taskSnap.data().owner !== uid) {
        throw new https_1.HttpsError("permission-denied", "Not your task.");
    }
    await taskRef.collection("subtasks").doc(subtaskId).delete();
    await taskRef.update({ updatedAt: Date.now() });
    return { ok: true };
});
//# sourceMappingURL=task.js.map