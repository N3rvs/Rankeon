"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.honorGive = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
require("../lib/admin");
const positiveTypes = ["MVP", "FAIR_PLAY", "LEADERSHIP"];
const negativeTypes = ["TOXIC", "GRIEFING", "AFK"]; // añade las que necesites
const Input = zod_1.z.object({
    to: zod_1.z.string().min(1),
    kind: zod_1.z.enum(["pos", "neg"]),
    type: zod_1.z.union([zod_1.z.enum(positiveTypes), zod_1.z.enum(negativeTypes)]),
    reason: zod_1.z.string().min(3).max(200).optional(),
});
function starsFromPosNeg(pos, neg) {
    const n = Math.max(0, (pos | 0) + (neg | 0));
    const m = 10, p0 = 0.7;
    //   const p = n === 0 ? p0 : pos / n;
    const pBayes = (m * p0 + pos) / (m + n);
    const stars = 1 + 4 * pBayes;
    return Math.max(1, Math.min(5, Number(stars.toFixed(2))));
}
exports.honorGive = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { to, kind, type, reason } = Input.parse(req.data ?? {});
    const from = req.auth.uid;
    if (from === to)
        throw new https_1.HttpsError("failed-precondition", "No puedes darte honor a ti mismo.");
    const db = (0, firestore_1.getFirestore)();
    // límites: 5 honores por día por emisor; 1 por día al mismo receptor
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const [countSender, countPair, blocked] = await Promise.all([
        db.collection("honors").where("from", "==", from).where("createdAt", ">=", since).count().get(),
        db.collection("honors").where("from", "==", from).where("to", "==", to).where("createdAt", ">=", since).count().get(),
        db.collection("blocks").doc(to).collection("list").doc(from).get(),
    ]);
    if (blocked.exists)
        throw new https_1.HttpsError("permission-denied", "El usuario no acepta interacciones tuyas.");
    if (countSender.data().count >= 5)
        throw new https_1.HttpsError("resource-exhausted", "Límite diario alcanzado.");
    if (countPair.data().count >= 1)
        throw new https_1.HttpsError("resource-exhausted", "Ya valoraste a esta persona hoy.");
    const honorRef = db.collection("honors").doc();
    const statsRef = db.collection("honorStats").doc(to);
    const userRef = db.collection("users").doc(to);
    await db.runTransaction(async (tx) => {
        const statsSnap = await tx.get(statsRef);
        const prev = statsSnap.exists ? statsSnap.data() : { pos: 0, neg: 0 };
        const next = {
            pos: prev.pos + (kind === "pos" ? 1 : 0),
            neg: prev.neg + (kind === "neg" ? 1 : 0),
        };
        const stars = starsFromPosNeg(next.pos, next.neg);
        tx.set(honorRef, {
            id: honorRef.id, from, to, kind, type, reason: reason ?? null,
            createdAt: Date.now()
        });
        tx.set(statsRef, {
            uid: to,
            pos: next.pos,
            neg: next.neg,
            total: next.pos + next.neg,
            stars,
            updatedAt: Date.now()
        }, { merge: true });
        tx.set(userRef, {
            totalHonors: firestore_1.FieldValue.increment(1),
            _honorUpdatedAt: Date.now()
        }, { merge: true });
    });
    return { ok: true, id: honorRef.id };
});
//# sourceMappingURL=honorGive.js.map