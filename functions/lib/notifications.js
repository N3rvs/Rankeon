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
exports.unblockUser = exports.blockUser = exports.clearAllNotifications = exports.deleteNotifications = exports.markNotificationsAsRead = exports.addInboxNotification = void 0;
// functions/src/notifications.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// *** Añadida región ***
exports.addInboxNotification = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const { to, type, extraData } = data;
    if (!to || !type) {
        throw new https_1.HttpsError("invalid-argument", "Missing recipient (to) or notification type.");
    }
    try {
        await db.collection(`inbox/${to}/notifications`).add({
            from: uid,
            type,
            extraData: extraData || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });
        return { success: true };
    }
    catch (error) {
        console.error(`Error adding notification for user ${to}:`, error);
        // Lanza HttpsError para que el cliente reciba el error
        throw new https_1.HttpsError("internal", error.message || "Failed to add notification.");
    }
});
// *** Añadida región ***
exports.markNotificationsAsRead = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const { notificationIds } = data;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "An array of notification IDs is required.");
    }
    // Firestore batch limit is 500 operations
    if (notificationIds.length > 500) {
        throw new https_1.HttpsError("invalid-argument", "Cannot mark more than 500 notifications at once.");
    }
    try {
        const batch = db.batch();
        const notificationsRef = db.collection(`inbox/${uid}/notifications`);
        notificationIds.forEach(id => {
            // Validar ID mínimamente (no vacío)
            if (typeof id === 'string' && id.length > 0) {
                const docRef = notificationsRef.doc(id);
                batch.update(docRef, { read: true });
            }
            else {
                console.warn(`Invalid notification ID skipped: ${id}`);
            }
        });
        await batch.commit();
        return { success: true, message: "Notifications marked as read." };
    }
    catch (error) {
        console.error("Error in markNotificationsAsRead:", error);
        // Lanza HttpsError
        throw new https_1.HttpsError("internal", error.message || "Failed to mark notifications as read.");
    }
});
// *** Añadida región ***
exports.deleteNotifications = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const { notificationIds } = data;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "An array of notification IDs is required.");
    }
    if (notificationIds.length > 500) {
        throw new https_1.HttpsError("invalid-argument", "Cannot delete more than 500 notifications at once.");
    }
    try {
        const batch = db.batch();
        const notificationsRef = db.collection(`inbox/${uid}/notifications`);
        notificationIds.forEach(id => {
            if (typeof id === 'string' && id.length > 0) {
                const docRef = notificationsRef.doc(id);
                batch.delete(docRef);
            }
            else {
                console.warn(`Invalid notification ID skipped: ${id}`);
            }
        });
        await batch.commit();
        return { success: true, message: "Selected notifications cleared." };
    }
    catch (error) {
        console.error("Error in deleteNotifications:", error);
        // Lanza HttpsError
        throw new https_1.HttpsError("internal", error.message || "Failed to clear notifications.");
    }
});
// *** Añadida región ***
exports.clearAllNotifications = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const notificationsRef = db.collection(`inbox/${uid}/notifications`);
    try {
        await deleteCollection(db, `inbox/${uid}/notifications`); // Asume que tienes deleteCollection
        const batchSize = 400;
        let hasMore = true;
        while (hasMore) {
            const snapshot = await notificationsRef.limit(batchSize).get();
            if (snapshot.empty) {
                hasMore = false;
                continue;
            }
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        return { success: true, message: "All notifications cleared." };
    }
    catch (error) {
        console.error("Error in clearAllNotifications:", error);
        // Lanza HttpsError
        throw new https_1.HttpsError("internal", error.message || "Failed to clear all notifications.");
    }
});
// *** Añadida región ***
exports.blockUser = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    const uid = auth.uid;
    const { blockedUid } = data;
    if (!blockedUid) {
        throw new https_1.HttpsError("invalid-argument", "User ID to block (blockedUid) required.");
    }
    if (uid === blockedUid) {
        throw new https_1.HttpsError("invalid-argument", "You cannot block yourself.");
    }
    const currentUserRef = db.doc(`users/${uid}`);
    const otherUserRef = db.doc(`users/${blockedUid}`);
    try {
        await db.runTransaction(async (transaction) => {
            // Leer ambos usuarios para asegurarse que existen (opcional pero más robusto)
            const [currentUserSnap, otherUserSnap] = await Promise.all([
                transaction.get(currentUserRef),
                transaction.get(otherUserRef)
            ]);
            if (!currentUserSnap.exists)
                throw new https_1.HttpsError("not-found", "Your user profile was not found.");
            if (!otherUserSnap.exists)
                throw new https_1.HttpsError("not-found", "The user you are trying to block does not exist.");
            // Bloquear y quitar amistad en una transacción
            transaction.update(currentUserRef, {
                blocked: admin.firestore.FieldValue.arrayUnion(blockedUid), // Añadir a bloqueados
                friends: admin.firestore.FieldValue.arrayRemove(blockedUid) // Quitar de amigos (si estaba)
            });
            transaction.update(otherUserRef, {
                friends: admin.firestore.FieldValue.arrayRemove(uid) // Quitar al bloqueador de la lista de amigos del otro
            });
        });
        // Considerar borrar chat y peticiones pendientes fuera de la transacción si es necesario
        return { success: true, message: "User blocked successfully." };
    }
    catch (error) {
        console.error(`Error blocking user ${blockedUid} by ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to block user.");
    }
});
// *** Añadida región ***
exports.unblockUser = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    const uid = auth.uid;
    const { blockedUid } = data;
    if (!blockedUid) {
        throw new https_1.HttpsError("invalid-argument", "User ID to unblock (blockedUid) required.");
    }
    const currentUserRef = db.doc(`users/${uid}`);
    try {
        // Opcional: leer currentUserRef primero para asegurar que existe
        await currentUserRef.update({
            blocked: admin.firestore.FieldValue.arrayRemove(blockedUid) // Quitar de bloqueados
        });
        return { success: true, message: "User unblocked successfully." };
    }
    catch (error) {
        console.error(`Error unblocking user ${blockedUid} by ${uid}:`, error);
        // Podría fallar si el documento no existe o por permisos
        if (error.code === 5) { // NOT_FOUND
            // Considera si esto es un error o si simplemente no estaba bloqueado
            return { success: true, message: "User was not found or not blocked." };
            // throw new HttpsError("not-found", "Your user profile was not found.");
        }
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to unblock user.");
    }
});
// Helper para borrar colecciones (si no lo tienes en un archivo común)
async function deleteCollection(db, collectionPath, batchSize = 400 // Ajustado a límite común
) {
    const collectionRef = db.collection(collectionPath);
    let query = collectionRef.orderBy('__name__').limit(batchSize);
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            break;
        }
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        // Prepara la siguiente consulta
        query = collectionRef.orderBy('__name__').startAfter(snapshot.docs[snapshot.docs.length - 1]).limit(batchSize);
    }
    console.log(`Finished deleting collection: ${collectionPath}`);
}
//# sourceMappingURL=notifications.js.map