"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nightlyCleanup = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
require("./lib/admin");
exports.nightlyCleanup = (0, scheduler_1.onSchedule)({ schedule: "every day 03:00", region: "europe-west1", timeZone: "Europe/Madrid" }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = Date.now();
    const cutoff = now - 7 * 24 * 3600 * 1000; // 7 días
    // friendships pending → borrar o notificar
    const pend = await db.collection("friendships").where("status", "==", "pending")
        .where("createdAt", "<", cutoff).limit(500).get();
    const batch = db.batch();
    pend.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    // teams invites viejos
    const teams = await db.collection("teams").where("inviteAt", "<", cutoff).limit(500).get();
    const batch2 = db.batch();
    teams.docs.forEach(t => batch2.update(t.ref, { inviteCode: null, inviteAt: null }));
    await batch2.commit();
});
//# sourceMappingURL=cleanup.js.map