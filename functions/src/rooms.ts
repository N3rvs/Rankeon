
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

export const createGameRoomWithDiscord = onCall(async ({ auth, data }: { auth?: any, data: CreateRoomData }) => {
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
      discordChannelId: null, // Discord integration is not implemented
      participants: [uid], // Creator automatically joins
    });

    return { success: true, message: "Room created successfully.", roomId: roomRef.id, discordChannelId: null };
  } catch (error) {
    console.error("Error creating game room in Firestore:", error);
    throw new HttpsError("internal", "Failed to create the game room.");
  }
});

interface RoomActionData {
    roomId: string;
}

export const joinRoom = onCall(async ({ auth, data }: { auth?: any, data: RoomActionData }) => {
    const uid = auth?.uid;
    const { roomId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId) throw new HttpsError("invalid-argument", "Missing room ID.");

    const roomRef = db.collection("gameRooms").doc(roomId);

    await roomRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(uid)
    });

    return { success: true };
});

export const leaveRoom = onCall(async ({ auth, data }: { auth?: any, data: RoomActionData }) => {
    const uid = auth?.uid;
    const { roomId } = data;

    if (!uid) throw new HttpsError("unauthenticated", "You must be logged in.");
    if (!roomId) throw new HttpsError("invalid-argument", "Missing room ID.");

    const roomRef = db.collection("gameRooms").doc(roomId);

    await roomRef.update({
        participants: admin.firestore.FieldValue.arrayRemove(uid)
    });

    return { success: true };
});
