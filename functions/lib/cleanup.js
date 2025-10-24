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
exports.cleanUpOldData = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.cleanUpOldData = (0, scheduler_1.onSchedule)({
    schedule: "0 7 * * *", // Todos los días a las 7:00 AM UTC
    timeZone: "Europe/Madrid",
}, async () => {
    const now = admin.firestore.Timestamp.now();
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 30 * 24 * 60 * 60 * 1000);
    const batch = db.batch();
    // 🧹 1. Eliminar solicitudes de amistad viejas
    const oldRequests = await db.collection("friendRequests")
        .where("status", "in", ["rejected", "accepted"])
        .where("createdAt", "<", sevenDaysAgo)
        .get();
    oldRequests.forEach(doc => batch.delete(doc.ref));
    // 🧹 2. Eliminar chats inactivos o vacíos por 30 días
    const oldChats = await db.collection("chats")
        .where("lastMessageAt", "<", thirtyDaysAgo)
        .get();
    for (const chat of oldChats.docs) {
        const messagesSnap = await chat.ref.collection("messages").limit(1).get();
        if (messagesSnap.empty) {
            batch.delete(chat.ref);
        }
    }
    // 🧹 3. Levantar baneos temporales expirados
    const expiredBansQuery = db.collection("users")
        .where("disabled", "==", true)
        .where("banUntil", "<=", now);
    const expiredBansSnap = await expiredBansQuery.get();
    if (!expiredBansSnap.empty) {
        console.log(`Found ${expiredBansSnap.size} expired bans to lift.`);
        for (const userDoc of expiredBansSnap.docs) {
            const uid = userDoc.id;
            try {
                // Unban in Auth
                await admin.auth().updateUser(uid, { disabled: false });
                // Unban in Firestore
                batch.update(userDoc.ref, {
                    disabled: false,
                    banUntil: admin.firestore.FieldValue.delete()
                });
                console.log(`Lifting ban for user ${uid}.`);
            }
            catch (error) {
                console.error(`Failed to lift ban for user ${uid}:`, error);
            }
        }
    }
    await batch.commit();
    console.log("✅ Limpieza completada correctamente.");
});
//# sourceMappingURL=cleanup.js.map