import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateRoomData {
  name: string;
  game: string;
  server: string;
  rank: string;
  partySize: string;
}

// Esta función estaba bien
export const createGameRoom = onCall(async ({ auth, data }: { auth?: any, data: CreateRoomData }) => {
  const uid = auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to create a room.");
  }

  const { name, game, server, rank, partySize } = data;
  if (!name || !game || !server || !rank || !partySize) {
    throw new HttpsError("invalid-argument", "Missing required room details.");
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
    });

    return { success: true, message: "Room created successfully.", roomId: roomRef.id };
  } catch (error) {
    console.error("Error creating game room in Firestore:", error);
    throw new HttpsError("internal", "Failed to create the game room.");
  }
});

interface RoomActionData {
    roomId: string;
}

// *** INICIO DE LA CORRECCIÓN ***
// Esta función ahora usa una transacción para comprobar partySize
export const joinRoom = onCall(async ({ auth, data }: { auth?: any, data: RoomActionData }) => {
    const uid = auth?.uid;
    const { roomId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId) throw new HttpsError("invalid-argument", "Missing room ID.");

    const roomRef = db.collection("gameRooms").doc(roomId);

    // Usa una transacción para leer antes de escribir
    return db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);

        if (!roomDoc.exists) {
            throw new HttpsError("not-found", "The room does not exist.");
        }

        const roomData = roomDoc.data()!;
        const participants: string[] = roomData.participants || [];
        
        // Convierte partySize (que es un string) a número
        const maxSize = parseInt(roomData.partySize, 10) || 10; // 10 como fallback

        if (participants.includes(uid)) {
            // El usuario ya está en la sala, no hagas nada
            return { success: true, message: "Already in room." };
        }

        if (participants.length >= maxSize) {
            // La sala está llena
            throw new HttpsError("failed-precondition", "This room is full.");
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
export const leaveRoom = onCall(async ({ auth, data }: { auth?: any, data: RoomActionData }) => {
    const uid = auth?.uid;
    const { roomId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId) throw new HttpsError("invalid-argument", "Missing room ID.");

    const roomRef = db.collection("gameRooms").doc(roomId);

    return db.runTransaction(async (transaction) => {
        const roomDoc = await transaction.get(roomRef);

        if (!roomDoc.exists) {
            return { success: true, message: "Room no longer exists." };
        }

        const roomData = roomDoc.data();
        if (!roomData) {
            throw new HttpsError("internal", "Room data is invalid.");
        }
        
        const currentParticipants: string[] = roomData.participants || [];
        if (!currentParticipants.includes(uid)) {
            return { success: true, message: "You are not in the room." };
        }
        
        const remainingParticipants = currentParticipants.filter(p => p !== uid);

        if (roomData.createdBy === uid) {
            // The creator is leaving
            if (remainingParticipants.length === 0) {
                // Creator is the last one, delete the room
                transaction.delete(roomRef);
            } else {
                // Transfer ownership to the next participant
                const newCreatorId = remainingParticipants[0];
                transaction.update(roomRef, {
                    createdBy: newCreatorId,
                    participants: remainingParticipants
                });
            }
        } else {
            // A non-creator is leaving
            transaction.update(roomRef, {
                participants: admin.firestore.FieldValue.arrayRemove(uid)
            });
        }
        
        return { success: true, message: "Successfully left the room." };
    }).catch(error => {
        console.error("Error leaving room:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An unexpected error occurred while leaving the room.");
    });
});

interface SendMessageData {
  roomId: string;
  content: string;
}

// Esta función también estaba bien
export const sendMessageToRoom = onCall(async ({ auth, data }: { auth?: any; data: SendMessageData }) => {
  const uid = auth?.uid;
  const { roomId, content } = data;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to send a message.');
  }
  if (!roomId || !content) {
    throw new HttpsError('invalid-argument', 'Missing room ID or message content.');
  }

  const roomRef = db.collection('gameRooms').doc(roomId);
  const roomSnap = await roomRef.get();

  if (!roomSnap.exists) {
    throw new HttpsError('not-found', 'The room does not exist.');
  }

  const roomData = roomSnap.data();
  if (!roomData?.participants.includes(uid)) {
    throw new HttpsError('permission-denied', 'You are not a participant of this room.');
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