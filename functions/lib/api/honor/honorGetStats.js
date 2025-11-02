"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.honorGetStats = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
exports.honorGetStats = (0, https_1.onCall)({ region: "europe-west1", enforceAppCheck: true }, async (req) => {
    const { uid } = zod_1.z.object({ uid: zod_1.z.string().min(1) }).parse(req.data ?? {});
    const snap = await (0, firestore_1.getFirestore)().collection("honorStats").doc(uid).get();
    if (!snap.exists)
        return { pos: 0, neg: 0, total: 0, stars: 3.5 };
    const { pos = 0, neg = 0, total = 0, stars = 3.5 } = snap.data();
    return { pos, neg, total, stars };
});
//# sourceMappingURL=honorGetStats.js.map