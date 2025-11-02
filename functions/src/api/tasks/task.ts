import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { z } from "zod";

const db = getFirestore();
const PAGE_SIZE = 20 as const;

function assertAuth(req: any) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  return req.auth.uid as string;
}

const Priority = ["low", "normal", "high"] as const;
const Status   = ["todo", "doing", "done", "archived"] as const;

const CreateTask = z.object({
  title: z.string().min(3).max(160),
  due: z.string().datetime().optional(),
  priority: z.enum(Priority).default("normal"),
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

const Cursor = z.object({
  cursor: z.string().optional(),
  status: z.enum(Status).optional(),
  tag: z.string().optional(),
});

// ================== Create ==================
export const taskCreate = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
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
  }
);

// ================== List mine (paginado) ==================
export const taskListMine = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { cursor, status, tag } = Cursor.parse(req.data ?? {});

    let q: FirebaseFirestore.Query = db
      .collection("tasks")
      .where("owner", "==", uid)
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (status) q = q.where("status", "==", status);
    if (tag) q = q.where("tags", "array-contains", tag);

    if (cursor) {
      const cur = await db.collection("tasks").doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const res = await q.get();
    return {
      items: res.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      nextCursor: res.size === PAGE_SIZE ? res.docs[res.docs.length - 1].id : null,
    };
  }
);

// ================== Update ==================
export const taskUpdate = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const patch = UpdateTask.parse(req.data ?? {});
    const ref = db.doc(`tasks/${patch.taskId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Task not found.");
    if ((snap.data() as any).owner !== uid) {
      throw new HttpsError("permission-denied", "Not your task.");
    }
    const { taskId, ...update } = patch as any;
    await ref.update({ ...update, updatedAt: Date.now() });
    return { ok: true };
  }
);

// ================== Delete ==================
export const taskDelete = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { taskId } = z.object({ taskId: z.string().min(1) }).parse(req.data ?? {});
    const ref = db.doc(`tasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists) return { ok: true }; // idempotente
    if ((snap.data() as any).owner !== uid) {
      throw new HttpsError("permission-denied", "Not your task.");
    }

    // borra subtareas en lotes
    const subCol = ref.collection("subtasks");
    while (true) {
      const chunk = await subCol.orderBy(FieldPath.documentId()).limit(400).get();
      if (chunk.empty) break;
      const b = db.batch();
      chunk.docs.forEach((d) => b.delete(d.ref));
      await b.commit();
      if (chunk.size < 400) break;
    }

    await ref.delete();
    return { ok: true };
  }
);

// ================== Add subtask ==================
export const subtaskAdd = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { taskId, title } = z
      .object({ taskId: z.string().min(1), title: z.string().min(1).max(160) })
      .parse(req.data ?? {});

    const parent = await db.doc(`tasks/${taskId}`).get();
    if (!parent.exists) throw new HttpsError("not-found", "Task not found.");
    if ((parent.data() as any).owner !== uid) {
      throw new HttpsError("permission-denied", "Not your task.");
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
  }
);

// ================== Toggle subtask (✓) ==================
export const subtaskToggle = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { taskId, subtaskId } = z
      .object({ taskId: z.string().min(1), subtaskId: z.string().min(1) })
      .parse(req.data ?? {});

    const taskRef = db.doc(`tasks/${taskId}`);
    const subRef  = taskRef.collection("subtasks").doc(subtaskId);

    await db.runTransaction(async (tx) => {
      const [taskSnap, subSnap] = await Promise.all([tx.get(taskRef), tx.get(subRef)]);
      if (!taskSnap.exists) throw new HttpsError("not-found", "Task not found.");
      if ((taskSnap.data() as any).owner !== uid) {
        throw new HttpsError("permission-denied", "Not your task.");
      }
      if (!subSnap.exists) throw new HttpsError("not-found", "Subtask not found.");

      const done = !!(subSnap.data() as any).done;
      tx.update(subRef, { done: !done, updatedAt: Date.now() });
      tx.update(taskRef, { updatedAt: Date.now() });
    });

    return { ok: true };
  }
);

// ================== Delete subtask ==================
export const subtaskDelete = onCall(
  { region: "europe-west1", enforceAppCheck: true, timeoutSeconds: 15 },
  async (req) => {
    const uid = assertAuth(req);
    const { taskId, subtaskId } = z
      .object({ taskId: z.string().min(1), subtaskId: z.string().min(1) })
      .parse(req.data ?? {});

    const taskRef = db.doc(`tasks/${taskId}`);
    const [taskSnap] = await Promise.all([taskRef.get()]);
    if (!taskSnap.exists) throw new HttpsError("not-found", "Task not found.");
    if ((taskSnap.data() as any).owner !== uid) {
      throw new HttpsError("permission-denied", "Not your task.");
    }
    await taskRef.collection("subtasks").doc(subtaskId).delete();
    await taskRef.update({ updatedAt: Date.now() });
    return { ok: true };
  }
);
