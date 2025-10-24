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
<<<<<<< HEAD
exports.sendMessageToRoom = exports.leaveRoom = exports.joinRoom = exports.createGameRoom = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Esta función estaba bien
exports.createGameRoom = (0, https_1.onCall)(async ({ auth, data }) => {
=======
exports.sendMessageToRoom = exports.leaveRoom = exports.joinRoom = exports.createGameRoomWithDiscord = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.createGameRoomWithDiscord = (0, https_1.onCall)(async ({ auth, data }) => {
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to create a room.");
    }
    const { name, game, server, rank, partySize } = data;
    if (!name || !game || !server || !rank || !partySize) {
        throw new https_1.HttpsError("invalid-argument", "Missing required room details.");
    }
    const roomRef = db.collection("gameRooms").doc();
    try {
        await roomRef.set({
            id: roomRef.id,
            name,
            game,
            server,
            rank,
            partySize,
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
<<<<<<< HEAD
            participants: [uid], // Creator automatically joins
        });
        return { success: true, message: "Room created successfully.", roomId: roomRef.id };
=======
            discordChannelId: null, // Discord integration is not implemented
            participants: [uid], // Creator automatically joins
        });
        return { success: true, message: "Room created successfully.", roomId: roomRef.id, discordChannelId: null };
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
    }
    catch (error) {
        console.error("Error creating game room in Firestore:", error);
        throw new https_1.HttpsError("internal", "Failed to create the game room.");
    }
});
<<<<<<< HEAD
// *** INICIO DE LA CORRECCIÓN ***
// Esta función ahora usa una transacción para comprobar partySize
=======
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
exports.joinRoom = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { roomId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "Missing room ID.");
    const roomRef = db.collection("gameRooms").doc(roomId);
<<<<<<< HEAD
    // Usa una transacción para leer antes de escribir
    return db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists) {
            throw new https_1.HttpsError("not-found", "The room does not exist.");
        }
        const roomData = roomDoc.data();
        const participants = roomData.participants || [];
        // Convierte partySize (que es un string) a número
        const maxSize = parseInt(roomData.partySize, 10) || 10; // 10 como fallback
        if (participants.includes(uid)) {
            // El usuario ya está en la sala, no hagas nada
            return { success: true, message: "Already in room." };
        }
        if (participants.length >= maxSize) {
            // La sala está llena
            throw new https_1.HttpsError("failed-precondition", "This room is full.");
        }
        // Hay espacio, une al usuario
        transaction.update(roomRef, {
            participants: admin.firestore.FieldValue.arrayUnion(uid)
        });
        return { success: true, message: "Joined room." };
    });
});
// *** FIN DE LA CORRECCIÓN ***
// Esta función estaba bien (es una lógica excelente)
=======
    await roomRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(uid)
    });
    return { success: true };
});
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
exports.leaveRoom = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { roomId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "Missing room ID.");
    const roomRef = db.collection("gameRooms").doc(roomId);
    return db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists) {
            return { success: true, message: "Room no longer exists." };
        }
        const roomData = roomDoc.data();
        if (!roomData) {
            throw new https_1.HttpsError("internal", "Room data is invalid.");
        }
        const currentParticipants = roomData.participants || [];
        if (!currentParticipants.includes(uid)) {
            return { success: true, message: "You are not in the room." };
        }
        const remainingParticipants = currentParticipants.filter(p => p !== uid);
        if (roomData.createdBy === uid) {
            // The creator is leaving
            if (remainingParticipants.length === 0) {
                // Creator is the last one, delete the room
                transaction.delete(roomRef);
            }
            else {
                // Transfer ownership to the next participant
                const newCreatorId = remainingParticipants[0];
                transaction.update(roomRef, {
                    createdBy: newCreatorId,
                    participants: remainingParticipants
                });
            }
        }
        else {
            // A non-creator is leaving
            transaction.update(roomRef, {
                participants: admin.firestore.FieldValue.arrayRemove(uid)
            });
        }
        return { success: true, message: "Successfully left the room." };
    }).catch(error => {
        console.error("Error leaving room:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "An unexpected error occurred while leaving the room.");
    });
});
<<<<<<< HEAD
// Esta función también estaba bien
=======
>>>>>>> d5efcc92842827615608361b0ce60cb5a0a3613d
exports.sendMessageToRoom = (0, https_1.onCall)(async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { roomId, content } = data;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to send a message.');
    }
    if (!roomId || !content) {
        throw new https_1.HttpsError('invalid-argument', 'Missing room ID or message content.');
    }
    const roomRef = db.collection('gameRooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
        throw new https_1.HttpsError('not-found', 'The room does not exist.');
    }
    const roomData = roomSnap.data();
    if (!(roomData === null || roomData === void 0 ? void 0 : roomData.participants.includes(uid))) {
        throw new https_1.HttpsError('permission-denied', 'You are not a participant of this room.');
    }
    const messageRef = roomRef.collection('messages').doc();
    await messageRef.set({
        sender: uid,
        content: content,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await roomRef.update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=rooms.js.map