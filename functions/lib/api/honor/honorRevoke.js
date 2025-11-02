"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.honorRevoke = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
function starsFromPosNeg(pos, neg) {
    const n = Math.max(0, (pos | 0) + (neg | 0));
    const m = 10, p0 = 0.7;
    //   const p = n === 0 ? p0 : pos / n;
    const pBayes = (m * p0 + pos) / (m + n);
    const stars = 1 + 4 * pBayes;
    return Math.max(1, Math.min(5, Number(stars.toFixed(2))));
}
exports.honorRevoke = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "Login requerido.");
    const { honorId } = (req.data ?? {});
    if (!honorId)
        throw new https_1.HttpsError("invalid-argument", "honorId requerido.");
    const db = (0, firestore_1.getFirestore)();
    const honorRef = db.collection("honors").doc(honorId);
    await db.runTransaction(async (tx) => {
        const h = await tx.get(honorRef);
        if (!h.exists)
            throw new https_1.HttpsError("not-found", "Honor no existe.");
        const data = h.data();
        if (data.from !== req.auth.uid)
            throw new https_1.HttpsError("permission-denied", "No puedes revocar honores ajenos.");
        const to = data.to;
        const statsRef = db.collection("honorStats").doc(to);
        const userRef = db.collection("users").doc(to);
        const statsSnap = await tx.get(statsRef);
        const prev = statsSnap.exists ? statsSnap.data() : { pos: 0, neg: 0 };
        const next = {
            pos: prev.pos - (data.kind === "pos" ? 1 : 0),
            neg: prev.neg - (data.kind === "neg" ? 1 : 0),
        };
        next.pos = Math.max(0, next.pos);
        next.neg = Math.max(0, next.neg);
        const stars = starsFromPosNeg(next.pos, next.neg);
        tx.delete(honorRef);
        tx.set(statsRef, {
            uid: to,
            pos: next.pos,
            neg: next.neg,
            total: next.pos + next.neg,
            stars,
            updatedAt: Date.now()
        }, { merge: true });
        tx.set(userRef, {
            totalHonors: firestore_1.FieldValue.increment(-1),
            _honorUpdatedAt: Date.now()
        }, { merge: true });
    });
    return { ok: true };
});
//# sourceMappingURL=honorRevoke.js.map