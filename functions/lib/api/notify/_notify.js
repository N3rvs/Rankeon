"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
// api/notify/_notify.ts
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
async function createNotification(to, from, type, extra = {}) {
    const db = (0, firestore_1.getFirestore)();
    // block check
    const blocked = await db.collection("blocks").doc(to).collection("list").doc(from).get();
    if (blocked.exists)
        return;
    // store inbox item
    const ref = db.collection("notifications").doc(to).collection("items").doc();
    const payload = { id: ref.id, to, from, type, extraData: extra, createdAt: Date.now(), read: false, ttlAt: Date.now() + 30 * 24 * 3600 * 1000 };
    await ref.set(payload);
    // optional push
    try {
        const user = await db.collection("users").doc(to).get();
        const tokens = (user.get("fcmTokens") ?? []);
        if (!tokens.length)
            return;
        const data = Object.fromEntries(Object.entries({ type, ...extra }).map(([k, v]) => [k, String(v)]));
        const chunkSize = 500;
        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            await (0, messaging_1.getMessaging)().sendEachForMulticast({
                tokens: chunk, data,
                android: { priority: "high" },
                apns: { headers: { "apns-priority": "10" } },
            });
        }
    }
    catch { /* opcional: log */ }
}
//# sourceMappingURL=_notify.js.map