"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupNotifications = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
require("../..");
exports.cleanupNotifications = (0, scheduler_1.onSchedule)({ schedule: "every day 04:00", region: "europe-west1", timeZone: "Europe/Madrid" }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = Date.now();
    const cutoffRead = now - 7 * 24 * 3600 * 1000;
    const cutoffAll = now - 30 * 24 * 3600 * 1000;
    // Notificaciones por usuario
    const users = await db.collection("notifications").listDocuments();
    for (const u of users) {
        const col = u.collection("items");
        const [oldRead, veryOld] = await Promise.all([
            col.where("read", "==", true).where("createdAt", "<", cutoffRead).limit(500).get(),
            col.where("createdAt", "<", cutoffAll).limit(500).get(),
        ]);
        const batch = db.batch();
        oldRead.docs.forEach(d => batch.delete(d.ref));
        veryOld.docs.forEach(d => batch.delete(d.ref));
        if (!oldRead.empty || !veryOld.empty)
            await batch.commit();
    }
    // Invites vencidos
    const teams = await db.collection("teams").listDocuments();
    for (const t of teams) {
        const [inv, req] = await Promise.all([
            t.collection("invites").where("status", "==", "pending").where("ttlAt", "<", now).limit(500).get(),
            t.collection("joinRequests").where("status", "==", "pending").where("ttlAt", "<", now).limit(500).get(),
        ]);
        const b = db.batch();
        inv.docs.forEach(d => b.update(d.ref, { status: "expired", expiredAt: now }));
        req.docs.forEach(d => b.update(d.ref, { status: "expired", expiredAt: now }));
        if (!inv.empty || !req.empty)
            await b.commit();
    }
});
//# sourceMappingURL=cleanupNotifications.js.map