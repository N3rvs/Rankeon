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
exports.removeFriend = exports.respondToFriendRequest = exports.sendFriendRequest = exports.getFriendProfiles = exports.getFriendshipStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.getFriendshipStatus = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a;
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { targetUserId } = data;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in.');
    }
    if (!targetUserId) {
        throw new https_1.HttpsError('invalid-argument', 'Target user ID is required.');
    }
    if (uid === targetUserId) {
        return { status: 'self' };
    }
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        if ((_a = userData === null || userData === void 0 ? void 0 : userData.friends) === null || _a === void 0 ? void 0 : _a.includes(targetUserId)) {
            return { status: 'friends' };
        }
        // *** INICIO DE LA CORRECCIÓN (Eficiencia) ***
        // Comprueba ambas direcciones CON UNA SOLA CONSULTA
        const existingReqSnap = await db.collection("friendRequests")
            .where("from", "in", [uid, targetUserId])
            .where("to", "in", [uid, targetUserId])
            .where("status", "==", "pending")
            .limit(1)
            .get();
        if (!existingReqSnap.empty) {
            const request = existingReqSnap.docs[0].data();
            const requestId = existingReqSnap.docs[0].id;
            if (request.from === uid) {
                return { status: 'request_sent', requestId: requestId };
            }
            else {
                return { status: 'request_received', requestId: requestId };
            }
        }
        // *** FIN DE LA CORRECCIÓN ***
        return { status: 'not_friends' };
    }
    catch (error) {
        console.error('Error getting friendship status:', error);
        throw new https_1.HttpsError('internal', 'An unexpected error occurred while checking friendship status.');
    }
});
exports.getFriendProfiles = (0, https_1.onCall)(async ({ auth: callerAuth }) => {
    if (!callerAuth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication is required.');
    }
    const uid = callerAuth.uid;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Current user not found.');
        }
        const userData = userDoc.data();
        const friendIds = userData.friends || [];
        if (friendIds.length === 0) {
            return [];
        }
        // *** INICIO DE LA CORRECCIÓN (Bug de +30 amigos) ***
        // Trocea friendIds en chunks de 30 (límite de 'where-in')
        const chunks = [];
        for (let i = 0; i < friendIds.length; i += 30) {
            chunks.push(friendIds.slice(i, i + 30));
        }
        // Ejecuta una consulta por cada chunk en paralelo
        const queries = chunks.map(chunk => db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get());
        const querySnapshots = await Promise.all(queries);
        // Combina los resultados de todas las consultas
        let friendProfiles = [];
        querySnapshots.forEach(snap => {
            const profiles = snap.docs.map(doc => {
                var _a, _b, _c;
                // *** FIN DE LA CORRECCIÓN ***
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { 
                    // Serialize Timestamps
                    createdAt: ((_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString()) || null, banUntil: ((_b = data.banUntil) === null || _b === void 0 ? void 0 : _b.toDate().toISOString()) || null, _claimsRefreshedAt: ((_c = data._claimsRefreshedAt) === null || _c === void 0 ? void 0 : _c.toDate().toISOString()) || null });
            });
            friendProfiles = friendProfiles.concat(profiles);
        });
        return friendProfiles;
    }
    catch (error) {
        console.error('Error fetching friend profiles:', error);
        throw new https_1.HttpsError('internal', 'An unexpected error occurred while fetching friends.');
    }
});
// Esta función estaba bien
exports.sendFriendRequest = (0, https_1.onCall)(async ({ auth, data }) => {
    var _a;
    const from = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { to } = data;
    if (!from)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!to || from === to)
        throw new https_1.HttpsError("invalid-argument", "Invalid user ID.");
    const fromDoc = await db.collection("users").doc(from).get();
    const fromData = fromDoc.data();
    if ((_a = fromData === null || fromData === void 0 ? void 0 : fromData.friends) === null || _a === void 0 ? void 0 : _a.includes(to)) {
        throw new https_1.HttpsError("already-exists", "User is already your friend.");
    }
    const existingReqSnap = await db.collection("friendRequests")
        .where("from", "in", [from, to])
        .where("to", "in", [from, to])
        .where("status", "==", "pending")
        .get();
    if (!existingReqSnap.empty) {
        throw new https_1.HttpsError("already-exists", "A pending friend request already exists.");
    }
    const batch = db.batch();
    const requestRef = db.collection("friendRequests").doc();
    batch.set(requestRef, {
        from,
        to,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const notificationRef = db.collection(`inbox/${to}/notifications`).doc();
    batch.set(notificationRef, {
        type: "friend_request",
        from,
        read: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        extraData: { requestId: requestRef.id } // Pass the request ID
    });
    await batch.commit();
    return { success: true };
});
// Esta función estaba bien
exports.respondToFriendRequest = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { requestId, accept } = data;
    if (!uid || typeof accept !== "boolean" || !requestId) {
        throw new https_1.HttpsError("invalid-argument", "Invalid data.");
    }
    const requestRef = db.collection("friendRequests").doc(requestId);
    return db.runTransaction(async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists) {
            throw new https_1.HttpsError("not-found", "Friend request not found. It may have been withdrawn.");
        }
        const req = requestSnap.data();
        if (!req || req.to !== uid) {
            throw new https_1.HttpsError("permission-denied", "This is not your friend request to respond to.");
        }
        if (req.status !== 'pending') {
            throw new https_1.HttpsError("failed-precondition", "This friend request has already been resolved.");
        }
        transaction.update(requestRef, { status: accept ? "accepted" : "rejected" });
        if (accept) {
            const fromId = req.from;
            const userRef = db.doc(`users/${uid}`);
            const fromRef = db.doc(`users/${fromId}`);
            // This is safe. arrayUnion creates the array if it doesn't exist.
            transaction.update(userRef, { friends: admin.firestore.FieldValue.arrayUnion(fromId) });
            transaction.update(fromRef, { friends: admin.firestore.FieldValue.arrayUnion(uid) });
            // Notify the original sender that their request was accepted
            const notificationRef = db.collection(`inbox/${fromId}/notifications`).doc();
            transaction.set(notificationRef, {
                type: "friend_accepted",
                from: uid,
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Create a chat document so they can start messaging immediately
            const members = [uid, fromId].sort();
            const chatId = members.join('_');
            const chatRef = db.collection("chats").doc(chatId);
            transaction.set(chatRef, {
                members: members,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true }); // Use merge to not overwrite if it somehow exists
        }
        return { success: true, accepted: accept };
    });
});
// Esta función estaba bien
exports.removeFriend = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { friendUid } = data;
    if (!uid || !friendUid) {
        throw new https_1.HttpsError("invalid-argument", "Missing friend UID.");
    }
    const batch = db.batch();
    const currentUserRef = db.doc(`users/${uid}`);
    const friendUserRef = db.doc(`users/${friendUid}`);
    // Remove friend from both users' friend lists
    batch.update(currentUserRef, { friends: admin.firestore.FieldValue.arrayRemove(friendUid) });
    batch.update(friendUserRef, { friends: admin.firestore.FieldValue.arrayRemove(uid) });
    // Optional: Clean up the friend request document(s) between them.
    const requestsSnap = await db.collection("friendRequests")
        .where("from", "in", [uid, friendUid])
        .where("to", "in", [uid, friendUid])
        .get();
    requestsSnap.forEach(doc => batch.delete(doc.ref));
    // Commit the primary changes first.
    await batch.commit();
    // --- NEW LOGIC: Delete the chat document and its messages ---
    // This is done after the main batch to ensure friend removal succeeds first,
    // even if the chat cleanup fails for some reason.
    try {
        const members = [uid, friendUid].sort();
        const chatId = members.join('_');
        const chatRef = db.collection("chats").doc(chatId);
        const messagesRef = chatRef.collection("messages");
        // Batched delete of subcollection
        const batchSize = 400;
        let snapshot;
        do {
            snapshot = await messagesRef.limit(batchSize).get();
            if (snapshot.empty)
                break;
            const deleteBatch = db.batch();
            snapshot.docs.forEach((doc) => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
        } while (!snapshot.empty);
        // Delete the main chat document after its subcollection is empty
        await chatRef.delete();
        // NEW: Also delete any notifications associated with this chat
        const deleteNotifsBatch = db.batch();
        for (const memberId of members) {
            const notifSnap = await db.collection(`/inbox/${memberId}/notifications`).where('chatId', '==', chatId).get(); // CORRECCIÓN: 'inbox', no 'inabcde'
            notifSnap.forEach(doc => deleteNotifsBatch.delete(doc.ref));
        }
        await deleteNotifsBatch.commit();
    }
    catch (error) {
        console.error(`Failed to delete chat history for friend removal between ${uid} and ${friendUid}. The friendship was removed successfully.`, error);
    }
    return { success: true };
});
//# sourceMappingURL=friends.js.map