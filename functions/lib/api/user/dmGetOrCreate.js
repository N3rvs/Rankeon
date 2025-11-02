"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmGetOrCreate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.dmGetOrCreate = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { targetUid } = (req.data ?? {});
    if (!targetUid)
        throw new https_1.HttpsError("invalid-argument", "targetUid requerido.");
    if (targetUid === req.auth.uid)
        throw new https_1.HttpsError("failed-precondition", "Conversación consigo mismo no permitida.");
    const db = (0, firestore_1.getFirestore)();
    // bloqueos mutuos
    const [a, b] = await Promise.all([
        db.collection("blocks").doc(req.auth.uid).collection("list").doc(targetUid).get(),
        db.collection("blocks").doc(targetUid).collection("list").doc(req.auth.uid).get(),
    ]);
    if (a.exists || b.exists)
        throw new https_1.HttpsError("permission-denied", "No disponible por bloqueo.");
    // busca conv existente
    const exists = await db.collection("conversations")
        .where("members", "array-contains", req.auth.uid).limit(25).get();
    const found = exists.docs.find(d => {
        const m = d.get("members");
        return m.length === 2 && m.includes(targetUid);
    });
    if (found)
        return { convId: found.id };
    // crea conv
    const ref = await db.collection("conversations").add({
        members: [req.auth.uid, targetUid],
        createdAt: Date.now()
    });
    return { convId: ref.id };
});
//# sourceMappingURL=dmGetOrCreate.js.map