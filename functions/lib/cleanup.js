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
<<<<<<< HEAD
    // *** INICIO DE LA CORRECCIÓN ***
    // El batch principal solo se usará para tareas 1 y 2
    const mainBatch = db.batch();
=======
    const batch = db.batch();
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    // 🧹 1. Eliminar solicitudes de amistad viejas
    const oldRequests = await db.collection("friendRequests")
        .where("status", "in", ["rejected", "accepted"])
        .where("createdAt", "<", sevenDaysAgo)
        .get();
<<<<<<< HEAD
    oldRequests.forEach(doc => mainBatch.delete(doc.ref));
=======
    oldRequests.forEach(doc => batch.delete(doc.ref));
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    // 🧹 2. Eliminar chats inactivos o vacíos por 30 días
    const oldChats = await db.collection("chats")
        .where("lastMessageAt", "<", thirtyDaysAgo)
        .get();
    for (const chat of oldChats.docs) {
        const messagesSnap = await chat.ref.collection("messages").limit(1).get();
        if (messagesSnap.empty) {
<<<<<<< HEAD
            mainBatch.delete(chat.ref);
        }
    }
    // Ejecuta el batch de limpieza (Tareas 1 y 2)
    try {
        await mainBatch.commit();
        console.log("✅ Limpieza de chats y solicitudes de amistad completada.");
    }
    catch (error) {
        console.error("Error en el batch de limpieza (tareas 1 y 2):", error);
    }
    // *** FIN DE LA CORRECCIÓN PARCIAL ***
    // 🧹 3. Levantar baneos temporales expirados
    // ESTO SE EJECUTA POR SEPARADO DEL BATCH PRINCIPAL
=======
            batch.delete(chat.ref);
        }
    }
    // 🧹 3. Levantar baneos temporales expirados
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    const expiredBansQuery = db.collection("users")
        .where("disabled", "==", true)
        .where("banUntil", "<=", now);
    const expiredBansSnap = await expiredBansQuery.get();
    if (!expiredBansSnap.empty) {
        console.log(`Found ${expiredBansSnap.size} expired bans to lift.`);
<<<<<<< HEAD
        // Itera y ejecuta las actualizaciones por usuario para mantener la consistencia
        for (const userDoc of expiredBansSnap.docs) {
            const uid = userDoc.id;
            try {
                // *** INICIO DE LA CORRECCIÓN ***
                // Ambas operaciones (Auth y Firestore) deben estar juntas
                // 1. Unban in Auth
                await admin.auth().updateUser(uid, { disabled: false });
                // 2. Unban in Firestore (se ejecuta inmediatamente)
                await userDoc.ref.update({
                    disabled: false,
                    banUntil: admin.firestore.FieldValue.delete()
                });
                // *** FIN DE LA CORRECCIÓN ***
                console.log(`Lifting ban for user ${uid}.`);
            }
            catch (error) {
                // Si falla, al menos lo registramos.
                // El usuario puede quedar inconsistente, pero solo este usuario.
=======
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
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
                console.error(`Failed to lift ban for user ${uid}:`, error);
            }
        }
    }
<<<<<<< HEAD
    console.log("✅ Proceso de limpieza de baneos completado.");
=======
    await batch.commit();
    console.log("✅ Limpieza completada correctamente.");
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
});
//# sourceMappingURL=cleanup.js.map