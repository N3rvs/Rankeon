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
exports.addInboxNotification = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const { to, type, extraData } = data;
    if (!to || !type) {
        throw new https_1.HttpsError("invalid-argument", "Missing recipient or notification type.");
    }
    await db.collection(`inbox/${to}/notifications`).add({
        from: uid,
        type,
        extraData: extraData || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
    });
    return { success: true };
});
exports.markNotificationsAsRead = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const { notificationIds } = data;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "An array of notification IDs is required.");
    }
    try {
        const batch = db.batch();
        const notificationsRef = db.collection(`inbox/${uid}/notifications`);
        notificationIds.forEach(id => {
            const docRef = notificationsRef.doc(id);
            batch.update(docRef, { read: true });
        });
        await batch.commit();
        return { success: true, message: "Notifications marked as read." };
    }
    catch (error) {
        console.error("Error in markNotificationsAsRead:", error);
        throw new https_1.HttpsError("internal", "Failed to mark notifications as read.");
    }
});
// Deletes only SPECIFIC notifications by their IDs.
exports.deleteNotifications = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const { notificationIds } = data;
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "An array of notification IDs is required.");
    }
    try {
        const batch = db.batch();
        const notificationsRef = db.collection(`inbox/${uid}/notifications`);
        notificationIds.forEach(id => {
            const docRef = notificationsRef.doc(id);
            batch.delete(docRef);
        });
        await batch.commit();
        return { success: true, message: "Notifications cleared." };
    }
    catch (error) {
        console.error("Error in deleteNotifications:", error);
        throw new https_1.HttpsError("internal", "Failed to clear notifications.");
    }
});
// Clears the ENTIRE notification history for a user.
exports.clearAllNotifications = (0, https_1.onCall)(async ({ auth }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    const uid = auth.uid;
    const notificationsRef = db.collection(`inbox/${uid}/notifications`);
    try {
        const batchSize = 400;
        let hasMore = true;
        while (hasMore) {
            const snapshot = await notificationsRef.limit(batchSize).get();
            if (snapshot.empty) {
                hasMore = false;
                continue;
            }
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        return { success: true, message: "All notifications cleared." };
    }
    catch (error) {
        console.error("Error in clearAllNotifications:", error);
        throw new https_1.HttpsError("internal", "Failed to clear notifications.");
    }
});
exports.blockUser = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    const uid = auth.uid;
    const { blockedUid } = data;
    if (!blockedUid) {
        throw new https_1.HttpsError("invalid-argument", "User ID required.");
    }
    if (uid === blockedUid) {
        throw new https_1.HttpsError("invalid-argument", "You cannot block yourself.");
    }
    const currentUserRef = db.doc(`users/${uid}`);
    const otherUserRef = db.doc(`users/${blockedUid}`);
    await db.runTransaction(async (transaction) => {
        transaction.update(currentUserRef, {
            blocked: admin.firestore.FieldValue.arrayUnion(blockedUid)
        });
        transaction.update(currentUserRef, {
            friends: admin.firestore.FieldValue.arrayRemove(blockedUid)
        });
        transaction.update(otherUserRef, {
            friends: admin.firestore.FieldValue.arrayRemove(uid)
        });
    });
    return { success: true, message: "User blocked successfully." };
});
exports.unblockUser = (0, https_1.onCall)(async ({ auth, data }) => {
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    const uid = auth.uid;
    const { blockedUid } = data;
    if (!blockedUid) {
        throw new https_1.HttpsError("invalid-argument", "User ID required.");
    }
    const currentUserRef = db.doc(`users/${uid}`);
    await currentUserRef.update({
        blocked: admin.firestore.FieldValue.arrayRemove(blockedUid)
    });
    return { success: true, message: "User unblocked successfully." };
});
//# sourceMappingURL=notifications.js.map