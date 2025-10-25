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
// *** Añadida región ***
exports.cleanUpOldData = (0, scheduler_1.onSchedule)({
    schedule: "0 7 * * *", // Todos los días a las 7:00 AM UTC
    timeZone: "Europe/Madrid",
    region: 'europe-west1' // <-- Región añadida explícitamente
}, async (event) => {
    // console.log(`Executing scheduled cleanup job at ${event.time}`); // Log de inicio
    const now = admin.firestore.Timestamp.now();
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 30 * 24 * 60 * 60 * 1000);
    // --- Tareas 1 y 2 (Limpieza de chats y solicitudes) ---
    const mainBatch = db.batch();
    let itemsInMainBatch = 0; // Contador para evitar batches vacíos
    try {
        // 🧹 1. Eliminar solicitudes de amistad viejas
        const oldRequests = await db.collection("friendRequests")
            .where("status", "in", ["rejected", "accepted"])
            .where("createdAt", "<", sevenDaysAgo)
            .limit(400) // Limitar por si hay muchas, para no exceder límites de batch
            .get();
        if (!oldRequests.empty) {
            console.log(`Found ${oldRequests.size} old friend requests to delete.`);
            oldRequests.forEach(doc => mainBatch.delete(doc.ref));
            itemsInMainBatch += oldRequests.size;
        }
        // 🧹 2. Eliminar chats inactivos Y vacíos por 30 días
        const oldChats = await db.collection("chats")
            .where("lastMessageAt", "<", thirtyDaysAgo)
            .limit(100) // Limitar la consulta inicial
            .get();
        if (!oldChats.empty) {
            console.log(`Checking ${oldChats.size} potentially old chats for emptiness.`);
            let emptyChatsFound = 0;
            for (const chat of oldChats.docs) {
                // Comprobar si la subcolección de mensajes está vacía
                const messagesSnap = await chat.ref.collection("messages").limit(1).get();
                if (messagesSnap.empty) {
                    if (itemsInMainBatch < 500) { // Respetar límite de batch
                        mainBatch.delete(chat.ref);
                        itemsInMainBatch++;
                        emptyChatsFound++;
                    }
                    else {
                        console.warn("Main batch limit reached before checking all chats.");
                        break; // Salir del bucle si el batch está lleno
                    }
                }
            }
            if (emptyChatsFound > 0) {
                console.log(`Found ${emptyChatsFound} empty old chats to delete.`);
            }
        }
        // Ejecuta el batch solo si tiene operaciones
        if (itemsInMainBatch > 0) {
            await mainBatch.commit();
            console.log(`✅ Batch cleanup successful (${itemsInMainBatch} operations).`);
        }
        else {
            console.log("No old requests or empty chats found for batch cleanup.");
        }
    }
    catch (error) {
        console.error("Error during batch cleanup (requests/chats):", error);
        // No lanzar error aquí para permitir que continúe con los baneos
    }
    // --- Tarea 3 (Levantar baneos) ---
    try {
        const expiredBansQuery = db.collection("users")
            .where("disabled", "==", true)
            .where("banUntil", "<=", now);
        const expiredBansSnap = await expiredBansQuery.get();
        if (!expiredBansSnap.empty) {
            console.log(`Found ${expiredBansSnap.size} expired bans to lift.`);
            let bansLifted = 0;
            // Itera y ejecuta actualizaciones individuales
            for (const userDoc of expiredBansSnap.docs) {
                const uid = userDoc.id;
                try {
                    // 1. Unban in Auth
                    await admin.auth().updateUser(uid, { disabled: false });
                    // 2. Unban in Firestore
                    await userDoc.ref.update({
                        disabled: false,
                        banUntil: admin.firestore.FieldValue.delete()
                    });
                    console.log(`Successfully lifted ban for user ${uid}.`);
                    bansLifted++;
                }
                catch (error) {
                    // Loguear error por usuario pero continuar con los demás
                    console.error(`Failed to lift ban for user ${uid}:`, error);
                }
            }
            console.log(`✅ Finished processing bans. Lifted: ${bansLifted}/${expiredBansSnap.size}.`);
        }
        else {
            console.log("No expired bans found.");
        }
    }
    catch (error) {
        console.error("Error querying for expired bans:", error);
        // No lanzar error para que la función termine correctamente
    }
    console.log(`Scheduled cleanup job finished at ${new Date().toISOString()}`);
});
//# sourceMappingURL=cleanup.js.map