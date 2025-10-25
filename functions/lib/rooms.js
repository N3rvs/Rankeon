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
exports.sendMessageToRoom = exports.leaveRoom = exports.joinRoom = exports.createGameRoom = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// *** Añadida región ***
exports.createGameRoom = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
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
            participants: [uid], // Creator automatically joins
            // Añadir lastMessageAt inicial si lo usas para ordenar
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "Room created successfully.", roomId: roomRef.id };
    }
    catch (error) { // Catch específico
        console.error("Error creating game room in Firestore:", error);
        // Lanzar HttpsError
        throw new https_1.HttpsError("internal", error.message || "Failed to create the game room.");
    }
});
// *** Añadida región ***
exports.joinRoom = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { roomId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "Missing room ID.");
    const roomRef = db.collection("gameRooms").doc(roomId);
    try {
        // Usa una transacción para leer antes de escribir
        return await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new https_1.HttpsError("not-found", "The room does not exist.");
            }
            const roomData = roomDoc.data();
            const participants = roomData.participants || [];
            const maxSize = parseInt(roomData.partySize, 10) || 10;
            if (participants.includes(uid)) {
                return { success: true, message: "Already in room." };
            }
            if (participants.length >= maxSize) {
                throw new https_1.HttpsError("failed-precondition", "This room is full.");
            }
            transaction.update(roomRef, {
                participants: admin.firestore.FieldValue.arrayUnion(uid)
            });
            return { success: true, message: "Joined room." };
        });
    }
    catch (error) { // Catch específico
        console.error(`Error joining room ${roomId} for user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error; // Re-lanza si ya es HttpsError
        throw new https_1.HttpsError("internal", error.message || "An unexpected error occurred while joining the room.");
    }
});
// *** Añadida región ***
exports.leaveRoom = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { roomId } = data;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId)
        throw new https_1.HttpsError("invalid-argument", "Missing room ID.");
    const roomRef = db.collection("gameRooms").doc(roomId);
    try {
        return await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                return { success: true, message: "Room no longer exists." }; // No es un error si ya no existe
            }
            const roomData = roomDoc.data();
            if (!roomData) {
                // Si existe pero no hay datos, es raro, pero no debería bloquear
                console.warn(`Room ${roomId} exists but has no data.`);
                transaction.delete(roomRef); // Borrar sala corrupta
                return { success: true, message: "Left invalid room." };
                // throw new HttpsError("internal", "Room data is invalid."); // Original lanzaba error
            }
            const currentParticipants = roomData.participants || [];
            if (!currentParticipants.includes(uid)) {
                return { success: true, message: "You are not in the room." };
            }
            const remainingParticipants = currentParticipants.filter(p => p !== uid);
            if (roomData.createdBy === uid) {
                if (remainingParticipants.length === 0) {
                    transaction.delete(roomRef); // Borra la sala y subcolecciones (si las hubiera)
                }
                else {
                    const newCreatorId = remainingParticipants[0];
                    transaction.update(roomRef, {
                        createdBy: newCreatorId,
                        participants: remainingParticipants // Actualiza la lista
                    });
                }
            }
            else {
                // Actualiza la lista usando arrayRemove
                transaction.update(roomRef, {
                    participants: admin.firestore.FieldValue.arrayRemove(uid)
                });
            }
            return { success: true, message: "Successfully left the room." };
        });
    }
    catch (error) { // Catch específico y lanzar HttpsError
        console.error(`Error leaving room ${roomId} for user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "An unexpected error occurred while leaving the room.");
    }
});
// *** Añadida región ***
exports.sendMessageToRoom = (0, https_1.onCall)({ region: 'europe-west1' }, async ({ auth, data }) => {
    const uid = auth === null || auth === void 0 ? void 0 : auth.uid;
    const { roomId, content } = data;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to send a message.');
    }
    if (!roomId || !content) {
        throw new https_1.HttpsError('invalid-argument', 'Missing room ID or message content.');
    }
    // Añadir límite de longitud al mensaje
    if (content.length > 500) {
        throw new https_1.HttpsError('invalid-argument', 'Message content is too long (max 500 chars).');
    }
    const roomRef = db.collection('gameRooms').doc(roomId);
    try {
        // Usar transacción para asegurar que la sala existe y el usuario es participante
        await db.runTransaction(async (transaction) => {
            const roomSnap = await transaction.get(roomRef);
            if (!roomSnap.exists) {
                throw new https_1.HttpsError('not-found', 'The room does not exist.');
            }
            const roomData = roomSnap.data();
            if (!(roomData === null || roomData === void 0 ? void 0 : roomData.participants.includes(uid))) {
                throw new https_1.HttpsError('permission-denied', 'You are not a participant of this room.');
            }
            // Crear mensaje dentro de la transacción
            const messageRef = roomRef.collection('messages').doc(); // Nuevo ID para el mensaje
            transaction.set(messageRef, {
                sender: uid,
                content: content, // Considerar sanitizar el contenido
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Actualizar lastMessageAt fuera de la transacción si falla no es crítico
            // O dentro si quieres asegurar consistencia
            transaction.update(roomRef, {
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        // La actualización de lastMessageAt podría hacerse fuera si la consistencia no es 100% crítica
        await roomRef.update({
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) { // Catch específico
        console.error(`Error sending message to room ${roomId} by user ${uid}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Failed to send message.');
    }
});
//# sourceMappingURL=rooms.js.map